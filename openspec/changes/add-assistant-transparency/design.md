## Context

The assistant is enabled by environment variables and answers via tool calls, but the conversation stores only messages. There is no audit trail of what the assistant looked at or did.

## Goals / Non-Goals

**Goals:**

- Record each tool call (name, inputs, key outputs) on the assistant message.
- Render an expandable "what the assistant did" list with citation links.
- Provide clear enable/disable and activity controls.

**Non-Goals:**

- Autonomous actions or destructive writes without confirmation.
- Streaming-only transcripts with no persisted audit trail.

## Decisions

### 1. Recording

Persist tool calls on a message as structured rows: tool name, a sanitized input summary, output summary, and referenced entity ids.

### 2. Citations

Resolve referenced entity ids to links (accounts, transactions, goals, reports) in the transcript; unresolved ids render as text only.

### 3. Controls

Keep the existing opt-in setting and add a "review activity" view showing recent tool calls, with no new write permissions beyond the current confirmed-action flow.
