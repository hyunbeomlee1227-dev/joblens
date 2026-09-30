import { JobListingCard } from "@/components/job-listing-card";
import { getCandidatePageState } from "@/features/candidate/candidate-page-state";
import {
  defaultFixturePreferences,
  discoverFixtureJobListings,
  fixturePreferenceOptions,
} from "@/features/discovery/fixture-job-listings";

type HomePageProps = {
  searchParams: Promise<{
    fixture?: string;
    role?: string;
    region?: string;
    workArrangement?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { fixture, role, region, workArrangement } = await searchParams;
  const candidateState = await getCandidatePageState();
  const savedPreferences = candidateState?.preferences;
  const selected = {
    role: selectAllowed(
      role,
      fixturePreferenceOptions.roles,
      savedPreferences?.roles[0] ?? defaultFixturePreferences.roles[0],
    ),
    region: selectAllowed(
      region,
      fixturePreferenceOptions.regions,
      savedPreferences?.regions[0] ?? defaultFixturePreferences.regions[0],
    ),
    workArrangement: selectAllowed(
      workArrangement,
      fixturePreferenceOptions.workArrangements,
      savedPreferences?.workArrangements[0] ??
        defaultFixturePreferences.workArrangements[0],
    ),
  };
  const result = await discoverFixtureJobListings(fixture, {
    roles: [selected.role],
    regions: [selected.region],
    workArrangements: [selected.workArrangement],
  });
  const { listings } = result;

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">DISCOVER WITH CONTEXT</div>
        <h1>지금 확인할 수 있는 채용공고</h1>
        <p>
          지역과 직군 정보를 한눈에 살펴보고, 관심 있는 공고의 출처로 바로
          이동하세요.
        </p>
        {candidateState === null ? (
          <a className="google-login" href="/auth/google">
            Google로 로그인
          </a>
        ) : (
          <div className="candidate-session-panel">
            <strong>Google 로그인 세션</strong>
            <span>저장한 선호 조건을 이 브라우저 세션에 적용합니다.</span>
            <div>
              <form action="/api/auth/logout" method="post">
                <input
                  name="csrfToken"
                  type="hidden"
                  value={candidateState.csrfToken}
                />
                <button type="submit">로그아웃</button>
              </form>
              <form action="/api/candidate/account" method="post">
                <input
                  name="csrfToken"
                  type="hidden"
                  value={candidateState.csrfToken}
                />
                <button className="danger-button" type="submit">
                  계정 삭제
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      <section className="discovery-section" aria-labelledby="listing-count">
        <form
          action={candidateState === null ? "/" : "/api/candidate/preferences"}
          className="preference-form"
          method={candidateState === null ? "get" : "post"}
        >
          {fixture ? (
            <input name="fixture" type="hidden" value={fixture} />
          ) : null}
          {candidateState ? (
            <input
              name="csrfToken"
              type="hidden"
              value={candidateState.csrfToken}
            />
          ) : null}
          <label>
            <span>직군</span>
            <select defaultValue={selected.role} name="role">
              {fixturePreferenceOptions.roles.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>지역</span>
            <select defaultValue={selected.region} name="region">
              {fixturePreferenceOptions.regions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>근무 형태</span>
            <select
              defaultValue={selected.workArrangement}
              name="workArrangement"
            >
              {fixturePreferenceOptions.workArrangements.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button type="submit">
            {candidateState === null ? "조건 적용" : "조건 저장·적용"}
          </button>
        </form>

        <div className="section-heading">
          <div>
            <p className="section-kicker">공개 탐색</p>
            <h2 id="listing-count">데모 공고 {listings.length}건</h2>
          </div>
          <p className="scope-note">서울 · 경기 · 인천</p>
        </div>

        {result.state === "partial" ? (
          <div className="discovery-notice" role="status">
            <strong>일부 공급원 연결이 원활하지 않습니다.</strong>
            <span>확인 가능한 공급원의 최신 공고만 표시합니다.</span>
          </div>
        ) : null}

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
            <h2>
              {result.state === "unavailable"
                ? "현재 공고를 확인할 수 없음"
                : result.state === "empty" && result.reason === "verification"
                  ? "검증이 필요한 공고를 제외했습니다"
                  : "선호 조건에 맞는 공고가 없습니다"}
            </h2>
            <p>
              {result.state === "unavailable"
                ? "연결 가능한 공급원이 없어 공고를 불러오지 못했습니다."
                : result.state === "empty" && result.reason === "verification"
                  ? "공급원 사이의 모집 상태가 달라 확인 전까지 표시하지 않습니다."
                  : "선호 조건을 자동으로 넓히지 않았습니다."}
            </p>
            <a className="primary-link" href="/">
              데모 공고 다시 보기
            </a>
          </div>
        )}
      </section>
    </main>
  );
}

function selectAllowed<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  fallback: string,
): T[number] {
  if (allowed.includes(value as T[number])) return value as T[number];
  return allowed.includes(fallback as T[number])
    ? (fallback as T[number])
    : allowed[0];
}
