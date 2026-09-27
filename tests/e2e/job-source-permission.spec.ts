import { expect, test } from "@playwright/test";

import { fixtureJobSourceAdapter } from "@/features/discovery/fixture-job-source-adapter";
import { defineJobSourcePermission } from "@/features/discovery/job-source-permission";
import {
  getDisplayableFieldValue,
  knownField,
} from "@/features/discovery/job-listing";

test("unspecified Job Source permissions are denied", () => {
  expect(defineJobSourcePermission({ display: true })).toEqual({
    display: true,
    retention: false,
    analysis: false,
  });
});

test("a display-denied sourced field resolves to the safe fallback", async () => {
  const [fixture] = await fixtureJobSourceAdapter.listListings();
  const deniedProvenance = {
    ...fixture.provenance[0],
    permission: defineJobSourcePermission({}),
  };

  expect(
    getDisplayableFieldValue(
      knownField("비공개 값", deniedProvenance),
      "미확인",
    ),
  ).toEqual("미확인");
});
