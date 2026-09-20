# JobLens: 한국 개발자 공고 공급 가능성 점검

점검일: 2026-09-19 (Asia/Seoul). **결론: Greenhouse·Lever의 기업별 공개 피드만으로는 한국의 신입·주니어 백엔드/풀스택 구직자를 위한 유용한 자동 추천 MVP를 만들기에 표본이 부족하다.** 공개 GET은 기술적 접근 가능성을 뜻할 뿐, 제3자 집계·재게시 허락을 뜻하지 않는다. 아래에 적은 기업별 재사용 권한은 모두 **법적 재사용 미확인** 상태이다. 운영 서비스의 공고 목록으로 사용하기 전 권리자/플랫폼의 이용·표시 조건을 확인하거나 허가를 받아야 한다. [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Lever Postings API](https://github.com/lever/postings-api)

## 측정 방법과 판정 기준

- 2026-09-19에 공식 공개 API의 현재 **게시 목록**을 직접 GET했다. Greenhouse는 `GET /v1/boards/{board_token}/jobs?content=true`, Lever는 `GET /v0/postings/{site}?mode=json`을 사용했다. 이 둘은 **기업별 보드**이지 시장 전체를 검색하는 단일 공고 API가 아니다. Greenhouse의 `content=true`는 공고 설명을 포함하며, Lever JSON에는 상세 설명과 원문 URL이 들어간다. [Greenhouse API](https://docs.greenhouse.io/job-board.html), [Lever API](https://github.com/lever/postings-api)
- `한국`은 공고의 구조화된 위치에 `Korea`, `Seoul`, `Pangyo`, `Busan`, `Seongnam`, `Incheon`이 포함되는 경우로 좁혔다. 이는 한국 대상 원격 근무를 모두 포착하지 못하고, 반대로 복수 지역 공고를 한국 전용으로 간주하지 않는다. 위치 텍스트와 원문 조건을 다시 확인해야 한다. API에 남아 있는 것은 **현재 게시됨**의 증거이지 채용사가 실제로 지원을 계속 심사한다는 보증은 아니다. [Greenhouse API 필드](https://docs.greenhouse.io/job-board.html), [Lever API 필드](https://github.com/lever/postings-api)
- 추천 적합성은 (1) 한국에서 근무 가능, (2) 신입·주니어 또는 경력 제한 없음, (3) 백엔드/풀스택 업무 관련, (4) 현재 공식 보드에 게시됨, (5) 원문 지원 URL 있음, (6) 상세 요건을 읽을 수 있음, (7) 이용·표시 권한 확인 가능 여부를 **각각** 판정한다. 제목만으로 경력무관/직무 적합이라고 추정하지 않는다. `Senior`, `Staff`, `Principal`, 리드, 명시된 다년 경력, 인턴 전용은 신입·주니어 일반 추천에서 제외한다.
- 이 조사는 채용 시장 전체의 대표 표본이 아니다. 검색으로 발견한 13개 기업 보드를 확인한 **편의 표본**이다. 수치는 시점에 따라 달라지며, API 수집 원자료를 저장·배포하지 않았다.

## 직접 확인한 기업별 공개 피드

`한국 게시`는 위 위치 문자열에 걸린 모든 직군의 공고 수다. `실무상 후보`는 백엔드/풀스택에 닿지만 경력·언어 조건으로 추가 제외될 수 있는 예시다. 각 링크는 직접 조회한 공식 API다. 기업별 게시물의 상세 내용과 지원 원문은 해당 응답의 `absolute_url` 또는 `hostedUrl`로 확인했다. **13개 보드 모두 공개 GET 가능 / 제3자 집계·재게시 권한은 미확인.** [Greenhouse API](https://docs.greenhouse.io/job-board.html), [Lever API](https://github.com/lever/postings-api)

| 기업·ATS | 현재 보드 전체 | 한국 게시 | 백엔드/풀스택 관련 실무상 후보와 엄격한 판정 |
|---|---:|---:|---|
| [UJET / Greenhouse](https://boards-api.greenhouse.io/v1/boards/ujet/jobs?content=true) | 6 | 3 | [Full Stack 1건](https://job-boards.greenhouse.io/ujet/jobs/4709301005): 서울, 상세 요건·지원 URL 있음. **4년 이상** 요구 → 주니어 제외. 일반 지원·시니어 SRE는 제외. |
| [Commvault / Greenhouse](https://boards-api.greenhouse.io/v1/boards/commvault/jobs?content=true) | 61 | 5 | [Software Engineer - Backend](https://job-boards.greenhouse.io/commvault/jobs/5349251008) 1건은 인턴·개인 프로젝트 경험도 인정하고 시니어 멘토링을 언급 → 이 표본에서 가장 분명한 **주니어 백엔드 후보**. [Software Engineer - Automation](https://job-boards.greenhouse.io/commvault/jobs/5349236008)은 신입/1년 이상 가능하지만 자동화 직무 → 인접 후보, 백엔드로 오분류 금지. 나머지 3건은 Senior/Principal. |
| [Outschool / Greenhouse](https://boards-api.greenhouse.io/v1/boards/outschool/jobs?content=true) | 6 | 0 | 현재 API에서 한국 근무 공고 없음. 검색엔진에 남은 [한국 시니어 공고](https://job-boards.greenhouse.io/outschool/jobs/4714843006)를 API 현재 목록 대신 사용하면 안 됨. |
| [Speechify / Greenhouse](https://boards-api.greenhouse.io/v1/boards/speechify/jobs?content=true) | 255 | 4 | 서울·인천·성남·부산의 [Platform Software Engineer](https://job-boards.greenhouse.io/speechify/jobs/5974394004) 4건. 동일한 업무 설명의 지역별 게시물로 보이므로 추천 다양성은 **사실상 1개 역할**. TS/Node 백엔드 실무 역량 요구, 명시적 신입 공고 아님. Java/Spring 사용자에게 강한 매치로 간주하지 않음. |
| [Sonatus / Greenhouse](https://boards-api.greenhouse.io/v1/boards/sonatus/jobs?content=true) | 24 | 8 | 판교의 [Software Engineer - Customer Integration](https://job-boards.greenhouse.io/sonatus/jobs/5185301007), [Network](https://job-boards.greenhouse.io/sonatus/jobs/5191777007)는 C/C++·차량/임베디드 중심 → 웹 백엔드/풀스택 아님. Talent Community, Senior/Staff/DevOps 등도 제외. |
| [Palantir / Lever](https://api.lever.co/v0/postings/palantir?mode=json) | 313 | 5 | [Forward Deployed Software Engineer, New Grad](https://jobs.lever.co/palantir/341d5cae-a473-4813-9a6c-0f67fcc1b253)는 기술적으로 인접하지만 **2026/2027 졸업 예정자만** 지원 가능. 사용자 졸업 연도 불명이며, 일반 신입 백엔드 공고가 아님. FDSE 정규직 1건은 경력 제한 미표시이나 고객 현장형 직무; 인턴·전략 직무는 제외. |
| [Xsolla / Lever](https://api.lever.co/v0/postings/xsolla?mode=json) | 184 | 12 | [Senior Backend Korea](https://jobs.lever.co/xsolla/d8d92f79-ef44-463f-9c15-55a07e851fc9), [Senior Full-stack Korea](https://jobs.lever.co/xsolla/d0eedf1a-98b5-4bd9-9280-2903c0dd3bd8)는 직무 관련이지만 시니어. 나머지는 마케팅·BD·리드 등. |
| [Match Group / Lever](https://api.lever.co/v0/postings/matchgroup?mode=json) | 72 | 11 | [Senior Backend - Tinder Seoul](https://jobs.lever.co/matchgroup/ef27d211-c82d-4b28-acf4-b9154784a906)은 Java/Spring이지만 **5년 이상** 요구. 다른 한국 공고는 ML·분석·디자인·PM 등으로 일반 백엔드 주니어 후보 없음. |
| [Databricks / Greenhouse](https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=true) | 878 | 10 | 서울의 FDE/AI Engineer, 솔루션 아키텍트, 매니저 등이 대부분. 현재 목록에 일반 백엔드/풀스택 주니어 공고 없음. 예: [Forward Deployed Engineer](https://databricks.com/company/careers/open-positions/job?gh_jid=8540455002). |
| [Cloudflare / Greenhouse](https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs?content=true) | 380 | 0 | API의 구조화된 `location.name`에서 한국 문자열이 없음. [Seoul 언급이 있는 시니어 서비스 엔지니어 페이지](https://job-boards.greenhouse.io/cloudflare/jobs/8025521)는 위치가 `Hybrid`로만 표시되어 이 필터로 누락됨 → 위치 필터만으로 완전한 검색 불가. 백엔드 주니어 근거는 아님. |
| [Ultra Tendency / Greenhouse](https://boards-api.greenhouse.io/v1/boards/ultratendency/jobs?content=true) | 24 | 5 | 한국 공고는 시니어 데이터 엔지니어·Databricks 솔루션 아키텍트/컨설턴트로 분류. 예: [Senior Data Engineer](https://job-boards.eu.greenhouse.io/ultratendency/jobs/4961455101). 일반 웹 백엔드/풀스택 주니어 후보 없음. |
| [CASETiFY / Greenhouse](https://boards-api.greenhouse.io/v1/boards/casetify/jobs?content=true) | 60 | 3 | 한국 공고는 BD, 마케팅, 리테일 인턴. 예: [Marketing Manager](https://job-boards.greenhouse.io/casetify/jobs/6173276004). 개발 직무 0. |
| [Databento / Greenhouse](https://boards-api.greenhouse.io/v1/boards/databento/jobs?content=true) | 14 | 2 | 서울 포함 APAC 복수 지역 원격 공고는 영업, L1 기술지원. 예: [APAC Technical Support Engineer](https://job-boards.greenhouse.io/databento/jobs/7976254). 백엔드/풀스택 개발 0. |

이 편의 표본의 `한국 게시`는 **합계 68건**이지만, 한국에서 지원 가능한 **신입·주니어 백엔드/풀스택**으로 상세 요건까지 확인한 확실한 후보는 [Commvault Backend 1건](https://job-boards.greenhouse.io/commvault/jobs/5349251008)뿐이다. Commvault Automation은 직무가 다르고, Palantir New Grad FDSE는 졸업 연도 제한이 있으며, Speechify 지역별 4건은 사실상 같은 역할이고 신입 채용이라고 명시되지 않는다. 따라서 `68건`을 추천 가능한 `68개 일자리`로 제시하면 오도한다. [Commvault Backend](https://job-boards.greenhouse.io/commvault/jobs/5349251008), [Palantir New Grad](https://jobs.lever.co/palantir/341d5cae-a473-4813-9a6c-0f67fcc1b253), [Speechify Platform](https://job-boards.greenhouse.io/speechify/jobs/5974394004)

## 데이터 이용·표시 조건

- Greenhouse 문서는 GET 공개·인증 불필요, 기업의 **자체** 커리어 페이지 구축 용도를 설명한다. `absolute_url`과 `content` 제공은 확인되지만, 제3자인 JobLens가 여러 기업의 공고 본문을 수집·저장·재게시·AI 분석용으로 전달할 권리는 이 문서에서 확인되지 않았다. **법적 재사용 미확인.** [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Greenhouse API 개요](https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview)
- Lever 문서는 사이트가 기업별로 나뉘고, 해당 기업의 맞춤 채용 사이트 구축을 목적으로 하며, 브라우저 CORS도 회사 도메인에만 제공한다고 명시한다. 게시된 공고는 공개 열람 가능하지만, 이것이 제3자 집계·재게시 라이선스는 아니다. 서버에서 GET이 된다고 CORS 제한이나 이용 권한을 우회해도 된다는 의미가 아니다. **법적 재사용 미확인.** [Lever Postings API 공식 저장소](https://github.com/lever/postings-api), [Lever Developer Support](https://hire.lever.co/developer/support)
- 기업별 고유 공고 본문에도 별도 저작권·데이터 이용 조건이 있을 수 있다. 이 조사에서는 13개 기업 각각의 허가를 확인하지 않았다. 안전한 개발 단계는 공개 API 응답의 최소 메타데이터로 내부 기술 검증을 하고, 실제 공개 서비스/장기 저장/본문 표시 전에는 권한과 표시·삭제 요구를 확인하는 것이다. **최소 메타데이터만 표시하면 허가가 자동으로 생긴다는 뜻은 아니다.** [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Lever Postings API](https://github.com/lever/postings-api)

## MVP 판단과 다음 검증

1. **양적 판단: 불충분.** 이 표본만으로 한국 주니어 백엔드/풀스택 구직자에게 일관된 추천 목록을 제공할 수 없다. 기업별 피드는 시장 검색 서비스가 아니고, 한국 공고에서 직무·경력 필터를 거치면 후보가 거의 남지 않는다. 추천 엔진보다 **출처 확보와 사용 권한**이 선행되어야 한다.
2. **품질 판단: 원문과 상세 요건은 일부 충분.** Greenhouse의 `content=true`와 Lever 상세 JSON은 후보별 근거 비교에 필요한 설명을 제공할 수 있다. 그러나 지역별 중복, `Hybrid` 같은 모호한 위치, 졸업 연도·언어·비자·전공 요구를 필터링하지 않으면 허위 적합 추천이 생긴다. [Greenhouse API](https://docs.greenhouse.io/job-board.html), [Lever API](https://github.com/lever/postings-api), [Palantir New Grad](https://jobs.lever.co/palantir/341d5cae-a473-4813-9a6c-0f67fcc1b253)
3. **출시 게이트 제안:** 국내 근무 가능·현재 게시·신입/주니어·백엔드/풀스택 요건을 충족하는 **서로 다른 실제 공고 20건 이상**을 여러 출처에서 확보하고, 각각 원문 URL·상세 요건·표시/재사용 권한을 확인할 때까지 공개 서비스의 “실제 공고 자동 추천” 기능은 출시하지 않는다. 20건은 제품 판단을 위한 **제안 기준**이지 외부 자료의 사실이 아니다. 데이터가 모자라면 샘플로 UI를 검증하되 실제 공고 추천을 한다고 홍보하지 않는다.
4. **다음 조사:** 한국 기업 직접 채용 페이지/공식 오픈 API의 이용 조건을 우선 확인하고, 권리 확인 가능한 공급처를 넓힌 뒤 동일한 판정 기준으로 재집계한다. 검색엔진에 남은 오래된 페이지나 `leverdemo` 같은 테스트 보드는 현재 실제 채용으로 세지 않는다. [Outschool 현재 API](https://boards-api.greenhouse.io/v1/boards/outschool/jobs?content=true), [Lever 데모 보드](https://jobs.lever.co/leverdemo-8)

## 추가 확인: 고용24/공공데이터포털 API

- [공공데이터포털의 한국고용정보원 채용정보 목록·상세 API](https://www.data.go.kr/data/3038225/openapi.do)는 키워드·직종·지역·경력 등 검색 조건과 공고 URL·수정일 등을 제공한다고 설명한다. 이 데이터셋은 무료이고 개발·운영 단계 모두 `자동승인`으로 표시되어 있다. 이용허락은 `출처표시·비영리·변경금지(제4유형)`으로 적혀 있으므로, JobLens의 공고 요약/AI 분석/재게시 방식이 허락 범위에 드는지는 별도로 확인해야 한다. 링크가 존재한다는 이유만으로 2차 가공 권한을 추정하지 않는다.
- [고용24의 채용정보 API 명세](https://www.work24.go.kr/cm/e/a/0110/selectOpenApiSvcInfo.do?fullApiSvcId=000000000000000000000000000000)는 목록과 상세를 제공하며, 상세 화면에는 원문 사이트 이동 버튼과 지정된 링크를 반드시 노출하라고 안내한다. 따라서 실제 구현 시 출처 표시와 원문 이동 UX를 요구사항으로 잡아야 한다.
- 접근 자격에는 **공식 안내 간 불일치**가 있다. [고용24 OPEN-API 소개](https://www.work24.go.kr/cm/e/a/0110/selectOpenApiIntro.do)는 `기업회원 전용`, 담당자 심사 후 키 발급이라고 적지만, 공공데이터포털은 위 API에 `자동승인`을 표시하며 2025년 개인회원 개방 공지도 있다. 어느 경로로 개인 개발자 키를 받을 수 있는지는 실제 신청 화면 또는 운영기관 답변으로 확인할 필요가 있다. 지금은 키가 없어 실제 공고 수·신선도·상세 필드 충실도를 측정하지 않았다.
- **우선 검증 과제:** 사용자 계정으로 합법적 키 발급 가능 여부 → Java/Spring·백엔드·풀스택·신입/경력무관 조합의 현재 결과 수와 중복/마감 상태 측정 → 표시·AI 분석·보관 가능 범위 확인. 이 게이트를 통과하면 기업별 해외 ATS 피드보다 국내 MVP의 1차 공급원으로 유망하다. 이것은 가능성 평가이지 실제 공급 확보 완료 판정이 아니다.
