# Chat setup (free, open models)

The chat page at `/dashboard/chat` talks to any **OpenAI-compatible**
`/v1/chat/completions` endpoint. Ollama and every major free hosted tier speak
that same protocol, so switching providers is three environment variables — no
code change.

| Variable         | Default                      | Meaning                            |
| ---------------- | ---------------------------- | ---------------------------------- |
| `CHAT_BASE_URL`  | `http://localhost:11434/v1`  | Provider base URL (must end `/v1`) |
| `CHAT_MODEL`     | `llama3.2`                   | Model name                         |
| `CHAT_API_KEY`   | `ollama`                     | Key; Ollama ignores it             |

These are server-only — no `NEXT_PUBLIC_` prefix — so the key is never shipped
to the browser. The route also requires a signed-in Supabase user, so the
endpoint can't be used as an open relay against your quota.

---

## Local: Ollama (free, offline, no account)

1. Install from <https://ollama.com/download> (Windows installer available).
2. Pull a model and start serving:

```bash
ollama pull llama3.2
```

`ollama serve` runs automatically as a background service after install; if
port 11434 isn't answering, run it manually.

3. Nothing to configure — the defaults already point at Ollama. Start the app
   and open `/dashboard/chat`.

Model options, smallest first — pick by how much RAM you can spare:

| Model            | Size   | Notes                            |
| ---------------- | ------ | -------------------------------- |
| `llama3.2:1b`    | ~1.3GB | Fastest, weakest reasoning       |
| `llama3.2`       | ~2GB   | Default; good balance            |
| `qwen3:4b`       | ~2.6GB | Stronger reasoning for the size  |
| `gemma3:4b`      | ~3.3GB | Google's open model              |

Change with `CHAT_MODEL=qwen3:4b` in `.env` (and `ollama pull qwen3:4b` first).

---

## Production: a free hosted tier

**Ollama on your laptop is not reachable from a deployed Vercel function.** The
serverless function runs in Vercel's cloud and `localhost` there is its own
container, not your machine. So deployment needs a hosted provider.

These all run open models on a free tier, and all are OpenAI-compatible. Sign
up, make a key, then set the three variables in **Vercel → Settings →
Environment Variables** and redeploy.

**Groq** — fastest tokens/sec, no credit card:

```
CHAT_BASE_URL=https://api.groq.com/openai/v1
CHAT_MODEL=llama-3.3-70b-versatile
CHAT_API_KEY=<your groq key>
```

**OpenRouter** — widest model choice, many free variants:

```
CHAT_BASE_URL=https://openrouter.ai/api/v1
CHAT_MODEL=meta-llama/llama-3.3-70b-instruct:free
CHAT_API_KEY=<your openrouter key>
```

**Cerebras** — high daily token volume:

```
CHAT_BASE_URL=https://api.cerebras.ai/v1
CHAT_MODEL=llama-3.3-70b
CHAT_API_KEY=<your cerebras key>
```

Free tiers are rate-limited (roughly 20–30 requests/minute), which is fine for a
demo but will throttle under real traffic. Verify the current model names and
limits on each provider's dashboard — they change.

---

## Troubleshooting

The UI surfaces the actual failure in a red bubble rather than hiding it.

- *"Could not reach Ollama at ..."* — nothing is listening on 11434. Check
  `curl http://localhost:11434/api/tags`.
- *"Chat provider returned 404"* — usually a wrong `CHAT_MODEL`, or a
  `CHAT_BASE_URL` missing its `/v1` suffix.
- *"Chat provider returned 401"* — bad or missing `CHAT_API_KEY`.
