# 서울시 일자리포털 채용정보 API(OA-23047) 검증

검증일: 2026-09-19. 범위는 서울 열린데이터광장의 [데이터셋 상세](https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do), [공식 API 이용안내](https://data.seoul.go.kr/together/guide/useGuide.do), [공식 API 사용 FAQ](https://data.seoul.go.kr/together/notice/faqList.do?bbsCd=10002&ditcCd=FAQ02&seq=d47bc57aea53d6c6ab244c05a6eb2259), 공식 메타데이터 및 응답이다. 인증키 값은 기록하지 않았다.

## 연결과 데이터 범위

- 데이터셋의 Open API 고유 서비스명은 `recMntList`이다. [데이터셋 상세](https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do)의 Open API 세부 명세가 사이트의 [`openApiView.do` 메타데이터 응답](https://data.seoul.go.kr/dataList/openApiView.do?infId=OA-23047&srvType=A)으로 제공된다. 이 경로는 `POST` 요청과 `infId=OA-23047`, `srvType=A` 등의 form 인자를 사용하므로, 링크를 단순히 브라우저에서 여는 것만으로 세부 표가 보이지 않을 수 있다.
- 공식 샘플 호출 `http://openapi.seoul.go.kr:8088/sample/json/recMntList/1/5/`에서 HTTP 200, `RESULT.CODE=INFO-000`, `list_total_count=42758` 및 5개 행을 확인했다. **전체 건수는 현재 접수 중인 공고 수가 아니다.** 마감일을 검사하기 전에는 활성 공고 규모로 제시하지 않는다. `sample` 인증키는 첫 5건 이내에서만 사용할 수 있다고 [공식 FAQ](https://data.seoul.go.kr/together/notice/faqList.do?bbsCd=10002&ditcCd=FAQ02&seq=d47bc57aea53d6c6ab244c05a6eb2259)에 명시되어 있다.
- 발급받은 개인 인증키로 6건 요청도 성공했다. 이 사실은 API 연결과 해당 키의 기본 동작만 증명한다. 공개 운영 허가, 전체 페이지 수집, 사용량 한도, 공고 재게시 권한까지 증명하지는 않는다.
- 데이터셋은 고용24에서 받아온 공고를 서울시 일자리포털이 제공하며, 지역은 **서울·경기·인천**이라고 설명한다. 직종을 개발직으로 제한하지 않는다. 제목·경력·등록일·마감일·고용형태·임금·접수방법 등을 제공한다. 공개일은 2026-08-21, 표시된 갱신주기는 `매일1회`, 2026-09-19 조회 시 메타데이터의 데이터 갱신일은 **2026-09-16**이었다. 따라서 매일 갱신 표기만으로 실시간성 또는 당일 공고 반영을 보장할 수 없다. [공식 데이터셋 설명](https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do)

## 응답 필드와 원문 연결

샘플 응답에서 회사·제목·경력·등록일·마감일·지역(`COMPANY`, `TITLE`, `CAREER`, `REG_DT`, `CLOSE_DT`, `REGION`)과 직무·업무내용(`JOBS_NM`, `JOB_CONT`), 고용형태·급여·접수방법(`EMP_TP_NM`, `SAL_TP_NM`, `RCPT_MTHD`) 등을 확인했다. 교육·주소·근무시간·복지·연락처 관련 필드와 일부 코드값도 있다. 이는 [공식 데이터셋 설명](https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do)의 제공 항목과 대체로 일치한다.

반면 샘플 응답 필드 목록에는 **원문 공고 URL, 서울시 상세페이지 URL, 고용24 공고 식별자, 이 데이터셋의 고유 행 ID가 없다.** 그러므로 `wantedAuthNo` 같은 값을 추측해 상세 URL을 조립하면 안 된다. 제품에서는 이 공급원을 채용정보·추천 점수에 쓰더라도 지원 버튼의 정확한 원문 링크는 별도 확인 전까지 제공할 수 없다고 표시해야 한다. 회사명·제목으로 원문을 검색하는 기능을 만들더라도 동명이공고와 모집기간 변경을 검증해야 한다. (근거: 위 공식 샘플 응답과 [공식 API 세부 명세](https://data.seoul.go.kr/dataList/openApiView.do?infId=OA-23047&srvType=A))

## 호출·페이지·한도

- [공식 FAQ](https://data.seoul.go.kr/together/notice/faqList.do?bbsCd=10002&ditcCd=FAQ02&seq=d47bc57aea53d6c6ab244c05a6eb2259)는 기본 GET 형식을 `요청주소/인증키/파일형식/영문서비스명/시작위치/종료위치/{검색어}`로 설명한다. `recMntList`에 공고 키워드·지역·직종을 서버 측에서 필터링하는 추가 검색 인자가 있는지는 확인되지 않았다. 정해진 범위로 페이지를 가져와 애플리케이션 측에서 필터링하는 것으로 우선 설계한다.
- [공식 이용안내](https://data.seoul.go.kr/together/guide/useGuide.do)는 한 번에 최대 **1,000건** 요청할 수 있으며 그보다 많으면 나누어 호출하라고 한다. 예시로 든 **하루 1,000건 요청 한도는 실시간 지하철 API에 관한 설명**이므로 `recMntList`의 일일 호출 한도로 일반화할 수 없다. 이 서비스의 별도 일일 한도는 미확인이다.
- 공식 예제의 호스트는 `http://openapi.seoul.go.kr:8088`로 **평문 HTTP**이다. 실제 `https://openapi.seoul.go.kr:8088` 접속은 TLS 오류가 났다. 인증키가 URL 경로에 들어가므로 HTTPS를 지원하지 않는 endpoint에 서버에서 직접 운영키를 보내면 전송 구간 노출 위험이 있다. 사용자 브라우저에서 직접 호출하거나 프런트 코드에 키를 넣는 것은 피하고, HTTPS 지원 여부 또는 공식 대체 접속 주소를 제공기관에 확인한 뒤 운영 연결을 결정한다. [공식 이용안내](https://data.seoul.go.kr/together/guide/useGuide.do)

## 이용허락 표기 충돌

[데이터셋 사람이 읽는 상세 화면](https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do)은 `이용제한없음 : 자유이용`, `공공누리 0유형 : 자유이용 (출처미표기)`, `제3저작권자 없음`으로 표시한다. 그러나 서울시 자체 [Open API 서비스 목록 API](https://data.seoul.go.kr/dataList/OA-2250/A/1/datasetView.do)를 `SearchOpenDataServiceList`로 OA-23047만 조회했을 때 SHEET와 OPENAPI 두 항목 모두 `INF_CCL_NM=자유이용 불가`로 반환되었다. 두 공식 표기가 충돌하므로 어느 하나를 조용히 무시해서는 안 된다. 특히 고용24가 원천이라는 사실까지 고려해, **대외 공개·캐시·AI 요약·재게시의 허용범위를 서울시 담당 부서에 확인하기 전에는 운영상 허가를 확정하지 않는다.** 이 판단은 보수적인 제품·법적 리스크 관리이며, API 호출 성공 여부와 별개다. [데이터셋 담당 부서 및 연락처](https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do)

## 다음 검증

1. 서울시 문의에 OA-23047의 상세 화면과 목록 API 이용허락 값이 왜 다른지, JobLens 화면에서 제목·회사·설명 일부를 재표시하고 개인화 추천에 사용하는 것이 허용되는지 확인한다.
2. 공식 HTTPS endpoint, 키의 호출량 제한, 운영 서비스에 필요한 활용사례 등록 여부를 확인한다. [공식 이용안내](https://data.seoul.go.kr/together/guide/useGuide.do)는 지속 사용 시 활용사례 등록을 안내한다.
3. 응답의 마감일 형식과 만료 공고 포함 여부, 페이지 순서의 안정성, 중복 제거 기준, 원문 상세 URL 또는 공식 식별자를 문의한다. 원문 링크가 없다면 정확한 지원 링크를 요구하는 추천 카드에서는 이 공급원을 제한한다.

결론: **연결은 성공했고 국내 다직군 데이터를 확보할 수 있지만, 원문 링크 부재·허락 표기 충돌·평문 HTTP 때문에 아직 운영 연결 완료로 간주할 수 없다.**
