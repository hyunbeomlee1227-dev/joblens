import { expect, test } from "@playwright/test";

import { fixtureJobSourceAdapter } from "@/features/discovery/fixture-job-source-adapter";

import { describeJobSourceAdapterContract } from "./job-source-adapter.contract";

describeJobSourceAdapterContract("fixture", () => fixtureJobSourceAdapter);

test("the fixture adapter supplies its expected example and permission scope", async () => {
  const [listing] = await fixtureJobSourceAdapter.listListings();

  expect(fixtureJobSourceAdapter.source).toEqual({
    id: "joblens-demo",
    name: "JobLens Demo",
  });
  expect(fixtureJobSourceAdapter.permission).toEqual({
    display: true,
    retention: false,
    analysis: false,
  });
  expect(listing).toMatchObject({
    id: "joblens-demo--fixture-backend-engineer",
    sourceRecordId: "fixture-backend-engineer",
    originalUrl: "https://example.com/jobs/backend-engineer",
    employer: { kind: "known", value: "샘플 테크" },
    title: { kind: "known", value: "백엔드 엔지니어" },
    location: { kind: "known", value: "서울 강남구" },
    workArrangement: { kind: "known", value: "주 3일 오피스" },
    observedAt: "2026-09-21T00:00:00.000Z",
    recruitment: {
      status: "open",
      evidence: { kind: "source-status" },
    },
  });
});

test("the fixture adapter keeps a missing source field unknown", async () => {
  const listings = await fixtureJobSourceAdapter.listListings();
  const listing = listings.find(
    ({ sourceRecordId }) => sourceRecordId === "fixture-product-operations",
  );

  expect(listing?.workArrangement).toEqual({ kind: "unknown" });
});
