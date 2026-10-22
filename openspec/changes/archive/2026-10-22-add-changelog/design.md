## Context

The project already renders markdown for learn/docs content (`next-mdx-remote`, `remark-gfm`). A changelog page is a thin reuse of that pipeline.

## Goals / Non-Goals

**Goals:**

- A `/changelog` page driven by a markdown file.
- Markdown rendered with the existing MDX/GitHub-flavored markdown stack.
- A discoverable nav entry.

**Non-Goals:**

- Release automation or git-tag scraping.
- In-app release highlights (that is the separate `add-design-system`/future work).

## Decisions

### 1. Content location

Store the changelog at `docs/CHANGELOG.md`, grouped by version with dates, edited by hand.

### 2. Rendering

Reuse `next-mdx-remote` + `remark-gfm`, rendering the file server-side into the `/changelog` route under the existing app layout and locale.

### 3. Navigation

Add `changelog` to the nav/settings surface so it is discoverable without deep-linking.
