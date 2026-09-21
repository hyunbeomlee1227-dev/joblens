import Link from "next/link";
import { notFound } from "next/navigation";

import {
  findFixtureJobListing,
  listFixtureJobListings,
} from "@/features/discovery/fixture-job-listings";
import { getRecruitmentStatusLabel } from "@/features/discovery/job-listing";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return listFixtureJobListings().map(({ id }) => ({ id }));
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const listing = findFixtureJobListing(id);

  if (!listing) {
    notFound();
  }

  return (
    <main className="detail-shell">
      <Link className="back-link" href="/">
        <span aria-hidden="true">←</span> 공고 목록
      </Link>

      <article className="detail-card">
        <div className="detail-heading">
          <div>
            <div className="job-card-topline">
              <span className="source-label">
                {listing.provenance.jobSourceName}
              </span>
              <span
                className={`status-badge status-${listing.recruitmentStatus}`}
              >
                <span className="status-dot" aria-hidden="true" />
                {getRecruitmentStatusLabel(listing.recruitmentStatus)}
              </span>
            </div>
            <p className="company">{listing.company}</p>
            <h1>{listing.title}</h1>
            <p className="detail-summary">{listing.summary}</p>
          </div>
          <a
            className="primary-link original-link"
            href={listing.provenance.originalUrl}
            rel="noreferrer"
            target="_blank"
          >
            원문 공고 보기 <span aria-hidden="true">↗</span>
          </a>
        </div>

        <dl className="detail-facts">
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
          <div>
            <dt>모집 상태</dt>
            <dd>
              {getRecruitmentStatusLabel(listing.recruitmentStatus)} ·{" "}
              {listing.closingLabel}
            </dd>
          </div>
        </dl>

        <section className="highlights" aria-labelledby="highlights-title">
          <p className="section-kicker">예시 주요 내용</p>
          <h2 id="highlights-title">공고에서 확인할 내용</h2>
          <ul>
            {listing.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <aside className="detail-notice">
          <strong>이 공고는 합성 데이터입니다.</strong>
          <p>
            실제 지원이 불가능하며, 원문 링크도 안전한 예시 도메인으로
            연결됩니다. 실제 공급원 연동 전에는 채용공고로 사용하지 않습니다.
          </p>
        </aside>
      </article>
    </main>
  );
}
