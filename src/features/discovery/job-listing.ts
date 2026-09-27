import type { JobSourceIdentity } from "./job-source-identity";
import type { JobSourcePermission } from "./job-source-permission";

export type JobListingProvenance = {
  source: JobSourceIdentity;
  permission: JobSourcePermission;
  sourceRecordId: string;
  originalUrl: string;
  originalLinkEvidence:
    | {
        kind: "verified";
        method: "source-record" | "fixture";
        verifiedAt: string;
      }
    | { kind: "unknown" };
  observedAt: string;
};

export type ProvenanceSet = readonly [
  JobListingProvenance,
  ...JobListingProvenance[],
];

export type KnownField<T> = {
  kind: "known";
  value: T;
  provenance: ProvenanceSet;
};

export type UnknownField = {
  kind: "unknown";
};

export type SourcedField<T> = KnownField<T> | UnknownField;

type VerifiedRecruitmentEvidence = {
  kind: "source-status" | "closing-date";
  provenance: ProvenanceSet;
};

type UnknownRecruitmentEvidence = {
  kind: "unknown";
};

export type Recruitment =
  | {
      status: "open" | "closed";
      closesAt: SourcedField<string>;
      evidence: VerifiedRecruitmentEvidence;
    }
  | {
      status: "unknown";
      closesAt: SourcedField<string>;
      evidence: UnknownRecruitmentEvidence;
    };

export type RecruitmentStatus = Recruitment["status"];

export type JobListing = {
  id: string;
  sourceRecordId: string;
  originalUrl: string;
  employer: SourcedField<string>;
  title: SourcedField<string>;
  location: SourcedField<string>;
  occupation: SourcedField<string>;
  workArrangement: SourcedField<string>;
  observedAt: string;
  recruitment: Recruitment;
  provenance: ProvenanceSet;
  summary: SourcedField<string>;
  highlights: SourcedField<readonly string[]>;
};

const recruitmentStatusLabels = {
  open: "모집중",
  closed: "모집마감",
  unknown: "상태 미확인",
} satisfies Record<RecruitmentStatus, string>;

export function knownField<T>(
  value: T,
  provenance: JobListingProvenance | ProvenanceSet,
): KnownField<T> {
  return {
    kind: "known",
    value,
    provenance: Array.isArray(provenance)
      ? (provenance as ProvenanceSet)
      : [provenance as JobListingProvenance],
  };
}

export function unknownField(): UnknownField {
  return { kind: "unknown" };
}

export function getDisplayableFieldValue<T>(
  field: SourcedField<T>,
  fallback: T,
): T {
  return field.kind === "known" &&
    field.provenance.some(({ permission }) => permission.display)
    ? field.value
    : fallback;
}

export function getRecruitmentStatusLabel(status: RecruitmentStatus): string {
  return recruitmentStatusLabels[status];
}

export function getClosingLabel(closesAt: SourcedField<string>): string {
  if (
    closesAt.kind === "unknown" ||
    !closesAt.provenance.some(({ permission }) => permission.display)
  ) {
    return "마감일 미확인";
  }

  const date = new Date(closesAt.value);
  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 마감`;
}
