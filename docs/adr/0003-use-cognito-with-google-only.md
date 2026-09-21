# Use Cognito with Google as the only sign-in method

JobLens delegates candidate authentication to an Amazon Cognito user pool federated with Google. The application stores the Cognito subject identifier, not Google credentials, names, or profile photos; this reduces custom credential handling, supports per-candidate usage limits, and demonstrates managed identity integration without repeating the custom JWT work already shown elsewhere.

## Consequences

- Candidates must have a Google account to analyze their own resume.
- APIs trust Cognito access tokens and identify a Candidate by the stable `sub` claim.
- Google client credentials, callback URLs, logout URLs, and Cognito configuration become deployment dependencies.
- Migrating away from Cognito requires replacing the identity provider and account identifiers.
- Public resume analysis has one per-Candidate Daily Analysis Allowance shared by recommendation batches, paid retries, and selected deep analyses. It resets at midnight Korea Standard Time; the numeric limit is set from measured usage and cost, not guessed at design time. Approving a new Resume Version does not reset it.
- Candidates can initiate self-service account deletion, which removes their application account, active sessions, and Candidate-owned persistent data.
