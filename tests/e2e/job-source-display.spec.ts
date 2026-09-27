import { expect, test } from "@playwright/test";

import { fixtureJobSourceAdapter } from "@/features/discovery/fixture-job-source-adapter";
import type { JobSourceAdapter } from "@/features/discovery/job-source-adapter";
import { listDisplayableJobListings } from "@/features/discovery/list-displayable-job-listings";
import { defineJobSourcePermission } from "@/features/discovery/job-source-permission";
import { unknownField } from "@/features/discovery/job-listing";

test("a display-denied Job Source is not queried or exposed", async () => {
  let queried = false;

  const listings = await listDisplayableJobListings({
    source: { id: "denied-source", name: "Denied Source" },
    permission: defineJobSourcePermission({}),
    async listListings() {
      queried = true;
      return [];
    },
  });

  expect(queried).toBe(false);
  expect(listings).toEqual([]);
});

test("unverifiable links and unknown recruitment status are not displayed", async () => {
  const [fixture] = await fixtureJobSourceAdapter.listListings();
  const adapter: JobSourceAdapter = {
    ...fixtureJobSourceAdapter,
    async listListings() {
      return [
        { ...fixture, id: "invalid-url", originalUrl: "not-a-url" },
        {
          ...fixture,
          id: "unverified-url",
          provenance: [
            {
              ...fixture.provenance[0],
              originalLinkEvidence: { kind: "unknown" },
            },
          ],
        },
        {
          ...fixture,
          id: "display-denied-provenance",
          provenance: [
            {
              ...fixture.provenance[0],
              permission: defineJobSourcePermission({}),
            },
          ],
        },
        {
          ...fixture,
          id: "unknown-status",
          recruitment: {
            status: "unknown",
            closesAt: unknownField(),
            evidence: { kind: "unknown" },
          },
        },
      ];
    },
  };

  await expect(listDisplayableJobListings(adapter)).resolves.toEqual([]);
});
