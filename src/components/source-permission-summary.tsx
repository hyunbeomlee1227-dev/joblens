import type { JobListingProvenance } from "@/features/discovery/job-listing";

type SourcePermissionSummaryProps = {
  provenance: readonly [JobListingProvenance, ...JobListingProvenance[]];
  variant?: "compact" | "detail";
};

export function SourcePermissionSummary({
  provenance,
  variant = "compact",
}: SourcePermissionSummaryProps) {
  const detailed = variant === "detail";

  return (
    <aside
      className={detailed ? "source-permission-notice" : "permission-summary"}
      aria-label="공급원 이용 권한"
    >
      {detailed ? <strong>공급원 이용 범위</strong> : null}
      <div className="source-permission-rows">
        {provenance
          .filter(({ permission }) => permission.display)
          .map(({ permission, source, sourceRecordId }) => (
            <div
              className="source-permission-row"
              key={`${source.id}:${sourceRecordId}`}
            >
              <b>{source.name}</b>
              <span>{permission.display ? "표시 허용" : "표시 불가"}</span>
              <span>{permission.retention ? "보관 허용" : "보관 불가"}</span>
              <span>
                {permission.analysis ? "AI 분석 허용" : "AI 분석 불가"}
              </span>
            </div>
          ))}
      </div>
      {detailed ? (
        <p>
          각 공급원이 허용한 범위를 벗어나 공고를 저장하거나 분석하지 않습니다.
        </p>
      ) : null}
    </aside>
  );
}
