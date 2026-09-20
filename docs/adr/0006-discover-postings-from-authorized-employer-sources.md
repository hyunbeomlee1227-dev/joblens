# Discover postings from authorized employer sources

JobLens recommends current regular and rolling recruitment Job Listings from employer-published or otherwise authorized Job Sources, rather than requiring candidates to supply a posting URL. This gives candidates a discovery experience without making the product depend on one general job board or unapproved scraping; source coverage may initially be narrow, so recommendations must identify their source and must not imply comprehensive coverage of the job market. ADR-0007 records the later decision to combine multiple authorized sources.

## Consequences

- Each source requires a review of access, display, attribution, and reuse conditions before activation.
- Only open Job Listings with a verifiable original application link are eligible for recommendation.
- Detailed evidence analysis requires posting content actually supplied by an authorized source; missing requirements are never invented from a title or keywords.
- A selected posting may still be analyzed more deeply, but discovery is the primary workflow.
