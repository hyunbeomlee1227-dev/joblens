# Combine independently authorized Job Sources

JobLens will combine multiple Job Sources behind one discovery interface because no verified single source covers current Korean openings across all occupations. Each source is activated separately only after access, attribution, display, retention, and analysis rights are verified; a source's technical availability is not authorization. The first candidates to validate are the Gyeonggi Jobaba feed, JOB-ALIO public-sector feed, and Jooble Korea, but none is considered connected or approved yet.

## Consequences

- Each adapter returns Job Listings with source identity, source record ID, original URL, observed time, closing time when available, and only fields that source is permitted to supply. Missing fields stay unknown; they are not inferred.
- The discovery module filters closed or stale listings, deduplicates cross-posted openings, and records which source supplied each recommendation. Failure or quota exhaustion in one adapter must not be presented as an empty job market.
- A Job Listing with only metadata or a snippet can appear in the recommendation list as a clearly marked Limited Recommendation. Reasons are restricted to supplied listing facts and Job Preferences; missing requirements must not be presented as resume matches. A deeper Analysis Job requires an authorized full Job Posting or candidate-reviewed posting text.
- Jobaba development auto-approval does not replace its operational review; Jooble key, quota, caching, and AI-use terms need confirmation; JOB-ALIO's scope is public institutions. Unverified adapters remain disabled in a public deployment.
- The initial public discovery area is Seoul, Gyeonggi, and Incheon across multiple occupations. Public automatic recommendations wait for at least one authorized source with current Job Listings and verifiable original links; if none qualifies, fixtures are labeled as a demo rather than live recommendations.
- The first release applies the Candidate's chosen role, region, and work arrangement as strict filters. It does not silently widen them or include overseas remote jobs; when no listings remain, it explains the empty result and lets the Candidate change their preferences.
- Listings with expired closing dates or without a verifiable open recruitment status are excluded from automatic recommendations, even if that reduces the result count.
- A Listing Report is available to authenticated Candidates; it prompts revalidation and can hide a suspect listing while its status is checked. Visitors can browse listings without signing in.
