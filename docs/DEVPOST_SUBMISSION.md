# NoCap — Devpost Submission Draft

Copy each section into the matching Devpost field. Track: Taskmaster.

---

## Tagline

No chatbot lies.

---

## Inspiration

Every company with an internal AI assistant has the same quiet problem: the knowledge base it answers from rots. Policy numbers go stale, someone uploads a near duplicate of an existing doc, a well meaning employee writes a "helpful update" that gets the numbers wrong, and occasionally someone tries something worse. Nobody reviews every document that lands in a company wiki or support folder before a chatbot starts quoting it as fact. We wanted to build the layer that should already exist between "a document arrived" and "a chatbot is allowed to trust it," and make it run with zero human in the loop, the way the Taskmaster track actually asks for.

## What it does

NoCap sits in front of a company knowledge base and decides, per document, whether it is safe to publish, needs correcting, or needs to be blocked, without anyone reviewing it by hand.

Three agents, each doing one job:

1. **Inspector** compares an incoming document against every approved source using Gemini with structured JSON output, and returns one of three verdicts: approved, needs_repair, or quarantined.
2. **Repair** only touches documents Inspector flagged needs_repair. It re-confirms the verdict first, then rewrites the document using only the approved sources, never inventing numbers.
3. **Verifier** is the skeptical final gate. It re-checks the repaired text against approved sources again, explicitly told not to rubber-stamp a repair just because it reads cleanly, before anything is actually published.

A document dropped into the pipeline triggers the whole chain automatically over Google Cloud Pub/Sub: ingestion publishes an event, Inspector picks it up, and depending on its verdict, Repair and Verifier fire in turn, each a real Pub/Sub event, not a script calling the next script.

Everything is logged to a Supabase audit_log table (file, stage, status, risk score, reasoning, what changed), which powers a live dashboard where you can watch documents move through the pipeline and chat with an assistant grounded in that real audit history.

## How we built it

The pipeline is three Python agents sharing one Gemini client (`backend/llm_client.py`), using Gemini's structured output (response_schema) instead of parsing free text, so a verdict is always one of the three valid strings. Inspector rejects its own output if it cites a source file that was not actually provided, which closes off one of the more obvious ways a model can talk its way past its own guardrail.

Orchestration runs on Google Cloud Pub/Sub. Three topics correspond to the three transitions in the pipeline (document ingested, repair needed, verification needed), and two consumers exist for it: `backend/orchestrator.py` for local demo runs, and a set of Vercel serverless functions (`frontend/api/pubsub/*.py`) that Pub/Sub pushes to directly, so the pipeline also runs unattended in production with no laptop process required. A GCP service account with a scoped publisher role handles the Vercel side, and Pub/Sub's own push requests are verified against that service account's signed token before anything is trusted.

The frontend is a Next.js dashboard on Vercel with Google, password, and magic link auth, document upload into a Supabase Storage bucket, and a chat feature grounded in the real audit_log data via RAG.

## Challenges we ran into

Getting from "three scripts you run by hand" to "actually autonomous" took real rework: the first version was three CLI tools chained by a person pressing enter between each one, which is not what the Taskmaster track means by no human in the loop. Rebuilding it around Pub/Sub events meant redesigning each agent to be triggerable independently and to re-verify its own preconditions (Repair re-checks Inspector's verdict before acting, for instance) instead of trusting that the previous stage ran correctly.

We hit a real GCP billing wall trying to deploy the pipeline to Cloud Run for a 24/7 hosted demo: the project has no billing account linked, and Cloud Run, Cloud Build, Artifact Registry, and Secret Manager all require one even inside free tier limits. Rather than attach billing for a demo convenience, we solved "runs unattended" a different way, by moving the consumer side onto Vercel's existing serverless functions, which needed zero new billing and still proves the same requirement.

Pub/Sub's at least once delivery also produced duplicate audit_log rows during testing (a push getting redelivered because an ack was slow), which took a moment to recognize as expected behavior rather than a bug, since each stage reprocesses idempotently rather than corrupting state.

Gemini's free tier quota ran out mid build, so `backend/llm_client.py` was written as a pluggable provider that can swap to any OpenAI-compatible endpoint (we used Mistral) with three env vars and no code changes, which kept the team unblocked without losing the actual Gemini requirement, since it switches back the moment quota returns.

## Accomplishments that we're proud of

The strongest one: Inspector caught a real prompt injection attempt. One of our test documents did not just contain outdated information, it contained text specifically written to manipulate the AI evaluator into force approving it. Inspector flagged it quarantined with a risk score of 100. That is a reproducible adversarial robustness result we can show live, not a hypothetical claim about what the system could theoretically catch.

We are also proud that the autonomous chain is proven twice over, both as a local process reacting to real Pub/Sub events with zero manual per stage commands, and as a fully unattended Vercel deployment that a live smoke test walked end to end, from an uploaded document to a published, verified output, with real timestamped audit_log rows as evidence.

## What we learned

Structured output changes what "the model made a mistake" means. Instead of parsing a paragraph and hoping the verdict is in there somewhere, a schema forces the model into one of a known set of states, which made it much easier to write defensive checks against the failure modes that actually matter, like a model citing a source that was never given to it.

We also learned that "autonomous" is a design constraint, not a demo trick. It changes how you have to write every stage, since each one has to be safe to trigger on its own, re-verify its own assumptions, and tolerate being called more than once for the same input.

## What's next for NoCap

- An actual watcher for the "watching for a change" trigger. Right now a document lands in storage and the first ingestion event is published by hand during a demo; a real watcher would close that last manual step.
- In-app and email notifications (Resend is already wired for other purposes) so a human is alerted when something is quarantined, even though no human is required to act on the everyday cases.
- Support for non-text documents (Gemini's Files API path), since the current pipeline is text-only.
- A second, genuinely distinct entry for the Fortified Enterprise Fleet track, if time allows.

## Built With

google-genai (Gemini 3.5 Flash), Google Cloud Pub/Sub, Python, Next.js, Vercel, Supabase (Postgres, Storage, Auth), Resend

---

*Everything above describes real runs, not projected behavior — see `docs/PROJECT_STATUS.md` in the repo for the underlying evidence (audit_log results table, live Pub/Sub proof, Vercel smoke test).*
