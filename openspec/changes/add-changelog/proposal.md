## Why

There is no user-facing record of what changed between releases. A self-hosted user updating the app cannot tell what is new, which makes the project feel unmaintained and complicates support.

## What Changes

- Serve a changelog from a markdown file at `/changelog`.
- Render markdown consistently with the existing markdown tooling.
- Add a navigation entry so the changelog is discoverable.
- Optionally surface recent entries as release notes on the dashboard.

## Capabilities

### New Capabilities

- `changelog`: a versioned, markdown-driven changelog page.

## Impact

- **Content**: a `CHANGELOG.md` (or `docs/changelog.md`) maintained per release.
- **UI**: a `/changelog` route and nav link.
- **Tests**: route renders markdown and the nav link is present.
