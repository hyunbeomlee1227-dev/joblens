# Only use approved Job Source integrations

Status: superseded by ADR-0006 for the primary discovery workflow. The prohibition on unapproved scraping remains in force.

JobLens recognizes JobKorea, Saramin, and Wanted URLs but retrieves metadata automatically only through an approved official API or explicit permission. Unsupported or unapproved content collection falls back to candidate-reviewed paste input, and the service does not use headless browsers to bypass access or rendering restrictions.

## Consequences

- Transient failures from approved integrations receive at most one retry.
- Authentication, authorization, policy, and unsupported-source failures immediately fall back to paste input.
- Saramin is the first API integration candidate; JobKorea and Wanted adapters remain disabled until approved access exists.
