export type RecruitmentStatus = "open" | "closed";

export type JobListing = {
  id: string;
  title: string;
  company: string;
  source: string;
  region: string;
  occupation: string;
  workArrangement: string;
  recruitmentStatus: RecruitmentStatus;
  closingLabel: string;
  originalUrl: string;
  summary: string;
  highlights: readonly string[];
};
