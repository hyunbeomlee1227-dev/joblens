import {
  GetCommand,
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
  ) {}

  async read(candidateSubject: string, day: string) {
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
      )
        return;
      throw new Error("allowance_refund_unavailable");
    }
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
