import Link from "next/link";
import { notFound } from "next/navigation";

import { SourcePermissionSummary } from "@/components/source-permission-summary";
import {
  findFixtureJobListing,
  listFixtureJobListings,
} from "@/features/discovery/fixture-job-listings";
import {
  getClosingLabel,
  getDisplayableFieldValue,
  getRecruitmentStatusLabel,
} from "@/features/discovery/job-listing";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const listings = await listFixtureJobListings();
  return listings.map(({ id }) => ({ id }));
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const listing = await findFixtureJobListing(id);

  if (!listing) {
    notFound();
  }

  const highlights = getDisplayableFieldValue(listing.highlights, []);

  return (
    <main className="detail-shell">
      <Link className="back-link" href="/">
        <span aria-hidden="true">←</span> 공고 목록
      </Link>

      <article className="detail-card">
        <div className="detail-heading">
          <div>
            <div className="job-card-topline">
              <span
                className={`status-badge status-${listing.recruitment.status}`}
              >
                <span className="status-dot" aria-hidden="true" />
                {getRecruitmentStatusLabel(listing.recruitment.status)}
              </span>
            </div>
            <p className="company">
              {getDisplayableFieldValue(listing.employer, "회사 미확인")}
            </p>
            <h1>{getDisplayableFieldValue(listing.title, "직무명 미확인")}</h1>
            <p className="detail-summary">
              {getDisplayableFieldValue(
                listing.summary,
                "공급원이 요약을 제공하지 않았습니다.",
              )}
            </p>
          </div>
          <a
            className="primary-link original-link"
            href={listing.originalUrl}
            rel="noreferrer"
            target="_blank"
          >
            원문 공고 보기 <span aria-hidden="true">↗</span>
          </a>
        </div>

        <dl className="detail-facts">
          <div>
            <dt>지역</dt>
            <dd>{getDisplayableFieldValue(listing.location, "지역 미확인")}</dd>
          </div>
          <div>
            <dt>직군</dt>
            <dd>
              {getDisplayableFieldValue(listing.occupation, "직군 미확인")}
            </dd>
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
          <div>
            <dt>모집 상태</dt>
            <dd>
              {getRecruitmentStatusLabel(listing.recruitment.status)} ·{" "}
              {getClosingLabel(listing.recruitment.closesAt)}
            </dd>
          </div>
        </dl>

        <section className="highlights" aria-labelledby="highlights-title">
          <p className="section-kicker">예시 주요 내용</p>
          <h2 id="highlights-title">공고에서 확인할 내용</h2>
          <ul>
            {highlights.length > 0 ? (
              highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))
            ) : (
              <li>공급원이 주요 내용을 제공하지 않았습니다.</li>
            )}
          </ul>
        </section>

        <SourcePermissionSummary
          provenance={listing.provenance}
          variant="detail"
        />

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
