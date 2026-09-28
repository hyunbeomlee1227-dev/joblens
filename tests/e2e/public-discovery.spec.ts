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
    listing.getByText("Partner Demo", { exact: true }),
  ).toBeVisible();
  await expect(listing.getByText("표시 허용", { exact: true })).toHaveCount(2);
  await expect(listing.getByText("보관 불가", { exact: true })).toHaveCount(2);
  await expect(listing.getByText("AI 분석 불가", { exact: true })).toHaveCount(
    2,
  );
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

test("a visitor can explicitly change every strict discovery preference", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("직군").selectOption("프론트엔드 개발");
  await page.getByLabel("지역").selectOption("경기");
  await page.getByLabel("근무 형태").selectOption("하이브리드");
  await page.getByRole("button", { name: "조건 적용" }).click();

  await expect(page).toHaveURL(/role=.*&region=.*&workArrangement=/);
  const frontendListing = page.getByRole("article", {
    name: "프론트엔드 엔지니어 채용공고",
  });
  await expect(frontendListing).toBeVisible();
  await expect(
    page.getByRole("article", { name: "백엔드 엔지니어 채용공고" }),
  ).toHaveCount(0);

  await frontendListing.getByRole("link", { name: "상세 보기" }).click();
  await expect(
    page.getByRole("heading", { name: "프론트엔드 엔지니어" }),
  ).toBeVisible();
});

test("an empty fixture result is explained instead of looking like an error", async ({
  page,
}) => {
  await page.goto("/?fixture=empty");

  await expect(
    page.getByRole("heading", { name: "선호 조건에 맞는 공고가 없습니다" }),
  ).toBeVisible();
  await expect(
    page.getByText("선호 조건을 자동으로 넓히지 않았습니다."),
  ).toBeVisible();
});

test("a partial source failure keeps healthy listings and explains the limitation", async ({
  page,
}) => {
  await page.goto("/?fixture=partial");

  await expect(
    page.getByText("일부 공급원 연결이 원활하지 않습니다."),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "백엔드 엔지니어 채용공고" }),
  ).toBeVisible();
});

test("all unavailable sources are not presented as an empty search", async ({
  page,
}) => {
  await page.goto("/?fixture=unavailable");

  await expect(
    page.getByRole("heading", { name: "현재 공고를 확인할 수 없음" }),
  ).toBeVisible();
  await expect(
    page.getByText("연결 가능한 공급원이 없어 공고를 불러오지 못했습니다."),
  ).toBeVisible();
});
