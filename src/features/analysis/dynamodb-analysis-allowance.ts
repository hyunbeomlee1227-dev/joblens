import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

import type {
  AnalysisAllowanceLedger,
  AnalysisAttempt,
} from "./analysis-allowance";

export class DynamoDbAnalysisAllowance implements AnalysisAllowanceLedger {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async read(candidateSubject: string, day: string) {
    await this.recoverRefunds(candidateSubject, day);
    await this.recoverReservations(candidateSubject, day);
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: dayKey(candidateSubject, day),
        ConsistentRead: true,
      }),
    );
    return typeof response.Item?.used === "number" ? response.Item.used : 0;
  }

  async consume(
    attempt: AnalysisAttempt,
  ): Promise<"consumed" | "limit" | "duplicate"> {
    await this.recoverRefunds(attempt.candidateSubject, attempt.day);
    await this.recoverReservations(attempt.candidateSubject, attempt.day);
    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.tableName,
                Item: {
                  ...attemptKey(attempt),
                  expiresAtEpoch: attempt.expiresAtEpoch,
                  reservationExpiresAtEpoch: attempt.reservationExpiresAtEpoch,
                  state: "reserved",
                  candidateSubject: attempt.candidateSubject,
                  day: attempt.day,
                  jobId: attempt.jobId,
                  limit: attempt.limit,
                },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
            {
              Update: {
                TableName: this.tableName,
                Key: dayKey(attempt.candidateSubject, attempt.day),
                UpdateExpression:
                  "SET used = if_not_exists(used, :zero) + :one, expiresAtEpoch = :expiry",
                ConditionExpression:
                  "attribute_not_exists(used) OR used < :limit",
                ExpressionAttributeValues: {
                  ":zero": 0,
                  ":one": 1,
                  ":limit": attempt.limit,
                  ":expiry": attempt.expiresAtEpoch,
                },
              },
            },
            {
              ConditionCheck: {
                TableName: this.tableName,
                Key: {
                  pk: "CANDIDATE_DELETION",
                  sk: `CANDIDATE#${attempt.candidateSubject}`,
                },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
          ],
        }),
      );
      return "consumed";
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "CancellationReasons" in error &&
        Array.isArray(error.CancellationReasons)
      ) {
        if (error.CancellationReasons[0]?.Code === "ConditionalCheckFailed")
          return "duplicate";
        if (error.CancellationReasons[1]?.Code === "ConditionalCheckFailed")
          return "limit";
      }
      throw new Error("allowance_unavailable");
    }
  }

  async refund(attempt: AnalysisAttempt): Promise<void> {
    // Persist intent first. Reversal can then be replayed after a process restart.
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...refundKey(attempt), ...attempt },
      }),
    );
    await this.completeRefund(attempt);
  }

  async markDispatched(attempt: AnalysisAttempt): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: attemptKey(attempt),
        UpdateExpression: "SET #state = :dispatched",
        ConditionExpression:
          "#state = :reserved AND reservationExpiresAtEpoch > :now",
        ExpressionAttributeNames: { "#state": "state" },
        ExpressionAttributeValues: {
          ":dispatched": "dispatched",
          ":reserved": "reserved",
          ":now": Math.floor(this.now().getTime() / 1000),
        },
      }),
    );
  }

  private async recoverReservations(subject: string, day: string) {
    let cursor: Record<string, unknown> | undefined;
    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "pk = :owner AND begins_with(sk, :refund)",
          ExpressionAttributeValues: {
            ":owner": `CANDIDATE#${subject}`,
            ":refund": `ANALYSIS_ATTEMPT#${day}#`,
          },
          ConsistentRead: true,
          ExclusiveStartKey: cursor,
        }),
      );
      const epoch = Math.floor(this.now().getTime() / 1000);
      for (const item of response.Items ?? []) {
        if (
          item.state !== "reserved" ||
          typeof item.reservationExpiresAtEpoch !== "number" ||
          item.reservationExpiresAtEpoch > epoch
        )
          continue;
        try {
          await this.client.send(
            new TransactWriteCommand({
              TransactItems: [
                {
                  Delete: {
                    TableName: this.tableName,
                    Key: { pk: item.pk, sk: item.sk },
                    ConditionExpression:
                      "#state = :reserved AND reservationExpiresAtEpoch <= :now",
                    ExpressionAttributeNames: { "#state": "state" },
                    ExpressionAttributeValues: {
                      ":reserved": "reserved",
                      ":now": epoch,
                    },
                  },
                },
                {
                  Update: {
                    TableName: this.tableName,
                    Key: dayKey(subject, day),
                    UpdateExpression: "SET used = used - :one",
                    ConditionExpression: "used >= :one",
                    ExpressionAttributeValues: { ":one": 1 },
                  },
                },
              ],
            }),
          );
        } catch (error) {
          // Another recovery or dispatch may have won the conditional transaction.
          if (
            typeof error !== "object" ||
            error === null ||
            !("CancellationReasons" in error) ||
            !Array.isArray(error.CancellationReasons) ||
            error.CancellationReasons[0]?.Code !== "ConditionalCheckFailed"
          )
            throw new Error("allowance_recovery_unavailable");
        }
      }
      cursor = response.LastEvaluatedKey;
    } while (cursor !== undefined);
  }

  private async completeRefund(attempt: AnalysisAttempt): Promise<void> {
    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: this.tableName,
                Key: attemptKey(attempt),
                ConditionExpression: "attribute_exists(pk)",
              },
            },
            {
              Update: {
                TableName: this.tableName,
                Key: dayKey(attempt.candidateSubject, attempt.day),
                UpdateExpression: "SET used = used - :one",
                ConditionExpression: "used >= :one",
                ExpressionAttributeValues: { ":one": 1 },
              },
            },
            { Delete: { TableName: this.tableName, Key: refundKey(attempt) } },
          ],
        }),
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "CancellationReasons" in error &&
        Array.isArray(error.CancellationReasons) &&
        error.CancellationReasons[0]?.Code === "ConditionalCheckFailed"
      ) {
        await this.client.send(
          new DeleteCommand({
            TableName: this.tableName,
            Key: refundKey(attempt),
          }),
        );
        return;
      }
      throw new Error("allowance_refund_unavailable");
    }
  }

  private async recoverRefunds(subject: string, day: string) {
    let cursor: Record<string, unknown> | undefined;
    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "pk = :owner AND begins_with(sk, :refund)",
          ExpressionAttributeValues: {
            ":owner": `CANDIDATE#${subject}`,
            ":refund": `ANALYSIS_REFUND#${day}#`,
          },
          ConsistentRead: true,
          ExclusiveStartKey: cursor,
        }),
      );
      for (const item of response.Items ?? []) {
        if (
          item.candidateSubject !== subject ||
          item.day !== day ||
          typeof item.jobId !== "string" ||
          typeof item.limit !== "number" ||
          typeof item.expiresAtEpoch !== "number"
        )
          throw new Error("invalid_refund_record");
        await this.completeRefund({
          candidateSubject: subject,
          day,
          jobId: item.jobId,
          limit: item.limit,
          expiresAtEpoch: item.expiresAtEpoch,
          reservationExpiresAtEpoch:
            typeof item.reservationExpiresAtEpoch === "number"
              ? item.reservationExpiresAtEpoch
              : 0,
        });
      }
      cursor = response.LastEvaluatedKey;
    } while (cursor !== undefined);
  }
}

function dayKey(subject: string, day: string) {
  return { pk: `CANDIDATE#${subject}`, sk: `ALLOWANCE#${day}` };
}

function attemptKey(attempt: AnalysisAttempt) {
  return {
    pk: `CANDIDATE#${attempt.candidateSubject}`,
    sk: `ANALYSIS_ATTEMPT#${attempt.day}#${attempt.jobId}`,
  };
}

function refundKey(attempt: AnalysisAttempt) {
  return {
    pk: `CANDIDATE#${attempt.candidateSubject}`,
    sk: `ANALYSIS_REFUND#${attempt.day}#${attempt.jobId}`,
  };
}
