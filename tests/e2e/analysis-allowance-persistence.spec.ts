import { expect, test } from "@playwright/test";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { DynamoDbAnalysisAllowance } from "@/features/analysis/dynamodb-analysis-allowance";

for (const failure of ["reversal", "intent"] as const)
  test(`metadata-only reservation is recovered after ${failure} failure and process replacement`, async () => {
    type WireItem = Record<string, { S?: string; N?: string }>;
    const rows = new Map<string, WireItem>();
    const writes: string[] = [];
    let failReversal = failure === "reversal";
    let failIntent = failure === "intent";
    let epoch = 1791118800;
    const keyOf = (item: WireItem) => JSON.stringify([item.pk.S, item.sk.S]);
    const client = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: "ap-northeast-2",
        credentials: { accessKeyId: "fixture", secretAccessKey: "fixture" },
        maxAttempts: 1,
        requestHandler: {
          async handle(request: {
            body?: Uint8Array | string;
            headers: Record<string, string>;
          }) {
            const serialized =
              typeof request.body === "string"
                ? request.body
                : new TextDecoder().decode(request.body);
            const body = JSON.parse(serialized);
            const action = request.headers["x-amz-target"].split(".").at(-1);
            let output: Record<string, unknown> = {};
            let statusCode = 200;
            if (action === "PutItem") {
              writes.push(serialized);
              if (failIntent) {
                failIntent = false;
                statusCode = 500;
                output = {
                  __type: "InternalServerError",
                  message: "temporary fixture outage",
                };
              } else rows.set(keyOf(body.Item), body.Item);
            }
            if (action === "DeleteItem") rows.delete(keyOf(body.Key));
            if (action === "Query")
              output = {
                Items: [...rows.values()].filter(
                  (item) =>
                    item.pk.S === body.ExpressionAttributeValues[":owner"].S &&
                    item.sk.S?.startsWith(
                      body.ExpressionAttributeValues[":refund"].S,
                    ),
                ),
              };
            if (action === "GetItem")
              output = { Item: rows.get(keyOf(body.Key)) };
            if (action === "TransactWriteItems") {
              writes.push(serialized);
              const reversing = body.TransactItems[0].Delete !== undefined;
              if (reversing && failReversal) {
                failReversal = false;
                statusCode = 500;
                output = {
                  __type: "InternalServerError",
                  message: "temporary fixture outage",
                };
              } else {
                for (const operation of body.TransactItems) {
                  if (operation.Put)
                    rows.set(keyOf(operation.Put.Item), operation.Put.Item);
                  if (operation.Delete)
                    rows.delete(keyOf(operation.Delete.Key));
                  if (operation.Update) {
                    const key = keyOf(operation.Update.Key);
                    const row = rows.get(key) ?? operation.Update.Key;
                    const used =
                      Number(row.used?.N ?? 0) + (reversing ? -1 : 1);
                    rows.set(key, { ...row, used: { N: String(used) } });
                  }
                }
              }
            }
            return {
              response: {
                statusCode,
                headers: { "content-type": "application/x-amz-json-1.0" },
                body: Buffer.from(JSON.stringify(output)),
              },
            };
          },
        },
      }),
    );
    const attempt = {
      candidateSubject: "candidate-a",
      jobId: crypto.randomUUID(),
      day: "2026-10-04",
      limit: 2,
      expiresAtEpoch: 1791212400,
      reservationExpiresAtEpoch: epoch + 900,
    };
    const clock = () => new Date(epoch * 1000);
    const firstProcess = new DynamoDbAnalysisAllowance(
      client,
      "fixture-table",
      clock,
    );
    expect(await firstProcess.consume(attempt)).toBe("consumed");
    await expect(firstProcess.refund(attempt)).rejects.toThrow();
    epoch += 901;
    const restartedProcess = new DynamoDbAnalysisAllowance(
      client,
      "fixture-table",
      clock,
    );
    expect(await restartedProcess.read("candidate-a", "2026-10-04")).toBe(0);
    expect(writes.join("\n")).not.toMatch(
      /sanitizedResume|postingText|accessToken|refreshToken/,
    );
    client.destroy();
  });
