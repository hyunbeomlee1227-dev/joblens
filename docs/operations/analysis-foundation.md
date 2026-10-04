# Analysis Job foundation

Issue #8 adds a browser/BFF Analysis Job boundary. Public discovery and Resume
preparation continue while paid analysis is disabled. Live model integration,
citation results, recommendation batches and their final numeric limits belong
to #9, #10 and #16.

## Public contracts

- `POST /api/analysis`: same-origin, authenticated, CSRF-protected explicit action.
  Accepts a job ID, approved Sanitized Resume, Resume Version, listing ID and a
  `batch`, `retry` or `deep` kind. Candidate ownership comes from the server session.
  The browser cannot submit a Job Posting or choose source permission.
- `GET /api/analysis/allowance`: Candidate-owned usage, KST reset time and activation
  state; no Resume content. All responses use `Cache-Control: no-store`.
- `POST /api/analysis/cancel`: only the owning Candidate can cancel an active job.
  Browser cancellation also aborts the fetch; navigation/unmount/page close sends
  a best-effort cancellation without Resume content. Late responses are discarded.

## Privacy and accounting

Request input is limited to 256 KiB and Resume text to 100,000 characters. Parsing,
permission resolution, ledger access and invocation share a maximum 15-minute
deadline. Parsed request fields, byte buffers and mutable provider input are
cleared on completion, failure or cancellation; the provider receives an abort
signal and must honor it without retaining or logging data. The job registry
contains only opaque job IDs, Candidate ownership and abort controllers.

The allowance ledger receives only Candidate subject, day, job ID, configured
limit and expiry. DynamoDB atomically writes a leased reservation and increments that day's
counter, with a Candidate-deletion gate. Duplicate attempt IDs and full allowance
reject dispatch. A cancelled reservation before model dispatch is refunded
idempotently; started calls retain their charge on error, cancellation or timeout.
Refund intent is persisted as accounting metadata before reversal; a failed
reversal is replayed by the next allowance read or reservation, including after
workload replacement. Expired, still-reserved attempts are reclaimed with a conditional
transaction, even if the initial refund-intent write failed before workload replacement.
Dispatch explicitly changes reservation state immediately before the provider call;
this accounting handoff is not a distributed transaction with the model provider.
Before live activation, verify provider idempotency and ambiguous dispatch failures.
Transient intent-write failures are retried with backoff
without retaining Resume content. Pending analysis is registered immediately
after authentication, and the session is rechecked before reservation and dispatch
so logout cancels work waiting on source resolution.
The BFF does not log provider errors, prompts, bodies or outputs.

Daily keys roll over at midnight Asia/Seoul; Resume Version changes do not alter
the counter. Ledger records expire one day after their accounting day ends and
share the existing Candidate partition so account deletion removes them.

## Current activation and verification

Production has no model or source configured and fails closed. The exposed
allowance is zero/unconfigured, not a measured production quota. Tests replace
session/source/model boundaries with controlled fixtures and use a limit of two
only to exercise concurrency. `E2E_CANDIDATE_FIXTURE` is set by the test harness
after the build; it must never be set in an AWS workload. Public query strings
cannot activate it. DynamoDB's adapter is supplied for the later live runtime;
the current deployed disabled runtime cannot consume paid allowance.

Before enabling #16, wire the durable ledger, measured configured limit and
validated source/model into the BFF and retain an independently controlled
`enabled` callback for the paid-analysis kill switch. Verify actual DynamoDB
contention, workload permissions and all model privacy
gates in that environment. No live Bedrock capability is claimed by this release.
