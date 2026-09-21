import Link from "next/link";

import {
  getRecruitmentStatusLabel,
  type JobListing,
} from "@/features/discovery/job-listing";

type JobListingCardProps = {
  listing: JobListing;
};

export function JobListingCard({ listing }: JobListingCardProps) {
  return (
    <article className="job-card" aria-label={`${listing.title} 채용공고`}>
      <div className="job-card-topline">
        <span className="source-label">{listing.provenance.jobSourceName}</span>
        <span className={`status-badge status-${listing.recruitmentStatus}`}>
          <span className="status-dot" aria-hidden="true" />
          {getRecruitmentStatusLabel(listing.recruitmentStatus)}
        </span>
      </div>
      <div>
        <p className="company">{listing.company}</p>
        <h2>{listing.title}</h2>
      </div>
      <p className="job-summary">{listing.summary}</p>
      <dl className="job-facts">
        <div>
          <dt>지역</dt>
          <dd>{listing.region}</dd>
        </div>
        <div>
          <dt>직군</dt>
          <dd>{listing.occupation}</dd>
        </div>
        <div>
          <dt>근무 형태</dt>
          <dd>{listing.workArrangement}</dd>
        </div>
      </dl>
      <div className="job-card-footer">
        <span>{listing.closingLabel}</span>
        <div className="card-actions">
          <a
            className="text-link secondary-text-link"
            href={listing.provenance.originalUrl}
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
