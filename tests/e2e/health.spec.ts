import { expect, test } from "@playwright/test";

test("the public health endpoint reports the deployed release", async ({
  request,
}) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "joblens",
    version: "local",
  });
});
