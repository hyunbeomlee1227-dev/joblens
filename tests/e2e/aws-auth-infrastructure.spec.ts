import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

test("the Candidate runtime can perform every operation used by DynamoDB transactions", async () => {
  const template = await readFile("infra/aws/auth.yml", "utf8");

  expect(template).toContain("- dynamodb:ConditionCheckItem");
  expect(template).toContain("- dynamodb:TransactWriteItems");
});
