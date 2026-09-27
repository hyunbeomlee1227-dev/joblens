import Link from "next/link";

import { SourcePermissionSummary } from "@/components/source-permission-summary";
import {
  getClosingLabel,
  getDisplayableFieldValue,
  getRecruitmentStatusLabel,
  type JobListing,
} from "@/features/discovery/job-listing";

type JobListingCardProps = {
  listing: JobListing;
};

export function JobListingCard({ listing }: JobListingCardProps) {
  const title = getDisplayableFieldValue(listing.title, "직무명 미확인");

  return (
    <article className="job-card" aria-label={`${title} 채용공고`}>
      <div className="job-card-topline">
        <span className={`status-badge status-${listing.recruitment.status}`}>
          <span className="status-dot" aria-hidden="true" />
          {getRecruitmentStatusLabel(listing.recruitment.status)}
        </span>
      </div>
      <SourcePermissionSummary provenance={listing.provenance} />
      <div>
        <p className="company">
          {getDisplayableFieldValue(listing.employer, "회사 미확인")}
        </p>
        <h2>{title}</h2>
      </div>
      <p className="job-summary">
        {getDisplayableFieldValue(
          listing.summary,
          "공급원이 요약을 제공하지 않았습니다.",
        )}
      </p>
      <dl className="job-facts">
        <div>
          <dt>지역</dt>
          <dd>{getDisplayableFieldValue(listing.location, "지역 미확인")}</dd>
        </div>
        <div>
          <dt>직군</dt>
          <dd>{getDisplayableFieldValue(listing.occupation, "직군 미확인")}</dd>
        </div>
        <div>
          <dt>근무 형태</dt>
          <dd>
            {getDisplayableFieldValue(
              listing.workArrangement,
              "근무 형태 미확인",
            )}
          </dd>
        </div>
      </dl>
      <div className="job-card-footer">
        <span>{getClosingLabel(listing.recruitment.closesAt)}</span>
        <div className="card-actions">
          <a
            className="text-link secondary-text-link"
            href={listing.originalUrl}
            rel="noreferrer"
            target="_blank"
          >
            원문 보기 <span aria-hidden="true">↗</span>
          </a>
          <Link className="text-link" href={`/jobs/${listing.id}`}>
            상세 보기 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
