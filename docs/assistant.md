# Assistant — privacy and data flow

The finance planner includes an optional in-app assistant. It is **disabled by default**. When it is disabled or not configured, the assistant page shows setup instructions and no user data is sent to any external provider.

## Enabling it

Set the following environment variables and restart the app:

```bash
ASSISTANT_ENABLED=true
ASSISTANT_PROVIDER=openai-compatible
ASSISTANT_MODEL=gpt-4o-mini
ASSISTANT_BASE_URL=https://api.openai.com/v1
ASSISTANT_API_KEY=sk-...
```

Local models work through any OpenAI-compatible endpoint; they do not require an API key:

```bash
ASSISTANT_ENABLED=true
ASSISTANT_PROVIDER=ollama
ASSISTANT_MODEL=llama3.1
ASSISTANT_BASE_URL=http://localhost:11434/v1
```

The provider key is read on the server and is never sent to the browser.

## What is sent, and when

Data leaves the server **only** when the assistant is enabled, configured, a signed-in user sends a message, and the request is made.

For each turn the app sends the configured provider:

- the user's current message;
- the text of up to the last 20 user/assistant messages in that conversation;
- the system prompt (rules, date, and non-advice/disclaimer instructions);
- tool definitions;
- tool results requested by the model (for example a report summary, account balances, budget rows, insights, forecast months, or transaction search results).

The model does **not** receive the whole database or raw imported files. It receives only what the tools retrieve for the question. Tool results are treated as data, not instructions.

Conversation text is stored locally in Postgres (`assistant_conversations`, `assistant_messages`). Pending write proposals are stored in `assistant_actions`. Tool-call transcripts are not stored as provider-native messages. Provider keys are not stored in the database.

Conversation history is retained until the conversation rows are deleted (deleting a conversation cascades to its messages and actions). The current UI does not expose a delete control; an operator can remove rows directly in Postgres.

## Read-only by default

The assistant has no direct write tool. To change financial data it must call `propose_transaction`, which only creates a pending action. The transaction is created only after the user clicks **Confirm**; **Cancel** leaves the data untouched. Confirmation re-validates the payload with the same schema as manual entry and applies it once.

## Advice limitation

Answers are informational analysis of the user's own data. They are not financial, tax, legal, or investment advice, and the UI shows that disclaimer on every assistant screen.

## Disabling it

Set `ASSISTANT_ENABLED=false` (or remove the provider/model configuration) and restart. The page returns to the disabled state and no further data is sent. Existing conversations remain in Postgres and can be removed separately.

## Known limitations

- Provider/tool-calling behavior varies; small local models may call tools poorly or fail to answer. The step loop is capped at six steps.
- Answers depend on imported data quality and on the tool results returned for the selected period.
- There is no per-message deletion or export UI yet.
- The assistant is session-only; it is not exposed through `/api/v1`.
