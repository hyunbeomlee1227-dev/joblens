# JobLens

JobLens is a planned job-discovery service that compares candidate-approved resume evidence with current job listings. Its first target area is Seoul, Gyeonggi, and Incheon across multiple occupations.

**Status:** design and source validation. This repository does not yet contain a working application or a public job-recommendation service. A source is not enabled merely because its API responds; original links and display, retention, and analysis rights must be verified first.

The [public MVP scope](docs/product/mvp-scope.md) records agreed behavior and release gates. [Domain language](CONTEXT.md), [architecture decisions](docs/adr/), and [job-source research](docs/research/) explain the design and unresolved constraints. The scripts in [`scripts/`](scripts/) are read-only connection probes that take optional API keys from environment variables; no keys are committed.

Original resume files are intended to stay in the browser. Sanitized text may be sent to AWS for analysis only after candidate review and consent, subject to the privacy and region controls in the MVP scope.
