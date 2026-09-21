export type RecruitmentStatus = "open" | "closed";

export type JobListingProvenance = {
  jobSourceId: string;
  jobSourceName: string;
  sourceRecordId: string;
  originalUrl: string;
  observedAt: string;
};

export type JobListing = {
  id: string;
  title: string;
  company: string;
  provenance: JobListingProvenance;
  region: string;
  occupation: string;
  workArrangement: string;
  recruitmentStatus: RecruitmentStatus;
  closesAt: string | null;
  closingLabel: string;
  summary: string;
  highlights: readonly string[];
};

const recruitmentStatusLabels = {
  open: "모집중",
  closed: "모집마감",
} satisfies Record<RecruitmentStatus, string>;

export function getRecruitmentStatusLabel(status: RecruitmentStatus): string {
  return recruitmentStatusLabels[status];
}
