## Why

The assistant is optional and minimal, and when it acts it does not show the user what data it read or what tool calls it made. Promoting it to first-class requires transparency: visible tool calls, citations to the underlying records, and clear controls.

## What Changes

- Record and display each assistant tool call with its input, output, and source.
- Attach citations that link answers to the accounts, transactions, goals, or reports they were derived from.
- Add user controls to enable/disable the assistant and review its activity.
- Keep the assistant opt-in and privacy-preserving.

## Capabilities

### Modified Capabilities

- `assistant`: first-class, transparent assistant with tool-call visibility and citations.

## Impact

- **Schema**: persist tool calls and citations for review.
- **Services**: tool-call recording and citation resolution.
- **UI**: an assistant transcript with expandable tool calls and citation links.
- **Tests**: recording, citation rendering, and privacy controls.
