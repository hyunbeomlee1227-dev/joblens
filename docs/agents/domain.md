# Domain Docs

This repository uses a single-context domain documentation layout.

## Before exploring, read these

- `CONTEXT.md` at the repository root, when it exists.
- Relevant architectural decision records under `docs/adr/`, when they exist.

If these files do not exist, proceed silently. Do not create them speculatively. The `domain-modeling` skill creates them when terminology or architectural decisions are actually resolved.

## File structure

```text
/
|-- CONTEXT.md
|-- docs/
|   `-- adr/
`-- src/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term defined in `CONTEXT.md`. Do not drift to synonyms that the glossary explicitly avoids.

If a required concept is missing, reconsider whether the term belongs to the project or note the gap for later `domain-modeling` work.

## Flag ADR conflicts

If a proposal contradicts an existing ADR, surface the conflict explicitly instead of silently overriding the decision.
