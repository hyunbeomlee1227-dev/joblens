# JobLens

JobLens discovers current job postings that may interest a candidate, recommends them using candidate-approved resume evidence and job preferences, and offers a deeper analysis of a selected posting without retaining the original resume document.

## Language

**Visitor**:
An unauthenticated person who browses public Job Listings without submitting a Resume or starting an Analysis Job. A Visitor becomes a Candidate after signing in.
_Avoid_: Guest candidate, anonymous user

**Candidate**:
The authenticated person who owns the Resume and initiates Analysis Jobs for their own job search.
_Avoid_: User, applicant, account

**Resume**:
A candidate-provided document describing experience, projects, education, and skills for comparison with a job posting.
_Avoid_: CV, profile, application document

**Job Posting**:
The employer-provided description of a role, including responsibilities, requirements, and preferred qualifications.
_Avoid_: Job description, recruitment notice

**Job Listing**:
A Job Source's discoverable record of an opening, with an original link and enough metadata to identify the role. It may not contain the full Job Posting.
_Avoid_: Scraped posting, full job description

**Bookmarked Job Listing**:
A Job Listing whose source identity and original link a Candidate has saved for later access, even after recruitment closes. The bookmark does not contain Resume content or an Analysis Result.
_Avoid_: Saved resume match, archived posting

**Job Source**:
A publisher or authorized feed from which current Job Listings may be obtained for discovery. A publicly reachable page alone is not an authorized Job Source.
_Avoid_: Scraping target, crawler source

**Job Source Permission**:
The verified scope in which a Job Source permits its Job Listings or Job Postings to be displayed, retained, or used for analysis. Permission for one use does not imply permission for another.
_Avoid_: Public API access, blanket reuse license

**Job Preferences**:
The roles, work regions, and work arrangements a Candidate explicitly selects for discovery. They are not inferred from the Candidate's Resume.
_Avoid_: Inferred interests, resume-derived preferences

**Eligible Job Listing**:
A Job Listing from an authorized Job Source with a verifiable original link and open recruitment status that satisfies the Candidate's Job Preferences. An expired or unverifiable listing is not eligible for discovery or recommendation.
_Avoid_: Possibly open posting, approximate match

**Discovered Job Listing**:
An Eligible Job Listing surfaced because it matches the Candidate's Job Preferences, without a claim that its requirements match the Resume. It may have only metadata or a short excerpt rather than a full Job Posting.
_Avoid_: Limited Recommendation, resume match

**Listing Report**:
A notice from an authenticated Candidate that a displayed Job Listing may be closed, incorrect, or linked to the wrong opening. It triggers verification rather than proving the listing is invalid.
_Avoid_: Confirmed closure, deletion request

**Job Recommendation**:
A current Eligible Job Listing whose supplied Job Posting requirements have been compared with the Candidate-approved Sanitized Resume and for which at least one core responsibility or required qualification has direct Requirement Evidence. Preferred qualifications alone do not make a recommendation; Evidence Gaps may still be present, and the recommendation is not a prediction of hiring success.
_Avoid_: Match score, acceptance prediction

**Recommendation History**:
A Candidate-owned record of a past Job Recommendation, including its listing, stated reasons, paired verified Job Posting and approved Resume excerpts, and the time it was made. It exists only when the Job Source permits retaining the posting citation and never contains the original Resume document or full Sanitized Resume.
_Avoid_: Resume archive, Analysis Result history

**Sanitized Resume**:
The resume content remaining after direct identifiers are removed and the candidate reviews what will be submitted for analysis. It contains only information the candidate has explicitly approved for processing.
_Avoid_: Anonymous resume, redacted PDF, raw resume

**Resume Version**:
One exact Candidate-approved Sanitized Resume used for a set of Analysis Jobs. Editing and approving its content creates a new version without changing the Candidate's usage allowance.
_Avoid_: Stored resume, uploaded file revision

**Daily Analysis Allowance**:
The shared number of paid analysis attempts a Candidate may start during one Korea Standard Time calendar day across recommendation batches and selected deep analyses.
_Avoid_: Per-feature limit, free retry quota

**Extraction Review**:
The Candidate's confirmation and correction of resume content extracted from a document or entered directly before sanitization and analysis. An Analysis Job cannot begin while any extracted page or directly entered content remains unconfirmed.
_Avoid_: OCR review, preview, verification step

**Analysis Job**:
A single in-session comparison of one Resume Version with one Job Posting. It has no durable resume payload and cannot be resumed after the browser analysis session ends.
_Avoid_: Request, task, scan

**Analysis Result**:
The temporary output of an Analysis Job, containing matched requirements, missing evidence, and the resume evidence used for each conclusion. A result with no Requirement Evidence is not a Job Recommendation.
_Avoid_: Score, prediction, evaluation

**Requirement Evidence**:
Candidate-approved Resume content that directly supports a requirement stated in the Job Posting. Both the requirement and Resume citations must be verified against their supplied originals rather than infer or invent missing text.
_Avoid_: Match score, fit signal

**Evidence Gap**:
A Job Posting requirement for which the Sanitized Resume contains incomplete or no supporting evidence. It is not a claim that the candidate lacks the underlying ability.
_Avoid_: Weakness, disqualification, failed requirement
