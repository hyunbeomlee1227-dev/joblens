import type { JobSourceAdapter } from "./job-source-adapter";
import {
  JobSourceAdapterError,
  type JobSourceFailureKind,
} from "./job-source-adapter-error";
import type { JobSourceIdentity } from "./job-source-identity";
import {
  knownField,
  type JobListing,
  type JobListingProvenance,
  type ProvenanceSet,
  type SourcedField,
} from "./job-listing";
import { listDisplayableJobListings } from "./list-displayable-job-listings";

const maximumListingAge = 24 * 60 * 60 * 1000;

export type JobPreferences = {
  roles: readonly string[];
  regions: readonly string[];
  workArrangements: readonly string[];
};

export type DiscoveryResult =
  | {
      state: "available";
      listings: readonly JobListing[];
      failures: readonly [];
      quarantinedCount: number;
    }
  | {
      state: "partial";
      listings: readonly JobListing[];
      failures: readonly JobSourceFailure[];
      quarantinedCount: number;
    }
  | {
      state: "empty";
      listings: readonly [];
      reason: "preferences" | "verification";
      failures: readonly [];
      quarantinedCount: number;
    }
  | {
      state: "unavailable";
      listings: readonly [];
      failures: readonly JobSourceFailure[];
      quarantinedCount: number;
    };

export type JobSourceFailure = {
  source: JobSourceIdentity;
  kind: JobSourceFailureKind;
};

type DiscoverJobListingsInput = {
  adapters: readonly JobSourceAdapter[];
  preferences: JobPreferences;
  now: Date;
};

export async function discoverJobListings({
  adapters,
  preferences,
  now,
}: DiscoverJobListingsInput): Promise<DiscoveryResult> {
  const sourceResults = await Promise.all(adapters.map(loadAdapterListings));
  const failures = sourceResults.flatMap((result) =>
    result.ok ? [] : [result.failure],
  );
  const successfulSources = sourceResults.filter((result) => result.ok).length;
  const candidates = sourceResults
    .flatMap((result) => (result.ok ? result.listings : []))
    .flat();
  const { listings: verifiedListings, quarantinedCount } =
    mergeDuplicates(candidates);
  const listings = verifiedListings
    .filter((listing) => isCurrentOpenListing(listing, now))
    .filter((listing) => matchesPreferences(listing, preferences));

  if (successfulSources === 0) {
    return {
      state: "unavailable",
      listings: [],
      failures,
      quarantinedCount,
    };
  }

  if (failures.length > 0) {
    return { state: "partial", listings, failures, quarantinedCount };
  }

  if (listings.length === 0) {
    return {
      state: "empty",
      listings: [],
      reason: quarantinedCount > 0 ? "verification" : "preferences",
      failures: [],
      quarantinedCount,
    };
  }

  return { state: "available", listings, failures: [], quarantinedCount };
}

function mergeDuplicates(listings: readonly JobListing[]): {
  listings: readonly JobListing[];
  quarantinedCount: number;
} {
  const uniqueListings: JobListing[] = [];
  const quarantinedKeys = new Set<string>();
  let quarantinedCount = 0;

  for (const listing of listings) {
    const identity = getConservativeIdentity(listing);
    if (identity === undefined) {
      uniqueListings.push(listing);
      continue;
    }
    if (quarantinedKeys.has(identity)) {
      continue;
    }

    const duplicateIndex = uniqueListings.findIndex(
      (candidate) => getConservativeIdentity(candidate) === identity,
    );
    if (duplicateIndex === -1) {
      uniqueListings.push(listing);
      continue;
    }

    const duplicate = uniqueListings[duplicateIndex];
    if (hasRecruitmentConflict(duplicate, listing)) {
      uniqueListings.splice(duplicateIndex, 1);
      quarantinedKeys.add(identity);
      quarantinedCount += 1;
      continue;
    }

    const merged = mergeCompatibleListings(duplicate, listing);
    if (merged === undefined) {
      uniqueListings.push(listing);
      continue;
    }
    uniqueListings[duplicateIndex] = merged;
  }

  return { listings: uniqueListings, quarantinedCount };
}

function getConservativeIdentity(listing: JobListing): string | undefined {
  const employer = getDisplayableString(listing.employer);
  const title = getDisplayableString(listing.title);
  const location = getDisplayableString(listing.location);
  if (employer === undefined || title === undefined || location === undefined) {
    return undefined;
  }

  return [
    normalizeIdentityPart(employer),
    normalizeIdentityPart(title),
    normalizeIdentityPart(location),
    listing.originalUrl.trim(),
  ].join("\u001f");
}

function getDisplayableString(field: SourcedField<string>): string | undefined {
  return field.kind === "known" &&
    field.provenance.some(({ permission }) => permission.display)
    ? field.value
    : undefined;
}

function normalizeIdentityPart(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function hasRecruitmentConflict(left: JobListing, right: JobListing): boolean {
  if (left.recruitment.status !== right.recruitment.status) {
    return true;
  }

  const leftClosing = left.recruitment.closesAt;
  const rightClosing = right.recruitment.closesAt;
  return (
    leftClosing.kind === "known" &&
    rightClosing.kind === "known" &&
    leftClosing.value !== rightClosing.value
  );
}

function mergeCompatibleListings(
  left: JobListing,
  right: JobListing,
): JobListing | undefined {
  const employer = mergeField(left.employer, right.employer);
  const title = mergeField(left.title, right.title);
  const location = mergeField(left.location, right.location);
  const occupation = mergeField(left.occupation, right.occupation);
  const workArrangement = mergeField(
    left.workArrangement,
    right.workArrangement,
  );
  const closesAt = mergeField(
    left.recruitment.closesAt,
    right.recruitment.closesAt,
  );
  const summary = mergeField(left.summary, right.summary);
  const highlights = mergeField(left.highlights, right.highlights);
  const fields = [
    employer,
    title,
    location,
    occupation,
    workArrangement,
    closesAt,
    summary,
    highlights,
  ];
  if (fields.some((field) => field === undefined)) {
    return undefined;
  }
  if (
    left.recruitment.status === "unknown" ||
    right.recruitment.status === "unknown"
  ) {
    return undefined;
  }

  const provenance = mergeProvenance(left.provenance, right.provenance);
  return {
    ...left,
    employer: employer!,
    title: title!,
    location: location!,
    occupation: occupation!,
    workArrangement: workArrangement!,
    recruitment: {
      status: left.recruitment.status,
      closesAt: closesAt!,
      evidence: {
        kind: left.recruitment.evidence.kind,
        provenance: mergeProvenance(
          left.recruitment.evidence.provenance,
          right.recruitment.evidence.provenance,
        ),
      },
    },
    provenance,
    summary: summary!,
    highlights: highlights!,
  };
}

function mergeField<T>(
  left: SourcedField<T>,
  right: SourcedField<T>,
): SourcedField<T> | undefined {
  if (left.kind === "unknown") return right;
  if (right.kind === "unknown") return left;
  if (JSON.stringify(left.value) !== JSON.stringify(right.value)) {
    return undefined;
  }
  return knownField(
    left.value,
    mergeProvenance(left.provenance, right.provenance),
  );
}

function mergeProvenance(
  left: ProvenanceSet,
  right: ProvenanceSet,
): ProvenanceSet {
  const merged = [...left];
  const seen = new Set(left.map(provenanceKey));
  for (const provenance of right) {
    const key = provenanceKey(provenance);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(provenance);
    }
  }
  return merged as unknown as ProvenanceSet;
}

function provenanceKey(provenance: JobListingProvenance): string {
  return [
    provenance.source.id,
    provenance.sourceRecordId,
    provenance.originalUrl,
  ].join("\u001f");
}

async function loadAdapterListings(
  adapter: JobSourceAdapter,
): Promise<
  | { ok: true; listings: readonly JobListing[] }
  | { ok: false; failure: JobSourceFailure }
> {
  try {
    return { ok: true, listings: await listDisplayableJobListings(adapter) };
  } catch (error) {
    if (error instanceof JobSourceAdapterError && error.kind === "transient") {
      try {
        return {
          ok: true,
          listings: await listDisplayableJobListings(adapter),
        };
      } catch (retryError) {
        return { ok: false, failure: toFailure(adapter, retryError) };
      }
    }
    return { ok: false, failure: toFailure(adapter, error) };
  }
}

function toFailure(
  adapter: JobSourceAdapter,
  error: unknown,
): JobSourceFailure {
  return {
    source: adapter.source,
    kind: error instanceof JobSourceAdapterError ? error.kind : "unknown",
  };
}

function isCurrentOpenListing(listing: JobListing, now: Date): boolean {
  if (listing.recruitment.status !== "open") {
    return false;
  }

  const observedAt = Date.parse(listing.observedAt);
  if (
    !Number.isFinite(observedAt) ||
    observedAt > now.getTime() ||
    now.getTime() - observedAt > maximumListingAge
  ) {
    return false;
  }

  const { closesAt } = listing.recruitment;
  return (
    closesAt.kind === "unknown" || Date.parse(closesAt.value) >= now.getTime()
  );
}

function matchesPreferences(
  listing: JobListing,
  preferences: JobPreferences,
): boolean {
  return (
    matchesExact(listing.occupation, preferences.roles) &&
    matchesRegion(listing.location, preferences.regions) &&
    matchesExact(listing.workArrangement, preferences.workArrangements)
  );
}

function matchesExact(
  field: SourcedField<string>,
  accepted: readonly string[],
): boolean {
  return (
    accepted.length > 0 &&
    field.kind === "known" &&
    field.provenance.some(({ permission }) => permission.display) &&
    accepted.includes(field.value)
  );
}

function matchesRegion(
  field: SourcedField<string>,
  accepted: readonly string[],
): boolean {
  return (
    accepted.length > 0 &&
    field.kind === "known" &&
    field.provenance.some(({ permission }) => permission.display) &&
    accepted.some(
      (region) =>
        field.value === region || field.value.startsWith(`${region} `),
    )
  );
}
