# Keep resume documents in the browser

JobLens extracts text and performs OCR in the candidate's browser, then sends only the candidate-approved Sanitized Resume for analysis. This trades client-side processing time and OCR complexity for a durable privacy boundary: original resume files and direct identifiers do not leave the browser.

## Consequences

- Text PDFs are parsed first and OCR is used only for pages without usable text.
- Korean and English PDFs are supported up to 10 MB and 10 pages.
- Every page with low-confidence extraction requires an Extraction Review before analysis.
- Server-side document extraction services are intentionally excluded because they would receive the original resume.
- Candidates may paste resume text instead of uploading a PDF; pasted text goes through the same Extraction Review, identifier removal, and approval boundary before analysis.
