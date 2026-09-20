# 개인 개발자의 국내 다직종 채용공고 공급원 조사

조사일: 2026-09-19. 목표는 개인 개발자가 JobLens에서 **현재 모집 중인 국내 다직종 공고를 자동 추천**할 때 쓸 수 있는 합법적·지속 가능한 공급원이다. 공개 페이지를 읽을 수 있다는 사실과 제3자 서비스에서 수집·저장·재게시·AI 분석할 권한은 구분했다. 조사 당시 계정 생성, 키 신청, 실제 API 호출은 하지 않았다. 아래 후속 검증은 사용자가 제공한 키로 별도 수행했다.

## Jooble 한국 API 후속 연결 검증

2026-09-19에 사용자가 제공한 한국 지역 키를 **저장하거나 출력하지 않고** REST API를 세 번 조회했다. `사무`/`대한민국`은 HTTP 200, `totalCount=10`, 첫 페이지 3건을 반환했다. `개발자`/`대한민국`은 HTTP 200, `totalCount=71`, 첫 페이지 3건을 반환했다. `간호`/`대한민국`은 HTTP 200, `totalCount=0`이었다. 응답의 확인된 필드는 `title`, `location`, `snippet`, `salary`, `source`, `type`, `link`, `company`, `updated`, `id`다. 이는 **키와 한국 엔드포인트의 기술적 연결만 검증**하며, 전체 다직군 커버리지·공고 실제 모집 상태·재게시/AI 사용 허락을 증명하지 않는다. 무료 플랜이라면 이 세 요청도 [평생 500회 한도](https://help.jooble.org/en/support/solutions/articles/60001448238)에 포함될 수 있다. 재현용 [검증 스크립트](../../scripts/verify-jooble.mjs)는 `JOOBLE_API_KEY` 환경변수에서 키를 읽고 요청 URL과 키를 출력하지 않는다.

## 결론

고용24 개인 신청이 어렵다면, **[공공데이터포털의 경기도 잡아바 채용정보 API](https://www.data.go.kr/data/15119896/openapi.do)를 첫 번째로 검증**하는 것이 좋다. 공식 목록에는 기업명·공고명·급여·경력·학력·모집분야·접수기간·원문 링크가 있고, 비용 무료·이용허락범위 제한 없음·**개발단계 자동승인 / 운영단계 심의승인**으로 표시된다. 채용 직군은 개발에 한정되지 않는다. 다만 개인 계정에서 실제 키가 발급되는지, 현재 모집 중인 공고가 얼마나 반환되는지, 공고 전문이 제공되는지는 아직 확인하지 못했다. 해당 API의 공고 **메타데이터 이용허락**을 원문 사이트의 상세본문 무단 수집·재게시 허락으로 확대 해석해서는 안 된다. 공식 [잡아바 공고 페이지](https://job.gg.go.kr/empmn/jobEntDtl.do?seq=12885)에는 무단복제·배포 금지 고지가 있다.

**[Jooble 한국 API](https://kr.jooble.org/api/about)는 두 번째 민간 후보**다. 이름·직책·이메일·웹사이트·전화번호 양식으로 키 요청을 받고, 검색 결과를 자신의 웹사이트에 표시하는 용도를 명시한다. 회사 사업자번호를 요구하는 항목은 공개 양식에 보이지 않는다. 그러나 실제 개인 승인 여부는 확인되지 않았다. [Jooble API 문서](https://help.jooble.org/en/support/solutions/articles/60001448238)는 지역별 키, 결과 필드와 **무료 키당 평생 500회 요청**을 명시한다. 결과에는 제목·회사·지역·짧은 설명·링크·갱신 시각이 있지만 공고 전문은 없다. 검색용 초기 후보에는 적합할 수 있어도, 이력서와 공고를 깊이 비교하는 단독 데이터원으로는 부족하다.

권리 범위가 주요 미해결점이다. [API 안내](https://kr.jooble.org/api/about)는 자체 웹사이트 표시를 허용하는 취지지만, [일반 이용약관](https://kr.jooble.org/info/terms)은 사전 서면 승낙 없는 재게시를 금하고 자동 수집도 제한한다. API 계약이 일반 약관에 대해 어디까지 예외인지, 검색 결과의 캐싱·AI 가공·유료 서비스 활용이 허용되는지 Jooble에 서면 확인해야 한다. API를 이용하지 않는 Jooble 사이트 스크래핑은 대안이 아니다. 한국 사이트에는 [개발](https://kr.jooble.org/%EA%B5%AC%EC%A7%81-java-%EA%B0%9C%EB%B0%9C-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4/%EC%84%9C%EC%9A%B8) 외 [간호](https://kr.jooble.org/%EA%B5%AC%EC%A7%81-%EA%B0%84%ED%98%B8%EC%A1%B0%EB%AC%B4%EC%82%AC/%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD)·[조리](https://kr.jooble.org/%EA%B5%AC%EC%A7%81-%EB%B3%91%EC%9B%90%EA%B8%89%EC%8B%9D-%EC%A1%B0%EB%A6%AC%EC%82%AC) 등 여러 직군의 검색 페이지가 있으나 API 결과의 양·최신성·중복률은 키 없이 검증하지 못했다.

## 보조 후보와 한계

| 공급원 | 개인 접근·범위 | 판정 |
| --- | --- | --- |
| [잡알리오 오픈데이터](https://opendata.alio.go.kr/new/odaApiMbrinfo/join.do) | 공식 회원가입과 API 신청 경로가 있다. 공공기관 채용에 한정된다. | 개인 키 발급과 데이터 재게시·AI 가공 범위를 확인하면 보조 공급원. 민간 다직종 전체를 대체하지 못한다. [이용약관](https://opendata.alio.go.kr/new/odaApiMbrinfo/join.do)의 영리 이용 제한도 확인 필요. |
| [경기데이터드림 ‘잡아바 채용정보’](https://data.gg.go.kr/portal/data/service/selectServicePage.do?infId=BF99Q5LCFU0G5XMU9B8L31468278&infSeq=2) | [인증키 자동 발급 절차](https://data.gg.go.kr/portal/openapi/usagePage.do)는 개인 개발자에게 접근 가능해 보인다. | **위 공공데이터포털 API와 별도 등록 페이지**다. 현재 공개 상세 페이지의 이력은 2015-12-31이고 요청 주소·출력 필드·샘플 URL이 비어 있다. 이 경로는 실시간 공급원으로 간주 불가. |
| [Remotive 공개 API/RSS](https://remotive.com/remote-jobs/api) | 키 없이 여러 직군의 원격 공고를 표시할 수 있고, Remotive 출처와 링크를 요구한다. [RSS 안내](https://remotive.com/remote-jobs/rss-feed)는 카테고리를 나열한다. | 국내 현장·하이브리드 공고를 대체하지 못한다. [일반 약관](https://remotive.com/terms-of-use)의 재배포 제한과 API별 허용 범위를 함께 검토해야 한다. 가입을 가로막고 공고를 보여주는 사용은 API 안내에서 금지한다. |
| [회사 직접 제출·동의](https://developers.google.com/search/docs/appearance/structured-data/job-posting) | 회사가 자기 공고의 URL·본문·마감일을 제출하고, JobLens 내 표시·추천·요약 권리를 명시적으로 허락하는 경로를 설계할 수 있다. | 법적 범위가 명확해지고 직군 제한이 없지만 초기 공급량 확보가 느리다. `JobPosting` 구조화 데이터는 회사 공고 페이지의 필드를 정리하는 표준적 방법이지, 타 사이트의 공고를 가져올 수 있는 라이선스가 아니다. |
| 기업별 Greenhouse/Lever 피드 | [Lever 공식 문서](https://github.com/lever/postings-api)는 회사별 공개 게시 공고를 가져오는 API를 설명한다. | 개발·일부 대기업 쏠림과 국내 신입 공고 부족은 [선행 표본 조사](job-source-feasibility.md)에 기록했다. 공개 GET 자체가 제3자 재게시 권한은 아니다. 기업별 허락 또는 이용조건 확인 필요. |

## 제외하거나 오해하기 쉬운 경로

- [Google Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)는 신규 고객에게 닫혔고 2027-01-01 종료 예정이므로 새로운 핵심 공급원으로 부적합하다.
- [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/using-api)는 소유한 공고 페이지의 추가·삭제를 Google에 알리는 용도이지 타사 공고 검색/수집 API가 아니다.
- [LinkedIn 채용 약관](https://www.linkedin.com/legal/jobs-terms-conditions)은 명시적 서면 허락 없는 자동 데이터 추출을 금지한다. [Job Posting API](https://www.linkedin.com/legal/l/job-posting-api-terms)도 승인된 게시 관리 통합용으로, 공고 검색 공급원이 아니다.
- 고용24는 공공데이터포털의 자동승인 표시보다 **사용자에게 실제 안내된 개인 신청 불가**를 우선한다. 개인 가능성이 재확인되기 전까지 실현 가능한 후보로 잡지 않는다.

## 다음 검증 순서

1. 공공데이터포털의 잡아바 API에 개인 계정으로 **개발용 키 발급이 실제 가능한지** 확인한다. 키를 받으면 소수의 표본 호출로 현재 모집 중 여부, 직군 다양성, 원문 URL, 중복, 설명 길이, 갱신 시각을 검증한다. 운영 단계는 심의가 필요하므로 개발 키만으로 공개 서비스 운영을 약속하지 않는다.
2. Jooble 한국 API 담당자에게 개인 개발자 키 가능 여부, 500회 이후 요금/증량, AI 추천·요약·캐싱·출처 표시·상업 공개 범위를 한 번에 문의한다. 답변 전에는 공개 서비스에 연동하지 않는다.
3. 잡알리오로 공공기관 공고를 보완하고, 민간 공고는 회사 직접 제출 및 명시 동의 경로를 연다. 두 경로 모두 권리·마감일 확인을 기록한다.
4. 세 경로로도 추천 가능한 실제 공고 수가 부족하면 ‘전 직군 자동 추천’ 출시를 약속하지 않는다. 직군·지역을 제한하거나, 공식 데이터 제휴를 확보한 뒤 확대한다.
