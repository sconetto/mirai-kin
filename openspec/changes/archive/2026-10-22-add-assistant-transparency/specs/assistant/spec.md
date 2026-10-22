## ADDED Requirements

### Requirement: Tool-call visibility
The system SHALL record each assistant tool call and display it in the transcript.

#### Scenario: See tool calls
- **WHEN** the assistant answers using tool calls
- **THEN** the transcript shows an expandable list of the tools it used

### Requirement: Citations
The system SHALL attach citations that link assistant answers to the underlying records they were derived from.

#### Scenario: Cited answer
- **WHEN** an answer references an account, transaction, goal, or report
- **THEN** the transcript provides a link to that record

### Requirement: Activity controls
The system SHALL provide a control to enable or disable the assistant and a view of recent assistant activity.

#### Scenario: Review activity
- **WHEN** a user opens the assistant activity view
- **THEN** recent tool calls are listed for review
