import { expect, test } from "@playwright/test";

test("approval prepares a Resume but only an explicit Analysis action sends sanitized text through the BFF", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "joblens_session",
      value: `e2e-${crypto.randomUUID()}`,
      url: "http://127.0.0.1:3000",
    },
  ]);
  const analysisRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/analysis"))
      analysisRequests.push(request.postData() ?? "");
  });
  await page.goto("/resume?fixture=candidate");
  await page
    .getByLabel("이력서 텍스트")
    .fill("010-1234-5678\nBuilt Spring services for a project.");
  await page.getByRole("button", { name: "Extraction Review 시작" }).click();
  await page.getByLabel("입력 내용이 정확합니다").check();
  await page.getByRole("button", { name: "식별정보 제거 및 미리보기" }).click();
  await page.getByLabel("전송될 전체 내용을 확인했습니다").check();
  await page
    .getByLabel("이름·주소 등 직접 식별정보가 남아 있지 않습니다")
    .check();
  await page.getByRole("button", { name: "Sanitized Resume 승인" }).click();
  expect(analysisRequests).toEqual([]);
  const completed = page.waitForResponse((response) =>
    response.url().endsWith("/api/analysis"),
  );
  await page.getByRole("button", { name: "테스트 분석 시작" }).click();
  const completedResponse = await completed;
  expect(await completedResponse.json()).toMatchObject({ status: "completed" });
  await expect(
    page.getByText("Analysis Job 완료 · Resume Version 1"),
  ).toBeVisible();
  await expect(page.getByText("오늘 분석 사용량 1 / 2")).toBeVisible();
  expect(analysisRequests).toHaveLength(1);
  expect(analysisRequests[0]).toContain("[전화번호 제거]");
  expect(analysisRequests[0]).not.toContain("010-1234-5678");
  await page.reload();
  await expect(page.getByText("Resume Version 1 승인됨")).toHaveCount(0);
  await expect(page.getByLabel("이력서 텍스트")).toHaveValue("");
});

test("cancelling an in-flight Analysis Job keeps its charge and clearing the Resume discards any late output", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "joblens_session",
      value: `e2e-${crypto.randomUUID()}`,
      url: "http://127.0.0.1:3000",
    },
  ]);
  await page.goto("/resume?fixture=candidate");
  await page
    .getByLabel("이력서 텍스트")
    .fill("Built Spring services for a project.");
  await page.getByRole("button", { name: "Extraction Review 시작" }).click();
  await page.getByLabel("입력 내용이 정확합니다").check();
  await page.getByRole("button", { name: "식별정보 제거 및 미리보기" }).click();
  await page.getByLabel("전송될 전체 내용을 확인했습니다").check();
  await page
    .getByLabel("이름·주소 등 직접 식별정보가 남아 있지 않습니다")
    .check();
  await page.getByRole("button", { name: "Sanitized Resume 승인" }).click();
  await page.getByRole("button", { name: "테스트 분석 시작" }).click();
  await expect(page.getByRole("button", { name: "분석 취소" })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await (await context.request.get("/api/analysis/allowance")).json())
          .allowance.used,
    )
    .toBe(1);
  await page.getByRole("button", { name: "분석 취소" }).click();
  await expect(page.getByText(/분석 취소됨/)).toBeVisible();
  await page.getByRole("button", { name: "이력서 지우기" }).click();
  await expect(page.getByLabel("이력서 텍스트")).toHaveValue("");
  await expect(page.getByText(/Analysis Job 완료/)).toHaveCount(0);
});
