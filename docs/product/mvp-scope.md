# JobLens public MVP scope

Status: draft for owner confirmation (2026-09-20).

## Experience

- Visitors can browse currently open Job Listings without signing in. The first geographic scope is Seoul, Gyeonggi, and Incheon across occupations; overseas remote jobs are excluded.
- A Candidate signs in with Google to select Job Preferences, review and sanitize a Resume, receive Job Recommendations, bookmark listings, inspect Recommendation History, and submit Listing Reports.
- Candidates can upload a Korean or English PDF (up to 10 MB and 10 pages) for browser-side text extraction and OCR, or paste resume text. Every route requires Extraction Review and approval before the Sanitized Resume leaves the browser. The original document stays in the browser.
- Role, region, work arrangement, source authorization, original-link availability, and verifiable open recruitment status are deterministic filters. The app does not widen Job Preferences silently; it explains empty results and lets the Candidate change them.
- Short-snippet listings may appear as Limited Recommendations labeled `상세요건 미확인`. Reasons use only supplied listing facts and selected preferences; the app does not claim unprovided requirements match the Resume. Deep Analysis Jobs require authorized full posting content or Candidate-reviewed pasted posting text.

## Saved data and deletion

- Bookmarked Job Listings remain until the Candidate deletes them, including after closure, provided source retention terms allow it. Closed listings are marked closed rather than recommended again.
- Recommendation History stores listing identity, original link, preferences, reasons, and only the approved Resume excerpts cited as evidence. Entries expire after 180 days or can be deleted individually. Full Sanitized Resumes, original documents, and deep Analysis Results are not retained.
- Temporary resume content is deleted after successful, failed, or cancelled processing, with a short automatic expiry for abandoned work. Account self-deletion removes sessions, bookmarks, and remaining Recommendation History.

## Public release gates

- At least one Job Source must authorize the intended display, retention, and analysis use and supply currently open listings with verifiable original links. Until then, fixtures are clearly marked as a demo; real automatic recommendations are not publicly claimed. Seoul OA-23047 remains a connectivity proof, not an approved public source, because its permission metadata conflicts and it lacks original links.
- Bedrock handles evidence explanations only. Real Candidate content is sent to a model/API verified to support zero retention with in-Region processing in Seoul (`ap-northeast-2`); otherwise AI analysis stays unavailable. The Candidate is told approved text will be sent to AWS. Deterministic filtering remains outside AI.
- Per-Candidate daily analysis limits, spending alerts, and an application-level paid-analysis kill switch are in place before public access. Budget alerts alone are not treated as a hard cap. Listings remain browsable if paid analysis is disabled.
- Candidates can report a stale or incorrect listing. Reports trigger revalidation rather than automatic deletion.

## Validation still required

- Source-by-source usage terms, API quotas, attribution, cache/retention rights, and reliable original-link and open-status fields.
- A suitable Seoul in-Region Bedrock model and account-level zero-retention setting, including Korean output quality and actual invocation behavior.
- Measured per-analysis cost and request rate before setting numeric daily limits and spending thresholds.
- Data deletion tests, history access-control tests, stale-listing handling, and account deletion behavior.
