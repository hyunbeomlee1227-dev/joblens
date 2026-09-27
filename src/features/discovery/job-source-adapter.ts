import type { JobListing } from "./job-listing";
import type { JobSourceIdentity } from "./job-source-identity";
import type { JobSourcePermission } from "./job-source-permission";

export type JobSourceAdapter = {
  source: JobSourceIdentity;
  permission: JobSourcePermission;
  listListings: () => Promise<readonly JobListing[]>;
};
