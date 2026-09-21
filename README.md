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

The deployment health endpoint is available at `/api/health`. It reports the immutable release identifier and is intentionally excluded from caches.

## Deploy the public fixture to AWS

The first public release runs as a standalone Next.js container on a small EC2 instance in Seoul. CloudFront provides the public HTTPS address, ECR stores immutable release images, Systems Manager replaces SSH, and GitHub Actions assumes a short-lived AWS role through OIDC. There are no long-lived AWS keys in GitHub.

Requirements:

- AWS CLI authenticated to the target account
- GitHub CLI authenticated for `hyunbeomlee1227-dev/joblens`
- Docker running locally
- Bash, Git, and curl

Run the repeatable setup wizard from the repository root:

```bash
bash scripts/setup-aws.sh
```

The wizard first runs the same release checks as CI. It then asks for the budget and service-alert email locally, writes it only to the ignored `.env.aws` file, creates the `test` infrastructure, publishes the first image, verifies the public health endpoint, and stores only non-secret resource identifiers as GitHub repository variables. Confirm the AWS SNS subscription email so operational alarms can reach you.

After setup, a successful CI run on `main` builds an immutable image and deploys it through Systems Manager. The instance first checks the new image on a private canary port. If the local check fails, the running release stays in place; if the public CloudFront check fails after switching, the workflow restores the previous image. The `joblens-test-operations` CloudWatch dashboard shows instance health and application errors. The `joblens-test-monthly-cost` budget and Cost Explorer use the `Project=JobLens` cost-allocation tag, which AWS can take up to 24 hours to expose after activation, to isolate application spending and alert at 50%, 80%, and a forecast of 100%.
