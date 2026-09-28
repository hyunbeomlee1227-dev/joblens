import {
  discoverJobListings,
  type DiscoveryResult,
  type JobPreferences,
} from "./discover-job-listings";
import {
  fixtureJobSourceAdapter,
  partnerFixtureJobSourceAdapter,
} from "./fixture-job-source-adapter";
import { JobSourceAdapterError } from "./job-source-adapter-error";
import { getDisplayableFieldValue, type JobListing } from "./job-listing";
import { listDisplayableJobListings } from "./list-displayable-job-listings";

const fixtureSnapshotTime = new Date("2026-09-21T12:00:00.000Z");
export const fixturePreferenceOptions = {
  roles: ["백엔드 개발", "프론트엔드 개발", "서비스 운영"],
  regions: ["서울", "경기", "인천"],
  workArrangements: ["주 3일 오피스", "하이브리드"],
} as const;

export const defaultFixturePreferences = {
  roles: ["백엔드 개발"],
  regions: ["서울"],
  workArrangements: ["주 3일 오피스"],
} as const;

const unavailableAdapter = {
  ...fixtureJobSourceAdapter,
  source: { id: "unavailable-demo", name: "Unavailable Demo" },
  async listListings(): Promise<readonly JobListing[]> {
    throw new JobSourceAdapterError("authentication", "fixture failure");
  },
};

export async function discoverFixtureJobListings(
  scenario?: string,
  selectedPreferences: JobPreferences = defaultFixturePreferences,
): Promise<DiscoveryResult> {
  const adapters =
    scenario === "unavailable"
      ? [unavailableAdapter]
      : scenario === "partial"
        ? [fixtureJobSourceAdapter, unavailableAdapter]
        : [fixtureJobSourceAdapter, partnerFixtureJobSourceAdapter];
  const preferences =
    scenario === "empty"
      ? { ...selectedPreferences, roles: ["조건에 없는 직군"] }
      : selectedPreferences;

  return discoverJobListings({
    adapters,
    preferences,
    now: fixtureSnapshotTime,
  });
}

export async function listFixtureJobListings(): Promise<readonly JobListing[]> {
  return (await discoverFixtureJobListings()).listings;
}

export async function findFixtureJobListing(
  id: string,
): Promise<JobListing | undefined> {
  const sourceListings = (
    await Promise.all(
      [fixtureJobSourceAdapter, partnerFixtureJobSourceAdapter].map(
        listDisplayableJobListings,
      ),
    )
  ).flat();
  const candidate = sourceListings.find((listing) => listing.id === id);
  if (candidate === undefined) return undefined;

  const occupation = getDisplayableFieldValue(candidate.occupation, "");
  const location = getDisplayableFieldValue(candidate.location, "");
  const workArrangement = getDisplayableFieldValue(
    candidate.workArrangement,
    "",
  );
  if (occupation === "" || location === "" || workArrangement === "") {
    return candidate;
  }

  const result = await discoverJobListings({
    adapters: [fixtureJobSourceAdapter, partnerFixtureJobSourceAdapter],
    preferences: {
      roles: [occupation],
      regions: [location.split(" ")[0]],
      workArrangements: [workArrangement],
    },
    now: fixtureSnapshotTime,
  });
  return result.listings.find(
    (listing) =>
      listing.id === id ||
      (listing.stableIdentity.kind === "known" &&
        candidate.stableIdentity.kind === "known" &&
        listing.stableIdentity.value === candidate.stableIdentity.value),
  );
}
