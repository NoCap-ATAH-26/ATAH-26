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

We deliberately did **not** use Firestore for this, even though it was the original plan and is still referenced in a couple of old comments. Reasoning: the hackathon requires "at least one" Google Cloud service, not one per feature, Cloud Run (needed anyway for deployment) and Pub/Sub (see below) already cover that requirement, so adding Firestore would've been a second database for no compliance benefit. Supabase, note, does **not** count toward the GCP requirement itself, it's just where app data lives.

## Event-driven orchestration: Pub/Sub

The pipeline was originally three CLI scripts you'd run by hand in sequence. That's not actually "autonomous, no human in the loop," it just simulated it. It's now wired through Pub/Sub instead:

```
new file appears -> nocap-document-ingested -> Inspector
  needs_repair?   -> nocap-repair-needed     -> Repair
  repaired?       -> nocap-verification-needed -> Verifier
```

- **`backend/pubsub_bus.py`** — publish/listen helpers, plus the one-time `gcloud` topic/subscription setup commands in its docstring.
- **`backend/orchestrator.py`** — the three event handlers. Run once (`python orchestrator.py`), it listens on all three subscriptions continuously. This is what gets deployed to Cloud Run.
- **`backend/publish_incoming.py`** — the "watching for a change" half. Scans `incoming_docs/` for files not yet processed (checked against Supabase, via `audit_log.already_ingested_files()`, so it's idempotent) and publishes the event that starts everything. Has a `--watch` mode that polls every 5s, meant for live demo use: drop a new file into the folder mid-demo and watch it get caught with no other command run.

This is also, deliberately, the project's actual Google Cloud infrastructure requirement, paired with Cloud Run deployment, chosen because it's what Taskmaster's own "event-driven, watching for a change" description is describing, not because it was the easiest checkbox.

## Current setup status

- **Gemini**: connected, tested live, working (`.env` → `GEMINI_API_KEY`).
- **Supabase**: connected, `audit_log` table created and verified with a real insert/read/cleanup (`.env` → `SUPABASE_URL`, `SUPABASE_KEY`).
- **GCP project**: exists (`atah-505614`, project number `551686615738`), saved to `.env` as `GOOGLE_CLOUD_PROJECT`. Billing/API-enablement status as of this doc: pending, the hackathon's $150 credit is expected within 72 hours. **Note: billing account setup (attaching a payment method) does not require the credit to have landed, Pub/Sub and Cloud Run both have generous perpetual free tiers that hackathon-scale usage won't exceed anyway. The credit just adds safety margin, it isn't a blocker.** `gcloud` CLI install was in progress as of this doc being written.
- **Pub/Sub topics/subscriptions**: not yet created (needs the `gcloud` commands in `pubsub_bus.py` run once, after billing is enabled).
- **Cloud Run deployment**: not yet done. This is the piece that actually satisfies the submission's "visible proof of backend deployed on Google Cloud" requirement, still outstanding.
- **Orchestrator**: code complete, not yet run end-to-end (blocked on the above).

## Branding

- **Name**: NoCap (renamed from working title "TrustOps").
- **Tagline**: "No chatbot lies."
- **Logo**: hand-built SVG, not a third-party generator, two versions exist in `assets/`: a hexagon+checkmark mark, and an eye-in-circles sigil (emerald/cyan palette). See `assets/nocap_logo.png` / `assets/nocap_logo_v2.png`.

## Known open items

1. **`docs/PITCH.md` and `docs/AI_Cannibalism_Pitch.docx` are stale.** They were written for the original "AI Cannibalism / Autonomous Immune System" framing (an abstract multi-generation model-collapse simulation) before the pivot to NoCap's concrete document-guardian mechanic. They need a rewrite to match what's actually being built. The Canva presentation (design `DAHSP4xWLq4`) has the same problem.
2. **GCP billing/Pub/Sub/Cloud Run setup** is the critical path right now, nothing about the event-driven architecture can be demoed live until topics exist and the orchestrator is actually deployed.
3. **No frontend/dashboard yet.** Planned: a live view reading from the Supabase `audit_log` table (pipeline visualization, a Collapse/health indicator per doc, an activity feed narrating decisions in plain language, before/after sample viewer for repaired docs).
4. **Verifier hasn't been run** on the 4 repaired documents yet, that's the last step to get real before/after/published triples for the demo.
5. **`backend/test_gemini.py`** looks like dead/broken scratch code (calls a different, likely-incorrect SDK method than the rest of the codebase uses), candidate for deletion.
6. **Second hackathon entry** (a smaller, genuinely distinct Fortified Enterprise Fleet submission) was discussed as a strategy but not started, contingent on team capacity given the Taskmaster entry is the priority.
