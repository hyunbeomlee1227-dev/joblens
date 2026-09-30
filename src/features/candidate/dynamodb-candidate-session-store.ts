import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

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
    if (previousIdHash === null) {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
      return;
    }

    await this.client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: item,
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Delete: {
              TableName: this.tableName,
              Key: sessionKey(previousIdHash),
            },
          },
        ],
      }),
    );
  }

  async deleteSession(idHash: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: sessionKey(idHash),
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
      new PutCommand({
        TableName: this.tableName,
        Item: {
          ...candidateKey(candidateSubject),
          candidateSubject,
          preferences,
        },
      }),
    );
  }

  async deleteCandidate(candidateSubject: string): Promise<void> {
    let exclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "CandidateSubjectIndex",
          KeyConditionExpression: "candidateSubject = :candidateSubject",
          ExpressionAttributeValues: {
            ":candidateSubject": candidateSubject,
          },
          ProjectionExpression: "pk, sk",
          ExclusiveStartKey: exclusiveStartKey,
        }),
      );
      const keys = (response.Items ?? []).map(({ pk, sk }) => ({ pk, sk }));
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
    pk: `CANDIDATE#${candidateSubject}`,
    sk: "PREFERENCES",
  };
}
