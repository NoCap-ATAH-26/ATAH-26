# NoCap - Devpost Submission Draft

Copy each section into the matching Devpost field. Track: Taskmaster, All Things Agentic Hackathon.

---

## Tagline

No chatbot lies.

---

## Inspiration

Every company that builds an internal AI assistant makes the same quiet bet: that the documents it answers from are true. In practice, a knowledge base is never static. Policy numbers get updated in one place and not another. Someone uploads a near duplicate of a document that already exists, with slightly different numbers, and nobody notices which one is authoritative. A well meaning employee writes a "helpful summary" of a policy and gets a threshold wrong. And occasionally, someone tries something worse: a document written specifically to manipulate whatever system reviews it.

Nobody actually reviews every file that lands in a company wiki, a shared drive, or a support folder before a chatbot starts treating it as ground truth. There is no gate. The chatbot just answers from whatever is there, wrong or right, safe or malicious, and the first sign anything is off is usually a customer or employee who acted on bad information.

We wanted to build the gate that should already exist between "a document arrived" and "an AI assistant is allowed to cite it as fact." Not a linter, not a checklist a human still has to run, an actual autonomous decision-maker that inspects, corrects, or blocks new information before it ever reaches a chatbot, end to end, with nobody in the loop. That is also, almost exactly, what the Taskmaster track asked teams to build: "an event-driven workflow with autonomous routing... watching for a change, figuring out what needs to happen next, and interacting with different apps to get the job done, from start to finish, without you guiding each step." NoCap is our answer to that brief specifically, not a general agent idea we tried to retrofit into the track description.

## What it does

NoCap sits in front of a company knowledge base and decides, per document, whether it is safe to publish, needs correcting, or needs to be blocked, without a human reviewing it by hand at any point in that decision.

### The pipeline: three agents, one job each

**Inspector** is the entry point. It reads an incoming document alongside every file in an `approved_sources/` directory (the ground truth the company already trusts) and asks Gemini to compare them, using structured JSON output (a `response_schema`, not free-text parsing) so the verdict is always exactly one of three strings:

- `approved` - accurate, not a near duplicate of something already published, safe. Published immediately; this document never touches Repair or Verifier at all.
- `needs_repair` - well-intentioned but factually wrong or outdated relative to an approved source (a stale approval threshold, a policy number that changed).
- `quarantined` - a near duplicate that adds no value, a fabricated policy with no basis in any approved source, or unsafe content, including a prompt injection attempt aimed at the AI evaluator itself.

Inspector also defends itself against its own model: if Gemini's response cites a source file that was never actually provided to it, or returns a status outside the three valid values, Inspector rejects that output rather than trusting it. A verdict that hallucinates its own evidence does not get to stand.

**Repair** only ever acts on documents Inspector already marked `needs_repair`. Before touching anything, it re-runs Inspector's check itself, so it never repairs a document that turns out to actually be fine, or actually unsafe, just because the pipeline told it to. Once confirmed, it rewrites the document using only the approved sources, explicitly instructed never to invent a number or rule that is not grounded in them, and saves the corrected version separately from the original.

**Verifier** is the skeptical last gate. It re-checks the *repaired* text against the approved sources one more time, explicitly told not to rubber-stamp a repair just because it now reads cleanly and confidently. If it passes, the document is copied into the published location. If it does not, it stays unpublished, with the specific `remaining_issues` recorded, not silently discarded and not silently pushed through.

### How a document actually enters the pipeline

A document reaches NoCap by being dropped into the dashboard's upload panel (any file type, single files or an entire folder), which writes it to a Supabase Storage bucket. As of today, that upload immediately and automatically fires the first pipeline event itself, through a small endpoint that confirms the file really was written before publishing anything, so there is no separate manual step, no command anyone has to run, between "I uploaded a file" and "the autonomous chain started."

We also built a second ingestion path directly from a user's Google Drive and Gmail, using an incremental OAuth scope request through the same Google sign-in the dashboard already uses, so one click covers both `drive.readonly` and `gmail.readonly`. That path watches for new or changed files, exports native Google Docs/Sheets/Slides to plain text, and feeds them into the exact same bucket and pipeline as a manual upload. It is fully built and code-complete, but currently disabled in the UI as "Coming Soon": Google's OAuth consent screen requires the app to be verified for restricted scopes like these, and verification requires owning and proving control of a domain, which this project does not have. The connect flow itself works (it stores a token successfully), but every real API call using those scopes gets silently rejected until that verification exists, so we chose to be honest about that in the product rather than ship a button that looks like it works and does not.

### The audit trail and the dashboard

Every decision any of the three agents makes, at every stage, is written to a Supabase `audit_log` table: which file, which stage, which status, a risk score, the reasoning, what actually changed, which source files were cited, and a timestamp. Nothing about the pipeline's behavior is invisible or only inferable from logs a human has to go dig through.

That table powers a live dashboard: a document list with live status, a detail view showing the full reasoning trail for any file, and a chat interface that answers questions about the knowledge base grounded in that real audit history through retrieval, not a generic model guessing. A notification bell in the header shows in-app alerts the moment something is quarantined or repaired, backed by Supabase Realtime, with an email notification sent through Resend at the same points, so a human can still be told when something needs attention, even though no human has to act for the pipeline to keep running.

### Before NoCap, after NoCap

Take one real example from our own test set. Someone uploads `remote_work_benefits_update.md`, claiming employees get a Rs 25,000 monthly work-from-home allowance. The real, approved policy has no such allowance at all.

**Before NoCap:** that document lands in the knowledge base next to everything else. The next employee who asks the company chatbot "what's my WFH allowance?" gets told Rs 25,000, confidently, because the chatbot has no way to know that document was never true. Multiply that by every stale or fabricated document sitting in a real company's wiki right now.

**After NoCap:** Inspector reads the document against the real `remote_work_policy.md`, finds the fabricated allowance, and marks it `needs_repair`. Repair rewrites it, grounded only in the approved source, removing the invented number entirely. Verifier re-checks the rewrite before anything ships. The employee asking that same question gets the correct answer, and the whole correction happened without anyone filing a ticket, flagging a doc, or reviewing anything by hand.

That is the actual shape of the product: not a chatbot that answers questions, a layer that makes sure every chatbot behind it is answering from something true.

### Try it yourself

- **Live, no login:** `https://atah-26-production.up.railway.app/demo` shows the real audit trail in real time, read straight from the same Supabase table the pipeline writes to.
- **One command, full run:** `python backend/run_demo.py` processes the ten canonical documents end to end and prints exactly which were approved, repaired, or quarantined, and why, including the security catch.

## How we built it

### The agents themselves

All three agents are Python modules sharing one pluggable LLM client (`backend/llm_client.py`). They call Gemini through the official `google-genai` SDK (one of the hackathon's explicitly qualifying Google Agent Frameworks under Section 6 of the rules, alongside ADK, Antigravity SDK, and GenKit, so we did not need to adopt ADK just to satisfy this requirement) with `response_schema` enforcing structured JSON output at the field level, which is what makes Inspector's "reject a hallucinated citation" defense possible in the first place: the model cannot bury an invented source name in a paragraph where nobody checks it, it has to put it in a field that gets validated every time.

### Event-driven orchestration, not a script chain

The single biggest architectural decision was refusing to let the pipeline be three scripts a person runs in order. That is not what "autonomous, no human in the loop" means, it just simulates it while a person babysits the terminal. Instead, the three transitions in the pipeline (a document was ingested, a repair is needed, a verification is needed) are three Google Cloud Pub/Sub topics. Each agent is a subscriber reacting to an event, not a function called by the previous stage:

```
new file appears -> nocap-document-ingested -> Inspector
  needs_repair?   -> nocap-repair-needed     -> Repair
  repaired?       -> nocap-verification-needed -> Verifier
```

This one Pub/Sub setup is also, deliberately, the project's Google Cloud infrastructure requirement, chosen because it is literally what the Taskmaster track's own "event-driven workflow... watching for a change" description is describing, not because it was the easiest box to check.

### Two working consumers for the same events

There are two separate things listening to those three topics, and both have actually been run, not just written:

1. **`backend/orchestrator.py`**, a long-running local process for demos, pulling from standard Pub/Sub subscriptions.
2. **Three Vercel serverless functions** (`frontend/api/pubsub/*.py`), one per topic, that Pub/Sub *pushes* HTTP requests to directly. This is what lets the pipeline run genuinely unattended in production, with no laptop process needing to stay alive. A dedicated GCP service account (`nocap-pubsub-push@...`) holds a scoped `roles/pubsub.publisher` grant so the Vercel functions can publish the next event downstream, and Pub/Sub's own service agent is separately granted `roles/iam.serviceAccountTokenCreator` on that account so Pub/Sub can mint signed OIDC tokens for its push requests. Every push handler verifies that token's signature, audience, and issuing email before it trusts the payload at all (`pubsub_verify.py`), so the endpoint cannot be spoofed by anyone who simply discovers its URL.

Because a Vercel function invocation shares no filesystem with the next one, the deployed copies of the three agents read and write Supabase Storage instead of local disk everywhere the CLI versions touch `incoming_docs/`, `repaired_documents/`, and `published_documents/` (`frontend/api/_lib/storage.py` is the one module that knows the bucket/prefix scheme, so every agent just calls `read_incoming()`, `write_repaired()`, `write_published()` without caring where the bytes actually live).

### Data layer and access control

Supabase holds three things with three different access shapes, on purpose, not by accident: the `audit_log` table has RLS enabled with insert/select policies for the public, browser-safe publishable key, since the dashboard needs to read it live client-side; the `incoming-uploads` Storage bucket is authenticated-only, since only a signed-in user should be able to add new documents; the `pipeline-output` bucket allows both `anon` and `authenticated` roles, since the Vercel functions writing to it authenticate with the same publishable key the rest of the app uses, not a privileged service-role key. A `source_connections` table (for the Drive/Gmail OAuth tokens) intentionally has *no* policy at all for the publishable key, because it holds real OAuth refresh tokens, and reads to it go through a separate service-role `admin_client.py` instead. Getting that last split wrong once (an earlier version read `source_connections` through the same client used for `audit_log`) silently returned zero rows everywhere it was read; see Challenges.

### The frontend

Next.js on Vercel, with Google, password, and magic-link sign-in through Supabase Auth. The document upload panel supports arbitrary file types and either individual files or an entire folder pick. The dashboard, notification bell, and chat all read live from Supabase, no polling loop the user has to trigger.

## Real results, not hypothetical claims

We ran Inspector across ten real test files, deliberately built to include both an obviously safe case and an adversarial one:

| File | Result |
|---|---|
| `business_travel_guide.md` | approved, published |
| `expense_claims_guide.md` | approved, published |
| `leave_request_guide.md` | approved, published |
| `remote_work_guide.md` | approved, published |
| `executive_travel_update.md` | needs_repair (wrong approval threshold, wrong flight class rule) |
| `expense_claims_update.md` | needs_repair (claimed a Rs 50,000 approval-free limit against an actual Rs 10,000 limit) |
| `leave_policy_update.md` | needs_repair (claimed unlimited leave carry-forward against an actual 5-day cap) |
| `remote_work_benefits_update.md` | needs_repair (fabricated a Rs 25,000/month WFH allowance the real policy does not have) |
| `remote_work_guide_copy.md` | quarantined (near duplicate) |
| `security_access_notice.md` | **quarantined, risk score 100** |

That last file is the one worth leading with in a demo: it did not just contain outdated information, it contained an actual, deliberately written prompt injection attempt aimed at manipulating the AI evaluator into force-approving it. Inspector caught and blocked it. That is a reproducible adversarial-robustness result we can show happening live, not a claim about what the system could theoretically catch in principle.

All four `needs_repair` documents were then run through Repair and came back correctly grounded in the real approved-source numbers, and the full chain (Inspector to Repair to Verifier, each hop a real Pub/Sub event) has been run live, start to finish, with zero manual per-stage commands, more than once: once purely locally against `orchestrator.py`, and once as an end-to-end smoke test against the deployed Vercel push pipeline, uploading a document through the real dashboard and watching it land in the real `published/` output with real, timestamped `audit_log` rows as proof.

## Challenges we ran into

**Making "autonomous" actually true, not simulated.** The first working version of this pipeline was three CLI scripts a person ran in sequence. It worked, but it was not what the Taskmaster track means by no human in the loop, it just hid the human one step earlier. Rebuilding it around Pub/Sub meant redesigning every stage to be safely triggerable on its own and to re-verify its own preconditions rather than trusting the previous stage blindly, which is why Repair re-confirms Inspector's verdict before it does anything.

**A real GCP billing wall.** We initially planned to deploy the pipeline to Cloud Run for an always-on hosted demo. The one-time setup (`gcloud services enable run.googleapis.com ...`) failed outright with `FAILED_PRECONDITION: Billing account not found`, because Cloud Run, Cloud Build, Artifact Registry, and Secret Manager all require a linked billing account even to operate inside free-tier limits, and this project's GCP project has none. Rather than attach billing purely for a demo convenience, we solved "runs unattended" a different way, routing the same Pub/Sub topics into Vercel serverless push functions instead, at zero additional billing, which satisfies the actual requirement (autonomous, unattended, real infrastructure) without the tradeoff.

**A GCP project migration mid-build.** The project originally lived under a GCP project id (`atah-505614`) that later became inaccessible from our Google account entirely (most likely created under a different one earlier in the process). Everything, Pub/Sub topics, subscriptions, and the service account, had to be recreated from scratch under a new project (`nocap-505709`) partway through the build.

**Duplicate pipeline runs from Pub/Sub's own delivery guarantee.** Every push handler only acknowledges a message after an LLM call finishes, which routinely takes longer than Pub/Sub's ack deadline. Pub/Sub then redelivers the same message while the first attempt is still running, and each pass logged its own `audit_log` row, at one point 178 Inspector rows for only 12 ingested files. That is expected at-least-once delivery behavior, not corruption, but it needed a real fix, not just an explanation: a Supabase-backed idempotency guard now atomically claims a message id before processing starts, so a redelivered copy of one already claimed is skipped rather than reprocessed, applied to all three pipeline handlers.

**A stale environment variable that only broke one hop.** During the live Vercel smoke test, a document sailed through Inspector fine (which does not depend on this variable) but failed publishing the next event with `404 Resource not found`. The cause was `GOOGLE_CLOUD_PROJECT` in Vercel's environment still pointing at the old, now-inaccessible project id from before the migration above. Fixing and redeploying resolved it completely, a reminder that a partial migration is invisible until the specific code path that depends on the stale value actually runs.

**An access-control bug that returned silently empty results.** `source_connections` (holding real OAuth tokens) intentionally has no RLS policy for the public key, but three call sites were reading it through the same client used for `audit_log`, which uses that public key. Every read came back zero rows, with no error, just silently wrong, until it was traced back to the RLS mismatch and fixed with a dedicated service-role client.

**Google's own verification requirements, not a bug we could fix.** The Drive/Gmail ingestion path is fully built and its OAuth connect flow succeeds, but every actual Drive/Gmail API call using those scopes gets silently dropped because Google requires domain-verified app review for restricted scopes, which this project cannot obtain without owning a verified domain. We chose to ship the feature as visibly "Coming Soon" rather than leave a button that looks functional and is not.

**A production regression we caught ourselves, hours before the deadline.** A teammate's merge into `main` silently reintroduced two already-fixed-once files, a dashboard page importing a hook that had been deleted, and a notification hook still wired to Firebase, which this project has never actually used (notifications run on Supabase). Every deploy since that merge landed had been failing outright. We found it, confirmed the correct versions of both files were already sitting fixed but uncommitted, verified a clean production build locally first, then shipped the fix, restoring the live dashboard before it could cost us a broken link in front of judges.

**Running out of free-tier model quota mid-build.** Gemini's free tier ran dry partway through development, so `backend/llm_client.py` was written to be provider-agnostic: `LLM_PROVIDER=openai` plus three env vars swaps the entire pipeline onto any OpenAI-compatible endpoint (we used Mistral's free tier) with no code changes, keeping the team unblocked without losing the actual Gemini requirement, since the switch back is one commented line once quota returns, which it has.

## Accomplishments that we're proud of

- **A real, live-caught prompt injection.** Not a hypothetical, not a unit test we wrote to make a slide look good: a document written to manipulate an AI evaluator, and Inspector caught it, scored it risk 100, and blocked it, in a run we can reproduce on demand.
- **The autonomous chain is proven twice, in two different runtimes.** Once purely local against real Pub/Sub subscriptions, and once as a fully unattended production deployment on Vercel, walked end to end in a live smoke test with real audit rows as evidence, not a diagram of how it would theoretically work.
- **We fixed our own production outage before it ever reached a judge.** Finding and shipping a fix for a silently broken production deploy, verified with a clean local build first, on the day of the deadline, is the kind of thing that is easy to skip and expensive to skip.
- **Everything runs on free tiers, by design, not by accident.** Gemini, Supabase, and Vercel's Hobby plan, and Google Cloud Pub/Sub's free quota, cover the entire pipeline. No billing account is attached to the GCP project at all. When Cloud Run needed one, we changed the architecture instead of reaching for a credit card, and the result (the Vercel push pipeline) is arguably the more interesting engineering decision anyway.
- **A defensive pipeline that does not trust its own model.** Inspector rejects verdicts that cite sources it was never given. Repair re-verifies Inspector's own verdict before acting on it. Verifier is explicitly told not to trust a repair just because it reads well. None of the three stages blindly passes the previous stage's output forward.

## What we learned

- **Structured output changes what "the model made a mistake" even means.** Once a verdict has to land in one of three schema-enforced fields instead of somewhere in a paragraph, it becomes possible to write defensive checks against the specific failure modes that matter, like a model citing evidence that does not exist, instead of trying to parse intent out of prose after the fact.
- **"Autonomous" is a design constraint on every single stage, not a feature you add at the end.** It means every stage has to be safe to trigger independently, has to re-verify the assumptions it is inheriting rather than trusting them, and has to tolerate being invoked more than once for the same input, because at-least-once delivery is not an edge case, it is the normal case.
- **Idempotency is not optional once you're event-driven.** We treated duplicate delivery as a curiosity the first time we saw it (178 rows for 12 files) and as a real bug the second time we thought about what it meant for a production system a judge might actually poke at.
- **A platform's own constraints (a billing wall, an OAuth verification requirement) are real design inputs, not obstacles to route around with a workaround that half-works.** The Cloud Run billing wall led to a genuinely better architecture. The Google Workspace verification wall led to an honest "Coming Soon" state instead of a broken Connect button.
- **The last mile of "no human in the loop" is easy to leave undone by accident.** The pipeline being autonomous once triggered is not the same claim as nothing ever needing a manual trigger, and it took a deliberate pass, closing the exact step where a document landing in storage did not yet start anything on its own, to make the whole claim actually true end to end.

## What's next for NoCap

- **Domain verification for the Drive/Gmail ingestion path.** The code is done; unlocking it in production is a business step (owning and verifying a domain with Google), not an engineering one.
- **Non-text document support.** The current pipeline reads text; Gemini's Files API would extend Inspector and Repair to PDFs, images, and other binary formats without changing the core decision logic.
- **Multiple, separately governed knowledge bases.** Right now `approved_sources/` is one flat directory; a real enterprise deployment would want per-team or per-department source sets with their own approval scope.
- **A self-serve UI for managing approved sources**, so a non-engineer can add or retire a ground-truth document without touching the repo.
- **A second, genuinely distinct entry for the Fortified Enterprise Fleet track**, if time allows, rather than relabeling this same project.

## Built With

google-genai (Gemini), Google Cloud Pub/Sub, Python, Next.js, Vercel, Supabase (Postgres, Storage, Auth, Realtime), Resend, Google OAuth (Drive/Gmail, currently gated on domain verification)

---

*Everything above describes real runs, not projected behavior. See `docs/PROJECT_STATUS.md` in the repo for the underlying evidence: the full audit_log results table, the live Pub/Sub proof, and the Vercel smoke test.*
