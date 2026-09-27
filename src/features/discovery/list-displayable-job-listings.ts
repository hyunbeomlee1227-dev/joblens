import type { JobSourceAdapter } from "./job-source-adapter";
import type { JobListing } from "./job-listing";

export async function listDisplayableJobListings(
  adapter: JobSourceAdapter,
): Promise<readonly JobListing[]> {
  if (!adapter.permission.display) {
    return [];
  }

  const listings = await adapter.listListings();
  return listings.filter(
    (listing) =>
      isHttpUrl(listing.originalUrl) &&
      listing.provenance.some(
        (provenance) =>
          provenance.originalUrl === listing.originalUrl &&
          provenance.originalLinkEvidence.kind === "verified" &&
          provenance.permission.display,
      ) &&
      listing.recruitment.status !== "unknown" &&
      listing.recruitment.evidence.provenance.some(
        ({ permission }) => permission.display,
      ),
  );
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}
