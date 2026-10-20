# Assistant

## ADDED Requirements

### Requirement: Optional in-app assistant
The system SHALL provide an optional in-app "Ask anything" assistant that answers questions about the user's financial data.

#### Scenario: Ask a question
- **WHEN** the assistant is enabled and a user asks a question
- **THEN** the system returns an answer grounded in the user's data and cites the period and figures used

### Requirement: Disabled by default
The assistant SHALL be disabled unless a provider, model, and credentials are explicitly configured.

#### Scenario: No configuration
- **WHEN** no assistant provider is configured
- **THEN** the assistant is unavailable and the rest of the application works normally

### Requirement: Configurable provider
The system SHALL support a configurable provider and model, including an OpenAI-compatible endpoint, so a self-hosted or local model can be used.

#### Scenario: Local provider
- **WHEN** an OpenAI-compatible base URL and model are configured
- **THEN** the assistant uses that endpoint

### Requirement: Grounded tool use
The assistant SHALL answer by calling the application's service layer or REST API (reports, insights, transactions, budgets, planning) and SHALL NOT fabricate financial figures.

#### Scenario: Missing data
- **WHEN** the assistant cannot retrieve the data needed to answer
- **THEN** it says so instead of inventing a figure

### Requirement: Read-only by default
The assistant SHALL be read-only by default and SHALL require explicit user confirmation before applying any data change.

#### Scenario: Proposed write
- **WHEN** the assistant proposes a change to financial data
- **THEN** the user must confirm before the change is applied

### Requirement: Privacy
The system SHALL document that enabling the assistant sends relevant data to the configured provider and SHALL NOT send data when the assistant is disabled.

#### Scenario: Disabled assistant
- **WHEN** the assistant is disabled
- **THEN** no user data is sent to an external provider

### Requirement: Advice disclaimer
The assistant SHALL present its output as informational and SHALL NOT present it as regulated financial, tax, or legal advice.

#### Scenario: Disclaimer shown
- **WHEN** the assistant answers
- **THEN** an informational disclaimer is visible
