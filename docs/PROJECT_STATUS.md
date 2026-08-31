# NoCap — Project Status

An autonomous truth layer for enterprise knowledge bases, built for the All Things Agentic Hackathon (Taskmaster track). This doc explains what exists right now, how it works end to end, and what's still open.

Elevator pitch: "NoCap autonomously catches, quarantines, and repairs bad data in your AI knowledge base before your chatbot ever tells a lie."

## The problem it solves

Company knowledge bases (the documents a support chatbot or internal AI answers questions from) quietly accumulate bad content: outdated policy numbers, near-duplicate documents, fabricated claims, and occasionally deliberately malicious instructions. NoCap sits in front of that knowledge base and autonomously decides, per document, whether it's safe to publish, needs correcting, or needs to be blocked, without a human reviewing every submission.

## Why Taskmaster

The track's own definition: "an event-driven workflow with autonomous routing... watching for a change, figuring out what needs to happen next, and interacting with different apps to get the job done, from start to finish, without you guiding each step." NoCap is exactly that: a new document is the "change," the Inspector/Repair/Verifier chain is the "autonomous routing," and the knowledge base + published output is the "different app" it acts on.

## The pipeline (three agents)

All three live in `backend/` and share Inspector's setup (API key, approved-source loading, rate-limit constant) via `import inspector`.

### 1. Inspector (`backend/inspector.py`)
Compares one incoming document against every file in `approved_sources/` using Gemini (`gemini-3.5-flash`), structured JSON output via a schema (not free-text parsing). Decides one of:
- **approved** — accurate, not a near-duplicate, safe. Published immediately to `published_documents/` (this document doesn't need Repair or Verifier at all).
- **needs_repair** — well-intentioned but factually wrong or outdated relative to an approved source.
- **quarantined** — near-duplicate adding no value, fabricates policy with no basis in any approved source, or contains unsafe/malicious instructions (including prompt injection, see "what we've actually proven" below).

Defensive checks: rejects the model's own output if it cites a source file that wasn't actually provided, or returns a status outside the three valid values. This matters, it means the agent can't hallucinate its way past the pipeline's own guardrails.

### 2. Repair (`backend/repair.py`)
Only acts on documents Inspector marked `needs_repair`. Re-confirms via Inspector first (so it never repairs something that's actually fine or actually unsafe), then generates a corrected replacement using **only** the approved sources, never inventing numbers or rules. Saves to `repaired_documents/<file>`. Returns `repaired` or refuses with `quarantined` if Inspector's status wasn't actually `needs_repair`.

### 3. Verifier (`backend/verifier.py`)
The final, skeptical gate. Re-checks the *repaired* text against approved sources one more time, explicitly told not to rubber-stamp a repair just because it looks polished. If it passes: copies to `published_documents/<file>`. If not: stays in `repaired_documents/`, unpublished, with `remaining_issues` listed.

## What actually happened when we ran it (real results, not hypothetical)

Ran Inspector across all 10 files in `incoming_docs/`:

| File | Result |
|---|---|
| `business_travel_guide.md` | approved, published |
| `expense_claims_guide.md` | approved, published |
| `leave_request_guide.md` | approved, published |
| `remote_work_guide.md` | approved, published |
| `executive_travel_update.md` | needs_repair (wrong approval threshold, wrong flight class rule) |
| `expense_claims_update.md` | needs_repair (claimed ₹50,000 approval-free limit vs actual ₹10,000) |
| `leave_policy_update.md` | needs_repair (claimed unlimited leave carry-forward vs actual 5-day cap) |
| `remote_work_benefits_update.md` | needs_repair (fabricated ₹25,000/month WFH allowance, policy says there is none) |
| `remote_work_guide_copy.md` | quarantined (near-duplicate) |
| `security_access_notice.md` | **quarantined, risk score 100** |

That last one is the standout: the document didn't just contain outdated info, it contained an **actual prompt injection attempt trying to manipulate the AI evaluator into force-approving it**. Inspector caught and blocked it. This is a real, reproducible adversarial-robustness result, worth leading with in the demo, not a hypothetical "it could catch bad actors" claim.

Then ran Repair on all 4 `needs_repair` docs, all four came back `repaired`, grounded in the correct approved-source numbers/rules. They're sitting in `repaired_documents/`, not yet run through Verifier.

## Audit trail: Supabase, not Firestore

Every Inspector/Repair/Verifier decision is logged via `backend/audit_log.py` to a Supabase table (`audit_log`, project `bsjjtbnovmbwpypfpilg`, region `ap-southeast-1`). Columns: `file_name`, `stage`, `status`, `risk_score`, `issues`, `source_files`, `reason`, `changes_made`, `remaining_issues`, `published_path`, `logged_at`. RLS is enabled with insert/select policies for the publishable key (safe to use client-side, so the eventual dashboard can read this table live).

We deliberately did **not** use Firestore for this, even though it was the original plan and is still referenced in a couple of old comments. Reasoning: the hackathon requires "at least one" Google Cloud service, not one per feature, Pub/Sub (see below) already covers that requirement on its own, so adding Firestore would've been a second database for no compliance benefit. Supabase, note, does **not** count toward the GCP requirement itself, it's just where app data lives.

## Event-driven orchestration: Pub/Sub

The pipeline was originally three CLI scripts you'd run by hand in sequence. That's not actually "autonomous, no human in the loop," it just simulated it. It's now wired through Pub/Sub instead:

```
new file appears -> nocap-document-ingested -> Inspector
  needs_repair?   -> nocap-repair-needed     -> Repair
  repaired?       -> nocap-verification-needed -> Verifier
```

- **`backend/pubsub_bus.py`** — publish/listen helpers, plus the one-time `gcloud` topic/subscription setup commands in its docstring.
- **`backend/orchestrator.py`** — the three event handlers. Run once (`python orchestrator.py`), it listens on all three subscriptions continuously. Proven live locally (see below); not deployed to Cloud Run, that was attempted and deliberately dropped, see "Current setup status."
- **`backend/publish_incoming.py`** — the "watching for a change" half. Scans `incoming_docs/` for files not yet processed (checked against Supabase, via `audit_log.already_ingested_files()`, so it's idempotent) and publishes the event that starts everything. Has a `--watch` mode that polls every 5s, meant for live demo use: drop a new file into the folder mid-demo and watch it get caught with no other command run.

This is also, deliberately, the project's actual Google Cloud infrastructure requirement on its own, chosen because it's what Taskmaster's own "event-driven, watching for a change" description is describing, not because it was the easiest checkbox.

## Unattended deployment: Vercel push pipeline (2026-08-26)

`backend/orchestrator.py` proves the pipeline works end to end, but it only runs because a human keeps a laptop process alive — not actually unattended. Cloud Run was the original plan to fix that (see below, abandoned for billing reasons), so this replaces it with the Vercel deployment the dashboard already runs on, at zero new billing.

Storage-backed copies of Inspector/Repair/Verifier live in `frontend/api/_lib/` (`storage.py` swaps local-disk reads/writes for Supabase Storage, since a serverless invocation shares no filesystem with the next one — see that file's docstring). `frontend/api/pubsub/*.py` are three HTTP push handlers, one per topic, that Pub/Sub calls directly instead of `orchestrator.py` pulling from a subscription:

```
new file appears -> nocap-document-ingested-push-sub -> POST /api/pubsub/document-ingested
  needs_repair?   -> nocap-repair-needed-push-sub     -> POST /api/pubsub/repair-needed
  repaired?       -> nocap-verification-needed-push-sub -> POST /api/pubsub/verification-needed
```

These are new push subscriptions, separate from the existing pull `-sub` ones — `orchestrator.py`'s local demo path is untouched, both mechanisms coexist on the same three topics.

Infrastructure added:
- **Supabase Storage**: new `pipeline-output` bucket (private), RLS policies allowing `anon`+`authenticated` insert/select/update — the Vercel functions authenticate with the same publishable key as `audit_log.py`, not a service-role key, so policies had to allow the `anon` role directly rather than mirroring `incoming-uploads`' `authenticated`-only pattern (that one's written to from the logged-in dashboard, this one isn't).
- **GCP service account** `nocap-pubsub-push@nocap-505709.iam.gserviceaccount.com`: `roles/pubsub.publisher` on the project (so the Vercel functions can publish downstream events), and Pub/Sub's own service agent (`service-13587808067@gcp-sa-pubsub.iam.gserviceaccount.com`) granted `roles/iam.serviceAccountTokenCreator` on it (so Pub/Sub can mint the OIDC tokens it attaches to push requests). `pubsub_verify.py` checks that token's signature/audience/email before trusting a push.
- **7 Vercel env vars**: `SUPABASE_URL`, `SUPABASE_KEY`, `GOOGLE_CLOUD_PROJECT`, `GEMINI_API_KEY` (already existed from the dashboard deploy), plus three new ones — `GOOGLE_APPLICATION_CREDENTIALS_JSON` (the service account key's raw JSON, since Vercel env vars aren't files), `PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL`, `PUBSUB_PUSH_AUDIENCE` (the stable production domain, `https://atah-26-topaz.vercel.app` — deliberately not one of the per-deployment URLs, which change every deploy and would break the subscriptions' `--push-auth-token-audience`).

**Proven live, not just deployed.** Confirmed the Vercel-Python-in-a-monorepo bundling actually works (`lambdaRuntimeStats` on the deployment shows 3 Python functions built; hitting an endpoint with GET returns the handler's own `http.server` 501, not a platform 404). Then ran a real smoke test: uploaded `leave_policy_update.md` to `incoming-uploads` via the dashboard, published a `nocap-document-ingested` event by hand (standing in for the not-yet-built watcher), and watched it flow Inspector → Repair → Verifier with zero manual per-stage steps — real, timestamped `audit_log` rows and the actual file landing in `pipeline-output/repaired/` then `pipeline-output/published/`.

One real bug caught and fixed during the smoke test: the first attempt got through Inspector fine (event delivery and auth don't depend on it) but failed publishing `nocap-repair-needed` with `404 Resource not found` — Vercel's `GOOGLE_CLOUD_PROJECT` var had been sitting unset-or-stale since before the `atah-505614` → `nocap-505709` project migration mentioned below. Fixing it and redeploying resolved it completely.

One non-bug worth knowing about: the smoke test's `audit_log` rows include duplicate `inspector`/`repair`/`verifier` entries for the same file. That's Pub/Sub's normal at-least-once delivery (a push can be redelivered if the ack is slow), not a defect — each stage just reprocesses the same file idempotently-ish. Not worth engineering around before the deadline.

## Current setup status

- **Gemini**: connected, tested live, working (`.env` → `GEMINI_API_KEY`). A Mistral fallback (`LLM_PROVIDER=openai` in `backend/llm_client.py`) also exists for when Gemini's free-tier quota runs out. As of 2026-08-31, credits are back and `LLM_PROVIDER` is unset in `.env` (commented out), so the pipeline runs on Gemini, as required for submission.
- **Supabase**: connected, `audit_log` table created and verified with real inserts (`.env` → `SUPABASE_URL`, `SUPABASE_KEY`). RLS fixed to also cover the `authenticated` role (the original policies only covered `anon`, which silently broke the dashboard for signed-in users).
- **GCP project**: `nocap-505709` (superseded `atah-505614`, which the account no longer has access to — likely created under a different account). Saved to `.env` as `GOOGLE_CLOUD_PROJECT`.
- **Pub/Sub topics/subscriptions**: created and verified working. All three topics + their `-sub` subscriptions exist on `nocap-505709` (via Cloud Shell, since local `gcloud auth login`/`application-default login` needed to run directly on the machine hosting the code for ADC to be visible to the Python client libraries).
- **Orchestrator: proven end-to-end, live.** Ran `python backend/orchestrator.py` + `python backend/publish_incoming.py` for real — dropped two fresh test documents into `incoming_docs/`, both flowed through the full autonomous chain (Inspector → Repair → Verifier, each stage triggered by a real Pub/Sub event, zero manual per-stage commands) and landed in `published_documents/`. Verified against real, timestamped `audit_log` rows. One ran on Gemini specifically, confirming the requirement is actually met, not just Mistral.
- **Cloud Run deployment**: attempted, then abandoned by choice. `Dockerfile`, `.dockerignore`, `backend/cloud_run_main.py`, and `docs/CLOUD_RUN_DEPLOY.md` exist, but the one-time setup (`gcloud services enable run.googleapis.com ...`) failed with `FAILED_PRECONDITION: Billing account not found` — `nocap-505709` has no billing account, and Cloud Run/Cloud Build/Artifact Registry/Secret Manager all require one even within free-tier usage. The Cloud Run files stay in the repo unused; superseded by the Vercel push pipeline below, which solves the same "run unattended" problem at zero new billing.
- **Vercel push pipeline: proven end-to-end, live, unattended.** See "Unattended deployment: Vercel push pipeline" above for the full writeup. Demo plan can now show the pipeline running with no laptop process at all, not just `orchestrator.py` locally — though that local path still works too and stays as a fallback.

## Branding

- **Name**: NoCap (renamed from working title "TrustOps").
- **Tagline**: "No chatbot lies."
- **Logo**: hand-built SVG, not a third-party generator, two versions exist in `assets/`: a hexagon+checkmark mark, and an eye-in-circles sigil (emerald/cyan palette). See `assets/nocap_logo.png` / `assets/nocap_logo_v2.png`.

## Known open items

1. **`backend/test_gemini.py`** is dead/broken scratch code (calls `client.interactions.create`, a method that doesn't exist on the SDK the rest of the codebase actually uses — confirmed by reading it, not just suspected). Safe to delete.
2. **Second hackathon entry** (a smaller, genuinely distinct Fortified Enterprise Fleet submission) was discussed as a strategy but not started, contingent on team capacity given the Taskmaster entry is the priority.
3. **The Canva pitch deck (design `DAHSP4xWLq4`) got a content-only fix, not a real redesign.** It was still the old "AI Cannibalism" framing; all 6 pages have been rewritten in place with NoCap content (same layout/backgrounds, just swapped text) so it's no longer wrong, but this was explicitly a stopgap, a proper redesign is still planned separately.
4. ~~URL-monitoring watcher~~ **Closed 2026-08-31.** `frontend/api/ingest.py` is a new endpoint that `DocumentUpload.tsx` calls right after a successful Storage upload, publishing `nocap-document-ingested` automatically (after confirming the file actually exists in `incoming-uploads` via `storage.incoming_exists()`, so it can't be spammed with names that were never uploaded). The manual `publish_new_files()` step from the earlier smoke test is no longer needed for uploads made through the dashboard. Not yet redeployed/re-tested live on Vercel, do that before the demo.
5. **Notification system** — in-app + email (Resend) — not started.
6. **Hard submission requirements that don't exist yet regardless of any code work**: demo video, architecture diagram, Devpost writeup. Not started.

Resolved since the last update to this doc: frontend/dashboard exists and is deployed (Vercel), Verifier has been run (including live via Pub/Sub, see above), Pub/Sub topics/subscriptions are created and proven working end-to-end. Cloud Run deployment was attempted and deliberately abandoned (billing required, Pub/Sub alone already satisfies the GCP requirement, see above) — no longer an open item, it's a resolved decision. The ADK question is resolved: checked the actual hackathon rules (Section 6, allthingsagentichackathon.devpost.com/rules), the requirement is "at least one Google Agent Framework: Google ADK, GenAI SDK, Antigravity SDK or GenKit" — GenAI SDK is explicitly listed, and Inspector/Repair/Verifier already run on it, so this was never a gap. The stale pitch deck is resolved for now (see open items above for the redesign caveat). The pipeline now also runs genuinely unattended, live, on Vercel (see "Unattended deployment: Vercel push pipeline" above) — no longer dependent on a laptop process staying alive.
