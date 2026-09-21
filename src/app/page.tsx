import { JobListingCard } from "@/components/job-listing-card";
import { listFixtureJobListings } from "@/features/discovery/fixture-job-listings";

type HomePageProps = {
  searchParams: Promise<{ fixture?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { fixture } = await searchParams;
  const listings = fixture === "empty" ? [] : listFixtureJobListings();

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">DISCOVER WITH CONTEXT</div>
        <h1>지금 확인할 수 있는 채용공고</h1>
        <p>
          지역과 직군 정보를 한눈에 살펴보고, 관심 있는 공고의 출처로 바로
          이동하세요.
        </p>
      </section>

      <section className="discovery-section" aria-labelledby="listing-count">
        <div className="section-heading">
          <div>
            <p className="section-kicker">공개 탐색</p>
            <h2 id="listing-count">데모 공고 {listings.length}건</h2>
          </div>
          <p className="scope-note">서울 · 경기 · 인천</p>
        </div>

        {listings.length > 0 ? (
          <div className="job-grid">
            {listings.map((listing) => (
              <JobListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              0
            </div>
            <h2>조건에 맞는 데모 공고가 없습니다</h2>
            <p>서비스 장애가 아니라 빈 결과 화면을 확인하기 위한 상태입니다.</p>
            <a className="primary-link" href="/">
              데모 공고 다시 보기
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
