import { expect, test } from "@playwright/test";

import { discoverJobListings } from "@/features/discovery/discover-job-listings";
import { fixtureJobSourceAdapter } from "@/features/discovery/fixture-job-source-adapter";
import { JobSourceAdapterError } from "@/features/discovery/job-source-adapter-error";
import {
  defineJobSourcePermission,
  type JobSourcePermission,
} from "@/features/discovery/job-source-permission";
import {
  knownField,
  type JobListing,
  type SourcedField,
} from "@/features/discovery/job-listing";

test("Job Preferences strictly select role, region, and work arrangement", async () => {
  const result = await discoverJobListings({
    adapters: [fixtureJobSourceAdapter],
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
    now: new Date("2026-09-21T12:00:00.000Z"),
  });

  expect(result.state).toEqual("available");
  expect(result.listings.map(({ sourceRecordId }) => sourceRecordId)).toEqual([
    "fixture-backend-engineer",
  ]);
});

test("a transient Job Source failure is retried exactly once", async () => {
  let attempts = 0;
  const adapter = {
    ...fixtureJobSourceAdapter,
    async listListings() {
      attempts += 1;
      if (attempts === 1) {
        throw new JobSourceAdapterError("transient", "temporary outage");
      }
      return fixtureJobSourceAdapter.listListings();
    },
  };

  const result = await discoverJobListings({
    adapters: [adapter],
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
    now: new Date("2026-09-21T12:00:00.000Z"),
  });

  expect(attempts).toEqual(2);
  expect(result.state).toEqual("available");
});

test("a non-transient source failure is not retried and healthy results stay available", async () => {
  let attempts = 0;
  const deniedAdapter = {
    ...fixtureJobSourceAdapter,
    source: { id: "denied-source", name: "Denied Source" },
    async listListings() {
      attempts += 1;
      throw new JobSourceAdapterError("permission", "display not permitted");
    },
  };

  const result = await discoverJobListings({
    adapters: [fixtureJobSourceAdapter, deniedAdapter],
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
    now: new Date("2026-09-21T12:00:00.000Z"),
  });

  expect(attempts).toEqual(1);
  expect(result.state).toEqual("partial");
  expect(result.listings).toHaveLength(1);
  expect(result.failures).toEqual([
    {
      source: { id: "denied-source", name: "Denied Source" },
      kind: "permission",
    },
  ]);
});

test("a conservative duplicate is merged while retaining both provenances", async () => {
  const [original] = await fixtureJobSourceAdapter.listListings();
  const duplicate = copyListingForSource(
    original,
    {
      id: "partner-demo",
      name: "Partner Demo",
    },
    defineJobSourcePermission({ display: true, retention: true }),
  );
  const partnerAdapter = {
    source: duplicate.provenance[0].source,
    permission: duplicate.provenance[0].permission,
    async listListings() {
      return [duplicate];
    },
  };

  const result = await discoverJobListings({
    adapters: [fixtureJobSourceAdapter, partnerAdapter],
    preferences: {
      roles: ["백엔드 개발"],
      regions: ["서울"],
      workArrangements: ["주 3일 오피스"],
    },
    now: new Date("2026-09-21T12:00:00.000Z"),
  });

  expect(result.listings).toHaveLength(1);
  expect(result.listings[0].provenance.map(({ source }) => source.id)).toEqual([
    "joblens-demo",
    "partner-demo",
  ]);
  expect(result.listings[0].employer.kind).toEqual("known");
  if (result.listings[0].employer.kind === "known") {
    expect(
      result.listings[0].employer.provenance.map(
        ({ permission }) => permission.retention,
      ),
    ).toEqual([false, true]);
  }
});

test("authentication, permission, and quota failures are never retried", async () => {
  for (const kind of ["authentication", "permission", "quota"] as const) {
    let attempts = 0;
    const result = await discoverJobListings({
      adapters: [
        {
          ...fixtureJobSourceAdapter,
          async listListings() {
            attempts += 1;
            throw new JobSourceAdapterError(kind, `${kind} failure`);
          },
        },
      ],
      preferences: defaultPreferences,
      now: fixtureNow,
    });

    expect(attempts).toEqual(1);
    expect(result.state).toEqual("unavailable");
  }
});

test("conflicting recruitment status is quarantined instead of displayed", async () => {
  const [original] = await fixtureJobSourceAdapter.listListings();
  const duplicate = copyListingForSource(original, {
    id: "conflicting-source",
    name: "Conflicting Source",
  });
  const conflicting: JobListing = {
    ...duplicate,
    recruitment: {
      status: "closed",
      closesAt: duplicate.recruitment.closesAt,
      evidence: {
        kind: "source-status",
        provenance: duplicate.provenance,
      },
    },
  };

  const result = await discoverJobListings({
    adapters: [
      fixtureJobSourceAdapter,
      adapterForListings("conflicting-source", [conflicting]),
    ],
    preferences: defaultPreferences,
    now: fixtureNow,
  });

  expect(result.state).toEqual("empty");
  expect(result.listings).toEqual([]);
  expect(result.quarantinedCount).toEqual(1);
  if (result.state === "empty") expect(result.reason).toEqual("verification");
});

test("all unavailable sources are distinct from a healthy empty result", async () => {
  const unavailable = await discoverJobListings({
    adapters: [
      {
        ...fixtureJobSourceAdapter,
        async listListings() {
          throw new JobSourceAdapterError("authentication", "expired token");
        },
      },
    ],
    preferences: defaultPreferences,
    now: fixtureNow,
  });
  const empty = await discoverJobListings({
    adapters: [adapterForListings("healthy-empty", [])],
    preferences: defaultPreferences,
    now: fixtureNow,
  });

  expect(unavailable.state).toEqual("unavailable");
  expect(empty.state).toEqual("empty");
  if (empty.state === "empty") expect(empty.reason).toEqual("preferences");
});

test("stale listings are not used to pad an empty result", async () => {
  const [original] = await fixtureJobSourceAdapter.listListings();
  const stale: JobListing = {
    ...original,
    observedAt: "2026-09-19T11:59:59.000Z",
    provenance: original.provenance.map((provenance) => ({
      ...provenance,
      observedAt: "2026-09-19T11:59:59.000Z",
    })) as unknown as JobListing["provenance"],
  };

  const result = await discoverJobListings({
    adapters: [adapterForListings("stale-source", [stale])],
    preferences: defaultPreferences,
    now: fixtureNow,
  });

  expect(result.state).toEqual("empty");
  expect(result.listings).toEqual([]);
});

const fixtureNow = new Date("2026-09-21T12:00:00.000Z");
const defaultPreferences = {
  roles: ["백엔드 개발"],
  regions: ["서울"],
  workArrangements: ["주 3일 오피스"],
} as const;

function adapterForListings(sourceId: string, listings: readonly JobListing[]) {
  return {
    source: { id: sourceId, name: sourceId },
    permission: defineJobSourcePermission({ display: true }),
    async listListings() {
      return listings;
    },
  };
}

function copyListingForSource(
  listing: JobListing,
  source: { id: string; name: string },
  permission: JobSourcePermission = defineJobSourcePermission({
    display: true,
  }),
): JobListing {
  const provenance = {
    ...listing.provenance[0],
    source,
    permission,
  };
  const copyField = <T>(field: SourcedField<T>): SourcedField<T> =>
    field.kind === "known" ? knownField(field.value, provenance) : field;
  const recruitment: JobListing["recruitment"] =
    listing.recruitment.status === "unknown"
      ? {
          status: "unknown",
          closesAt: copyField(listing.recruitment.closesAt),
          evidence: { kind: "unknown" },
        }
      : {
          status: listing.recruitment.status,
          closesAt: copyField(listing.recruitment.closesAt),
          evidence: {
            kind: listing.recruitment.evidence.kind,
            provenance: [provenance],
          },
        };

  return {
    ...listing,
    id: `${source.id}--${listing.sourceRecordId}`,
    employer: copyField(listing.employer),
    title: copyField(listing.title),
    location: copyField(listing.location),
    occupation: copyField(listing.occupation),
    workArrangement: copyField(listing.workArrangement),
    recruitment,
    provenance: [provenance],
    summary: copyField(listing.summary),
    highlights: copyField(listing.highlights),
  };
}
