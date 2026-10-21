# Tasks — Add Grounded Finance Assistant

## 1. Configuration and provider

- [x] 1.1 Add `ASSISTANT_ENABLED`, `ASSISTANT_PROVIDER`, `ASSISTANT_MODEL`, `ASSISTANT_API_KEY`, and `ASSISTANT_BASE_URL` configuration with a disabled-by-default guard
- [x] 1.2 Implement the OpenAI-compatible provider adapter with a server-only key and local-endpoint support
- [x] 1.3 Document the environment variables in `.env.example` and the README

## 2. Persistence

- [x] 2.1 Add `assistant_conversations`, `assistant_messages`, and `assistant_actions` to the schema
- [x] 2.2 Generate and apply the assistant migration
- [x] 2.3 Add conversation, message, and pending-action services with ownership by conversation

## 3. Grounding

- [x] 3.1 Implement read-only tools for overview, reports, transactions, budgets, insights, forecast, and planner
- [x] 3.2 Implement the proposal-only transaction tool with account/category name resolution
- [x] 3.3 Add the system prompt with tool-only figures, missing-data behavior, and prompt-injection guardrails

## 4. Chat experience

- [x] 4.1 Add the session-authenticated streaming chat route with bounded tool steps and message persistence
- [x] 4.2 Build the assistant screen with conversation history, streaming, provider status, and disclaimer
- [x] 4.3 Add the disabled state with setup instructions and the navigation entry
- [x] 4.4 Add en-US and pt-BR assistant messages

## 5. Write confirmation

- [x] 5.1 Render pending action cards with confirm and cancel controls
- [x] 5.2 Add the confirm/cancel route with payload re-validation and single-application semantics

## 6. Privacy and verification

- [x] 6.1 Document privacy/data-flow, retention, local models, and the disabled default in the repository and UI
- [x] 6.2 Add unit tests for configuration, persistence, and confirmation semantics
- [x] 6.3 Add e2e coverage for the disabled gate and assistant navigation
- [x] 6.4 Run typecheck, lint, unit tests, Docker build, and migration verification
