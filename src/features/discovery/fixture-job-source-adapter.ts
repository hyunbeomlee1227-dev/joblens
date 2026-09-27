import type { JobSourceAdapter } from "./job-source-adapter";
import type { JobSourceIdentity } from "./job-source-identity";
import { defineJobSourcePermission } from "./job-source-permission";
import type { JobSourcePermission } from "./job-source-permission";
import {
  knownField,
  type JobListing,
  type JobListingProvenance,
  unknownField,
} from "./job-listing";

const source = {
  id: "joblens-demo",
  name: "JobLens Demo",
} as const;

const permission = defineJobSourcePermission({ display: true });

type RawFixtureListing = {
  sourceRecordId: string;
  originalUrl: string;
  employer?: string;
  title?: string;
  location?: string;
  occupation?: string;
  workArrangement?: string;
  observedAt: string;
  closesAt?: string;
  summary?: string;
  highlights?: readonly string[];
};

function createFixtureListing(
  raw: RawFixtureListing,
  listingSource: JobSourceIdentity = source,
  listingPermission: JobSourcePermission = permission,
): JobListing {
  const provenance: JobListingProvenance = {
    source: listingSource,
    permission: listingPermission,
    sourceRecordId: raw.sourceRecordId,
    originalUrl: raw.originalUrl,
    originalLinkEvidence: {
      kind: "verified",
      method: "fixture",
      verifiedAt: raw.observedAt,
    },
    observedAt: raw.observedAt,
  };
  const sourced = <T>(value: T | undefined) =>
    value === undefined ? unknownField() : knownField(value, provenance);

  return {
    id: `${listingSource.id}--${raw.sourceRecordId}`,
    sourceRecordId: raw.sourceRecordId,
    originalUrl: raw.originalUrl,
    employer: sourced(raw.employer),
    title: sourced(raw.title),
    location: sourced(raw.location),
    occupation: sourced(raw.occupation),
    workArrangement: sourced(raw.workArrangement),
    observedAt: raw.observedAt,
    recruitment: {
      status: "open",
      closesAt: sourced(raw.closesAt),
      evidence: {
        kind: "source-status",
        provenance: [provenance],
      },
    },
    provenance: [provenance],
    summary: sourced(raw.summary),
    highlights: sourced(raw.highlights),
  };
}

const fixtureJobListings = [
  createFixtureListing({
    sourceRecordId: "fixture-backend-engineer",
    originalUrl: "https://example.com/jobs/backend-engineer",
    employer: "샘플 테크",
    title: "백엔드 엔지니어",
    location: "서울 강남구",
    occupation: "백엔드 개발",
    workArrangement: "주 3일 오피스",
    observedAt: "2026-09-21T00:00:00.000Z",
    closesAt: "2026-10-18T14:59:59.000Z",
    summary:
      "Spring 기반 서비스의 API와 데이터 흐름을 함께 개선하는 합성 채용공고입니다.",
    highlights: [
      "Java와 Spring 기반 API 개발",
      "관계형 데이터베이스 모델링",
      "테스트와 배포 자동화 경험",
    ],
  }),
  createFixtureListing({
    sourceRecordId: "fixture-frontend-engineer",
    originalUrl: "https://example.com/jobs/frontend-engineer",
    employer: "예시 스튜디오",
    title: "프론트엔드 엔지니어",
    location: "경기 성남시",
    occupation: "프론트엔드 개발",
    workArrangement: "하이브리드",
    observedAt: "2026-09-21T00:00:00.000Z",
    summary:
      "사용자가 복잡한 정보를 빠르게 이해하도록 웹 경험을 설계하는 합성 채용공고입니다.",
    highlights: [
      "React와 TypeScript 기반 화면 개발",
      "디자인 시스템 컴포넌트 구현",
      "웹 접근성과 성능 개선",
    ],
  }),
  createFixtureListing({
    sourceRecordId: "fixture-product-operations",
    originalUrl: "https://example.com/jobs/product-operations",
    employer: "데모 커넥트",
    title: "서비스 운영 매니저",
    location: "인천 연수구",
    occupation: "서비스 운영",
    observedAt: "2026-09-21T00:00:00.000Z",
    closesAt: "2026-10-25T14:59:59.000Z",
    summary:
      "고객 피드백과 운영 지표를 바탕으로 서비스 프로세스를 개선하는 합성 채용공고입니다.",
    highlights: [
      "고객 문의 및 운영 지표 분석",
      "유관 부서와 개선 과제 조율",
      "운영 정책과 가이드 문서화",
    ],
  }),
] satisfies readonly JobListing[];

const partnerSource = {
  id: "partner-demo",
  name: "Partner Demo",
} as const;
const partnerPermission = defineJobSourcePermission({ display: true });
const partnerFixtureJobListings = [
  createFixtureListing(
    {
      sourceRecordId: "partner-backend-engineer",
      originalUrl: "https://example.com/jobs/backend-engineer",
      employer: "샘플 테크",
      title: "백엔드 엔지니어",
      location: "서울 강남구",
      occupation: "백엔드 개발",
      workArrangement: "주 3일 오피스",
      observedAt: "2026-09-21T00:00:00.000Z",
      closesAt: "2026-10-18T14:59:59.000Z",
      summary:
        "Spring 기반 서비스의 API와 데이터 흐름을 함께 개선하는 합성 채용공고입니다.",
      highlights: [
        "Java와 Spring 기반 API 개발",
        "관계형 데이터베이스 모델링",
        "테스트와 배포 자동화 경험",
      ],
    },
    partnerSource,
    partnerPermission,
  ),
] satisfies readonly JobListing[];

export const fixtureJobSourceAdapter: JobSourceAdapter = {
  source,
  permission,
  async listListings() {
    return fixtureJobListings;
  },
};

export const partnerFixtureJobSourceAdapter: JobSourceAdapter = {
  source: partnerSource,
  permission: partnerPermission,
  async listListings() {
    return partnerFixtureJobListings;
  },
};
