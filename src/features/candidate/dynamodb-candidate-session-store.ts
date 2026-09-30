import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

import type {
  CandidateSessionRecord,
  CandidateSessionStore,
} from "./candidate-session";
import type { JobPreferences } from "@/features/discovery/discover-job-listings";

export class DynamoDbCandidateSessionStore implements CandidateSessionStore {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async readSession(idHash: string): Promise<CandidateSessionRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: sessionKey(idHash),
        ConsistentRead: true,
      }),
    );
    return (response.Item as CandidateSessionRecord | undefined) ?? null;
  }

  async replaceSession(
    previousIdHash: string | null,
    session: CandidateSessionRecord,
  ): Promise<void> {
    const item = {
      ...sessionKey(session.idHash),
      ...session,
      expiresAtEpoch: Math.ceil(Date.parse(session.expiresAt) / 1000),
    };
    const writes: NonNullable<TransactWriteCommandInput["TransactItems"]> = [
      {
        Put: {
          TableName: this.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(pk)",
        },
      },
      {
        Put: {
          TableName: this.tableName,
          Item: sessionOwnershipItem(session.candidateSubject, session.idHash),
        },
      },
      {
        ConditionCheck: {
          TableName: this.tableName,
          Key: deletionKey(session.candidateSubject),
          ConditionExpression: "attribute_not_exists(pk)",
        },
      },
    ];
    if (previousIdHash !== null) {
      writes.push(
        {
          Delete: {
            TableName: this.tableName,
            Key: sessionKey(previousIdHash),
          },
        },
        {
          Delete: {
            TableName: this.tableName,
            Key: sessionOwnershipKey(session.candidateSubject, previousIdHash),
          },
        },
      );
    }
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: writes,
      }),
    );
  }

  async deleteSession(idHash: string, candidateSubject: string): Promise<void> {
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: this.tableName,
              Key: sessionKey(idHash),
            },
          },
          {
            Delete: {
              TableName: this.tableName,
              Key: sessionOwnershipKey(candidateSubject, idHash),
            },
          },
        ],
      }),
    );
  }

  async isCandidateDeletionPending(candidateSubject: string): Promise<boolean> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: deletionKey(candidateSubject),
        ConsistentRead: true,
      }),
    );
    return response.Item !== undefined;
  }

  async beginCandidateDeletion(candidateSubject: string): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: deletionKey(candidateSubject),
      }),
    );
  }

  async cancelCandidateDeletion(candidateSubject: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: deletionKey(candidateSubject),
      }),
    );
  }

  async readPreferences(
    candidateSubject: string,
  ): Promise<JobPreferences | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: candidateKey(candidateSubject),
        ConsistentRead: true,
      }),
    );
    return (response.Item?.preferences as JobPreferences | undefined) ?? null;
  }

  async savePreferences(
    candidateSubject: string,
    preferences: JobPreferences,
  ): Promise<void> {
    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: {
                ...candidateKey(candidateSubject),
                preferences,
              },
            },
          },
          {
            ConditionCheck: {
              TableName: this.tableName,
              Key: deletionKey(candidateSubject),
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
        ],
      }),
    );
  }

  async deleteCandidate(candidateSubject: string): Promise<void> {
    let exclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "pk = :candidateKey",
          ExpressionAttributeValues: {
            ":candidateKey": candidatePartition(candidateSubject),
          },
          ProjectionExpression: "pk, sk",
          ConsistentRead: true,
          ExclusiveStartKey: exclusiveStartKey,
        }),
      );
      const candidateKeys = (response.Items ?? []).map(({ pk, sk }) => ({
        pk,
        sk,
      }));
      const sessionKeys = (response.Items ?? []).flatMap(({ sk }) =>
        typeof sk === "string" && sk.startsWith("SESSION#")
          ? [sessionKey(sk.slice("SESSION#".length))]
          : [],
      );
      const keys = [...candidateKeys, ...sessionKeys];
      for (let index = 0; index < keys.length; index += 25) {
        await deleteAll(
          this.client,
          this.tableName,
          keys.slice(index, index + 25),
        );
      }
      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey !== undefined);
  }
}

async function deleteAll(
  client: DynamoDBDocumentClient,
  tableName: string,
  keys: readonly Record<string, unknown>[],
): Promise<void> {
  let pending = keys.map((key) => ({ DeleteRequest: { Key: key } }));
  while (pending.length > 0) {
    const response = await client.send(
      new BatchWriteCommand({ RequestItems: { [tableName]: pending } }),
    );
    pending = (response.UnprocessedItems?.[tableName] ?? []).flatMap(
      (request) =>
        request.DeleteRequest?.Key === undefined
          ? []
          : [{ DeleteRequest: { Key: request.DeleteRequest.Key } }],
    );
  }
}

function sessionKey(idHash: string) {
  return { pk: `SESSION#${idHash}`, sk: "SESSION" };
}

function candidateKey(candidateSubject: string) {
  return {
    pk: candidatePartition(candidateSubject),
    sk: "PREFERENCES",
  };
}

function candidatePartition(candidateSubject: string): string {
  return `CANDIDATE#${candidateSubject}`;
}

function deletionKey(candidateSubject: string) {
  return { pk: candidatePartition(candidateSubject), sk: "DELETION" };
}

function sessionOwnershipKey(candidateSubject: string, idHash: string) {
  return {
    pk: candidatePartition(candidateSubject),
    sk: `SESSION#${idHash}`,
  };
}

function sessionOwnershipItem(candidateSubject: string, idHash: string) {
  return sessionOwnershipKey(candidateSubject, idHash);
}
