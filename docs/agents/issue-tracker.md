# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Prerequisite

A GitHub remote must be configured before using issue-tracker operations. Infer the repository from `git remote -v`; `gh` does this automatically when run inside a clone.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`.
- **Read an issue**: `gh issue view <number> --comments`, also fetching labels when needed.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate label and state filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close an issue**: `gh issue close <number> --comment "..."`.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if the repository later treats external pull requests as feature requests.

## Skill terminology

- When a skill says "publish to the issue tracker", create a GitHub issue.
- When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `wayfinder`. The map is a single GitHub issue and its child issues are tickets.

- Label the map `wayfinder:map`.
- Link tickets as GitHub sub-issues when supported; otherwise use a task list and add `Part of #<map>` to each child.
- Label child tickets `wayfinder:<type>`, where type is `research`, `prototype`, `grilling`, or `task`.
- Represent blocking relationships with GitHub's native issue dependencies when available; otherwise add a `Blocked by: #<n>` line.
- Claim work with `gh issue edit <number> --add-assignee @me`.
- Resolve work by commenting with the result and closing the issue.
