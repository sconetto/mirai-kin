# Assistant

## Purpose

Provide an optional, grounded conversational interface over the planner's data.

## Requirements

### Requirement: Optional in-app assistant
The system SHALL provide an optional in-app "Ask anything" assistant that answers questions about the user's financial data.

#### Scenario: Ask a question
- **WHEN** the assistant is enabled and a signed-in user asks a question
- **THEN** the system returns an answer grounded in the user's data and states the period and figures used

#### Scenario: Conversation history
- **WHEN** a user returns to the assistant
- **THEN** previous conversations and messages are available from local storage

### Requirement: Disabled by default
The assistant SHALL be disabled unless a provider, model, endpoint, and credentials are explicitly configured.

#### Scenario: No configuration
- **WHEN** the assistant is not configured
- **THEN** the assistant page shows a disabled state with setup instructions and the rest of the application works normally

#### Scenario: Disabled means no outbound data
- **WHEN** the assistant is disabled
- **THEN** no user data is sent to an external provider

### Requirement: Configurable provider
The system SHALL support a configurable provider and model, including an OpenAI-compatible endpoint, so a self-hosted or local model can be used.

#### Scenario: OpenAI-compatible endpoint
- **WHEN** an OpenAI-compatible base URL, model, and credentials are configured
- **THEN** the assistant uses that endpoint

#### Scenario: Local endpoint
- **WHEN** a local OpenAI-compatible endpoint is configured without an API key
- **THEN** the assistant can use that endpoint without requiring a hosted credential

#### Scenario: Local provider
- **WHEN** an OpenAI-compatible base URL and model are configured
- **THEN** the assistant uses that endpoint

### Requirement: Grounded tool use
The assistant SHALL answer by calling the application's service layer for reports, insights, transactions, budgets, planning, and projections, and SHALL NOT fabricate financial figures.

#### Scenario: Figure requested
- **WHEN** the user asks for a financial figure
- **THEN** the assistant retrieves it through a tool and cites the period or filters used

#### Scenario: Missing data
- **WHEN** the assistant cannot retrieve the data needed to answer
- **THEN** it says the data is unavailable instead of inventing a figure

#### Scenario: Name resolution
- **WHEN** a tool is given an account or category name that is missing or ambiguous
- **THEN** it returns the available names instead of guessing an id

### Requirement: Read-only by default
The assistant SHALL be read-only by default and SHALL require explicit user confirmation before applying any financial data change.

#### Scenario: Proposed write
- **WHEN** the assistant proposes a transaction
- **THEN** it creates a pending action and the user must confirm before the transaction is created

#### Scenario: Confirmed action
- **WHEN** the user confirms a pending action
- **THEN** the system re-validates the payload and applies the change exactly once

#### Scenario: Cancelled action
- **WHEN** the user cancels a pending action
- **THEN** no financial data is written

### Requirement: Streaming chat UI
The assistant screen SHALL stream responses, show the provider/model status, and present a persistent informational disclaimer.

#### Scenario: Streamed answer
- **WHEN** the assistant is answering
- **THEN** text appears incrementally in the conversation without a full-page reload

#### Scenario: Disclaimer visible
- **WHEN** the assistant answers
- **THEN** an informational, non-advice disclaimer is visible

### Requirement: Privacy
The system SHALL NOT send user data to an external provider when the assistant is disabled.

#### Scenario: Disabled assistant
- **WHEN** the assistant is disabled
- **THEN** no user data is sent to an external provider

### Requirement: Privacy documentation
The system SHALL document that enabling the assistant sends relevant conversation data to the configured provider and SHALL describe the disabled-by-default behavior, retention, and local-model option.

#### Scenario: Documented data flow
- **WHEN** a user or operator opens the assistant documentation
- **THEN** the documentation explains what is sent, when, to whom, and how to disable it

### Requirement: Advice disclaimer
The assistant SHALL present its output as informational and SHALL ensure an informational disclaimer is visible.

#### Scenario: Disclaimer shown
- **WHEN** the assistant answers
- **THEN** an informational disclaimer is visible

### Requirement: Advice limitation
The assistant SHALL NOT present its output as regulated financial, tax, or legal advice.

#### Scenario: Advice question
- **WHEN** the user asks for regulated advice
- **THEN** the assistant explains that it provides informational analysis only

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
