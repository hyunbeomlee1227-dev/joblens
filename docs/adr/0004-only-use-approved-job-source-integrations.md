# Only use approved Job Source integrations

Status: superseded by ADR-0006 for discovery and by ADR-0014 for source-specific use permissions. The prohibition on unapproved scraping remains in force; the historical paste fallback below is retired from the current product scope.

This ADR previously proposed recognizing JobKorea, Saramin, and Wanted URLs and falling back to candidate-reviewed Job Posting paste when approved retrieval was unavailable. That paste fallback is no longer part of JobLens; ADR-0006 makes authorized discovery the primary workflow and ADR-0014 prevents user input from bypassing source-specific permissions. The prohibition on headless-browser bypass remains.

## Consequences

- Transient failures from approved integrations receive at most one retry.
- Authentication, authorization, policy, and unsupported-source failures do not enable a paste or scraping fallback.
- JobKorea, Saramin, and Wanted adapters remain disabled until approved access and use permissions exist.
