import type { JobListing } from "./job-listing";

const fixtureJobListings = [
  {
    id: "backend-engineer",
    title: "백엔드 엔지니어",
    company: "샘플 테크",
    provenance: {
      jobSourceId: "joblens-demo",
      jobSourceName: "JobLens Demo",
      sourceRecordId: "fixture-backend-engineer",
      originalUrl: "https://example.com/jobs/backend-engineer",
      observedAt: "2026-09-21T00:00:00.000Z",
    },
    region: "서울 강남구",
    occupation: "백엔드 개발",
    workArrangement: "주 3일 오피스",
    recruitmentStatus: "open",
    closesAt: "2026-10-18T14:59:59.000Z",
    closingLabel: "2026년 10월 18일 마감",
    summary:
      "Spring 기반 서비스의 API와 데이터 흐름을 함께 개선하는 합성 채용공고입니다.",
    highlights: [
      "Java와 Spring 기반 API 개발",
      "관계형 데이터베이스 모델링",
      "테스트와 배포 자동화 경험",
    ],
  },
  {
    id: "frontend-engineer",
    title: "프론트엔드 엔지니어",
    company: "예시 스튜디오",
    provenance: {
      jobSourceId: "joblens-demo",
      jobSourceName: "JobLens Demo",
      sourceRecordId: "fixture-frontend-engineer",
      originalUrl: "https://example.com/jobs/frontend-engineer",
      observedAt: "2026-09-21T00:00:00.000Z",
    },
    region: "경기 성남시",
    occupation: "프론트엔드 개발",
    workArrangement: "하이브리드",
    recruitmentStatus: "open",
    closesAt: null,
    closingLabel: "채용 시 마감",
    summary:
      "사용자가 복잡한 정보를 빠르게 이해하도록 웹 경험을 설계하는 합성 채용공고입니다.",
    highlights: [
      "React와 TypeScript 기반 화면 개발",
      "디자인 시스템 컴포넌트 구현",
      "웹 접근성과 성능 개선",
    ],
  },
  {
    id: "product-operations",
    title: "서비스 운영 매니저",
    company: "데모 커넥트",
    provenance: {
      jobSourceId: "joblens-demo",
      jobSourceName: "JobLens Demo",
      sourceRecordId: "fixture-product-operations",
      originalUrl: "https://example.com/jobs/product-operations",
      observedAt: "2026-09-21T00:00:00.000Z",
    },
    region: "인천 연수구",
    occupation: "서비스 운영",
    workArrangement: "오피스",
    recruitmentStatus: "open",
    closesAt: "2026-10-25T14:59:59.000Z",
    closingLabel: "2026년 10월 25일 마감",
    summary:
      "고객 피드백과 운영 지표를 바탕으로 서비스 프로세스를 개선하는 합성 채용공고입니다.",
    highlights: [
      "고객 문의 및 운영 지표 분석",
      "유관 부서와 개선 과제 조율",
      "운영 정책과 가이드 문서화",
    ],
  },
] as const satisfies readonly JobListing[];

export function listFixtureJobListings(): readonly JobListing[] {
  return fixtureJobListings;
}

export function findFixtureJobListing(id: string): JobListing | undefined {
  return fixtureJobListings.find((listing) => listing.id === id);
}
