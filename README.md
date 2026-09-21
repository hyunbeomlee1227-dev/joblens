# JobLens

JobLens is a planned job-discovery service that compares candidate-approved resume evidence with current job listings. Its first target area is Seoul, Gyeonggi, and Incheon across multiple occupations.

**Status:** fixture discovery demo. The repository now contains a working public discovery flow built with synthetic Job Listings. It is not yet a live job-discovery or resume-grounded recommendation service. A source is not enabled merely because its API responds; original links and display, retention, and analysis rights must be verified first.

The [public MVP scope](docs/product/mvp-scope.md) records agreed behavior and release gates. [Domain language](CONTEXT.md), [architecture decisions](docs/adr/), and [job-source research](docs/research/) explain the design and unresolved constraints. The scripts in [`scripts/`](scripts/) are read-only connection probes that take optional API keys from environment variables; no keys are committed.

Original resume files are intended to stay in the browser. Sanitized text may be sent to AWS for analysis only after candidate review and consent, subject to the privacy and region controls in the MVP scope.

## Run the fixture demo

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The home page, listing details, and every original-link action are explicitly marked as synthetic demo content. Use `http://localhost:3000/?fixture=empty` to inspect the empty-result state.

## Verify the application

```bash
npm run format:check
npm run typecheck
npm test
```

`npm test` creates a production build and runs the public discovery journey in Chromium. GitHub Actions performs the same formatting, type, build, and browser checks for pushes to `main` and pull requests.
