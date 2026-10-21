# Add Grounded Finance Assistant

## Why

The finance planner already turns imported statements into reports, deterministic insights, and a plan. The remaining gap is a conversational way to ask questions across those surfaces ("how much did I spend on groceries last quarter?", "what changed in my net worth?", "am I on track for the reserve goal?") without manually opening several screens.

A generic chatbot would be unsafe for financial data: it can invent figures, leak data to an unconfigured provider, or apply writes without consent. This change adds an **optional, opt-in assistant** that is grounded in the existing service layer, read-only by default, and explicit about privacy and advice limits.

## What Changes

- Add assistant configuration via environment variables (provider, model, API key, base URL) and an OpenAI-compatible provider adapter. The assistant is **disabled by default**; the rest of the app works normally without it.
- Add `assistant_conversations`, `assistant_messages`, and `assistant_actions` tables plus a migration, so conversation history is stored locally.
- Implement grounded tools over the service layer: overview, reports, transactions search, budgets, insights, forecast, planner goals, and a **proposal-only** transaction tool.
- Add a streaming chat screen with conversation history, a persistent informational disclaimer, and a disabled state that explains how to enable it.
- Add a write-confirmation flow: the assistant can only create a pending action; financial data changes require an explicit user confirmation.
- Document the privacy/data-flow behavior, local-model support, retention, and disabled-by-default state in the repository docs and in the assistant UI.
- Add the assistant to navigation and to the en-US/pt-BR message catalogs.

## Capabilities

### New Capabilities

- `assistant`: An optional, grounded, read-only-by-default finance assistant with configurable provider, local conversation history, streaming responses, write confirmation, privacy documentation, and non-advice disclaimers.

### Modified Capabilities

None.

## Impact

- **Data model**: adds `assistant_conversations`, `assistant_messages`, and `assistant_actions`; migration `0003`.
- **Dependencies**: adds the Vercel AI SDK (`ai`) and `@ai-sdk/openai-compatible`; no hosted provider is required.
- **Routes**: adds `/assistant` and session-authenticated `POST /api/assistant/chat` and `POST /api/assistant/actions/{id}`.
- **Configuration**: `ASSISTANT_ENABLED`, `ASSISTANT_PROVIDER`, `ASSISTANT_MODEL`, `ASSISTANT_API_KEY`, `ASSISTANT_BASE_URL`.
- **Privacy**: no data is sent to a provider unless the assistant is enabled, configured, and used by the signed-in user.
- **Tests**: unit coverage for configuration, persistence, and confirmation; e2e coverage for the disabled gate and navigation.
