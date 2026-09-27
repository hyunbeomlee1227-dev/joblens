import { fixtureJobSourceAdapter } from "./fixture-job-source-adapter";
import type { JobListing } from "./job-listing";
import { listDisplayableJobListings } from "./list-displayable-job-listings";

const fixtureSnapshotTime = Date.parse("2026-09-21T12:00:00.000Z");
const maximumFixtureAge = 24 * 60 * 60 * 1000;

function isCurrentFixtureListing(listing: JobListing): boolean {
  const observedAt = Date.parse(listing.observedAt);
  const closesAt =
    listing.recruitment.closesAt.kind === "known"
      ? Date.parse(listing.recruitment.closesAt.value)
      : null;
  const isFresh =
    Number.isFinite(observedAt) &&
    observedAt <= fixtureSnapshotTime &&
    fixtureSnapshotTime - observedAt <= maximumFixtureAge;
  const isNotExpired = closesAt === null || closesAt >= fixtureSnapshotTime;

  return listing.recruitment.status === "open" && isFresh && isNotExpired;
}

export async function listFixtureJobListings(): Promise<readonly JobListing[]> {
  const listings = await listDisplayableJobListings(fixtureJobSourceAdapter);
  return listings.filter(isCurrentFixtureListing);
}

export async function findFixtureJobListing(
  id: string,
): Promise<JobListing | undefined> {
  const listings = await listFixtureJobListings();
  return listings.find((listing) => listing.id === id);
}
