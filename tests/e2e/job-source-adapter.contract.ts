import { expect, test } from "@playwright/test";

import type { JobSourceAdapter } from "@/features/discovery/job-source-adapter";
import type { SourcedField } from "@/features/discovery/job-listing";

export function describeJobSourceAdapterContract(
  name: string,
  getAdapter: () => JobSourceAdapter,
) {
  test.describe(`${name} Job Source adapter contract`, () => {
    test("returns normalized listings with field-level provenance", async () => {
      const adapter = getAdapter();
      const listings = await adapter.listListings();

      expect(adapter.source.id).not.toEqual("");
      expect(adapter.source.name).not.toEqual("");

      for (const listing of listings) {
        expect(listing.id).not.toEqual("");
        expect(listing.sourceRecordId).not.toEqual("");
        expect(Number.isNaN(Date.parse(listing.observedAt))).toBe(false);
        expect(new URL(listing.originalUrl).protocol).toMatch(/^https?:$/);
        expect(listing.provenance.length).toBeGreaterThan(0);

        for (const provenance of listing.provenance) {
          expect(provenance.source.id).toEqual(adapter.source.id);
          expect(provenance.sourceRecordId).toEqual(listing.sourceRecordId);
          expect(provenance.originalUrl).toEqual(listing.originalUrl);
          expect(["verified", "unknown"]).toContain(
            provenance.originalLinkEvidence.kind,
          );
          expect(provenance.observedAt).toEqual(listing.observedAt);
        }

        const sourcedFields: readonly SourcedField<unknown>[] = [
          listing.employer,
          listing.title,
          listing.location,
          listing.occupation,
          listing.workArrangement,
          listing.recruitment.closesAt,
          listing.summary,
          listing.highlights,
        ];

        for (const field of sourcedFields) {
          if (field.kind === "known") {
            expect(field.provenance.source.id).toEqual(adapter.source.id);
            expect(field.provenance.permission).toEqual(adapter.permission);
          }
        }

        if (listing.recruitment.status !== "unknown") {
          expect(listing.recruitment.evidence.kind).not.toEqual("unknown");
          expect(listing.recruitment.evidence.provenance.source.id).toEqual(
            adapter.source.id,
          );
        }
      }
    });

    test("declares every permission use explicitly as a boolean", () => {
      const { permission } = getAdapter();

      expect(typeof permission.display).toEqual("boolean");
      expect(typeof permission.retention).toEqual("boolean");
      expect(typeof permission.analysis).toEqual("boolean");
    });
  });
}
