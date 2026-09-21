# Authorize Job Source uses independently

JobLens verifies each Job Source Permission for discovery display, retention, and AI analysis separately instead of requiring a single all-or-nothing approval. A display-only source can improve live discovery while unavailable rights cannot be inferred from an accessible API; there is no Job Posting paste route to bypass source restrictions. Bookmarks, Recommendation History, and analysis use only fields and content permitted for their specific purposes. This adds permission-aware boundaries to ingestion and storage but avoids excluding lawful discovery data or silently overusing it.

If retaining even the listing identity and original link is not authorized, that listing cannot be bookmarked: the disabled action explains why while the original-link action remains available.

If permission is later withdrawn, the newly prohibited use stops immediately and saved source content and dependent records that can no longer be retained or displayed are removed with an explanation to affected Candidates. Unaffected uses stay available.

When duplicate listings are merged for presentation, each field retains its source provenance and may be used only under that source's permission. A more permissive duplicate does not authorize copying or analyzing content supplied by a more restrictive source.
