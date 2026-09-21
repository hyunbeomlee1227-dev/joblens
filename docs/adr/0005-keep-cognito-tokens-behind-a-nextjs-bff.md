# Keep Cognito tokens behind a Next.js BFF

JobLens uses a Next.js Backend for Frontend as the browser's only application API. The BFF completes the Cognito authorization-code exchange, keeps Cognito access and refresh tokens in a server-side session, and gives the browser only an opaque `HttpOnly`, `Secure`, `SameSite` session cookie; this increases deployment and session-management work but keeps AWS bearer tokens out of browser JavaScript.

## Consequences

- The Next.js application requires a server runtime and cannot be deployed as a static-only S3 site.
- Browser requests stay same-origin and the BFF attaches the Cognito access token when calling the protected AWS API.
- The BFF, not the browser, invokes Bedrock so authenticated Candidates cannot reuse browser-visible AWS credentials to bypass per-Candidate limits or the paid-analysis kill switch. Approved resume text passes through BFF request memory but is never persisted or included in logs, analytics, or error reports (ADR-0008).
- Sessions require server-side storage, expiration, rotation, logout, and account-deletion cleanup.
- Cookie protection reduces token theft from JavaScript but does not replace CSRF and XSS defenses.
