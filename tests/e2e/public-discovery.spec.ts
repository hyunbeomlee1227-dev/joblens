import { expect, test } from "@playwright/test";

test("a visitor can browse a fixture listing and reach its original link", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "지금 확인할 수 있는 채용공고" }),
  ).toBeVisible();
  await expect(
    page.getByText("합성 데이터 데모", { exact: true }),
  ).toBeVisible();

  const listing = page.getByRole("article", {
    name: "백엔드 엔지니어 채용공고",
  });
  await expect(listing.getByText("서울 강남구", { exact: true })).toBeVisible();
  await expect(listing.getByText("백엔드 개발", { exact: true })).toBeVisible();
  await expect(listing.getByText("모집중", { exact: true })).toBeVisible();
  await expect(
    listing.getByText("JobLens Demo", { exact: true }),
  ).toBeVisible();
  await expect(
    listing.getByRole("link", { name: "원문 보기" }),
  ).toHaveAttribute("href", "https://example.com/jobs/backend-engineer");

  await listing.getByRole("link", { name: "상세 보기" }).click();
  await expect(
    page.getByRole("heading", { name: "백엔드 엔지니어" }),
  ).toBeVisible();

  const originalLink = page.getByRole("link", { name: "원문 공고 보기" });
  await expect(originalLink).toHaveAttribute(
    "href",
    "https://example.com/jobs/backend-engineer",
  );

  await page
    .context()
    .route("https://example.com/jobs/backend-engineer", async (route) => {
      await route.fulfill({ body: "Synthetic original listing" });
    });
  const originalPagePromise = page.waitForEvent("popup");
  await originalLink.click();
  const originalPage = await originalPagePromise;
  await expect(originalPage).toHaveURL(
    "https://example.com/jobs/backend-engineer",
  );
});

test("an empty fixture result is explained instead of looking like an error", async ({
  page,
}) => {
  await page.goto("/?fixture=empty");

  await expect(
    page.getByRole("heading", { name: "조건에 맞는 데모 공고가 없습니다" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "서비스 장애가 아니라 빈 결과 화면을 확인하기 위한 상태입니다.",
    ),
  ).toBeVisible();
});
