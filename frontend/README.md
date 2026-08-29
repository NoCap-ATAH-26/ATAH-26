# NoCap

**The autonomous truth layer for enterprise AI.**

NoCap protects employee policy information from incorrect, outdated, duplicate, unsafe, or AI-generated documents. It compares incoming documents against official company policy, then autonomously approves, quarantines, repairs, verifies, and logs every decision — so employees never act on policy information that's wrong.

Built for the **All Things Agentic Hackathon** — Taskmaster track.

---

## The problem

Enterprise policy documentation drifts. A benefits guide gets copy-pasted and quietly loses accuracy. A well-meaning update introduces a claim that contradicts official policy. A near-duplicate file gets uploaded twice. None of this is malicious — but an employee who trusts the wrong document can make a costly decision based on it.

NoCap catches this automatically, before an employee ever sees the document.

## How it works

```
Incoming document
      │
      ▼
┌─────────────┐     conflicts with policy?
│  Inspector  │ ──────────────────────────► needs_repair
│             │ ──────────────────────────► quarantined (unsafe/duplicate)
│             │ ──────────────────────────► approved
└─────────────┘
      │ needs_repair
      ▼
┌─────────────┐
│    Repair    │  rewrites using ONLY official policy sources
└─────────────┘
      │
      ▼
┌─────────────┐     still wrong? → quarantined, nothing published
│   Verifier   │
│              │ ──► clean? → published_documents/
└─────────────┘
      │
      ▼
  Firestore audit log (every stage, every decision, timestamped)
```

Three independent agents, each with one job:

- **Inspector** (`backend/inspector.py`) — compares an incoming document against every approved policy source and classifies it as `approved`, `needs_repair`, or `quarantined`, citing exactly which source and claim triggered the decision.
- **Repair** (`backend/repair.py`) — for `needs_repair` documents only, produces a corrected replacement grounded strictly in approved sources. Refuses to touch anything Inspector didn't flag as repairable.
- **Verifier** (`backend/verifier.py`) — re-checks every repair, strictly, before anything is allowed to publish. If the repair doesn't hold up, nothing goes live.

Every agent enforces structured JSON output via Gemini's `response_schema` (not regex-parsed text), and validates that cited sources actually exist — so a hallucinated citation is rejected before it ever reaches the audit log.

## Tech stack

| Requirement | What we use |
|---|---|
| Gemini 3.5+ (API or Vertex AI) | `gemini-3.5-flash` via the Gemini API |
| Google Agent Framework | Google **GenAI SDK** (`google-genai`) — used in every backend agent |
| Google Cloud infrastructure | **Cloud Firestore** — full audit trail, every stage, every decision |

Full compliance breakdown: [`docs/HACKATHON_COMPLIANCE.md`](docs/HACKATHON_COMPLIANCE.md)

Frontend: Next.js, deployed on Vercel, with Supabase for authentication and a live dashboard reading directly from Firestore.

## Project structure

```
approved_sources/       official policy documents (source of truth)
incoming_docs/           test documents to be evaluated
repaired_documents/     output of the Repair agent
published_documents/    output of the Verifier agent (only clean, verified docs)
backend/
  inspector.py
  repair.py
  verifier.py
  firestore_logger.py    shared Firestore audit logging (--log flag)
frontend/
  src/app/dashboard/     live audit dashboard (Firestore-backed)
  src/lib/                Supabase + Firebase clients
docs/
  HACKATHON_COMPLIANCE.md
```

## Running it

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install google-genai python-dotenv google-cloud-firestore

# .env with GEMINI_API_KEY=...

python inspector.py remote_work_benefits_update.md
python inspector.py --all --log        # run + log every incoming document
python repair.py --all --log           # repair everything Inspector flagged
python verifier.py --all --log         # verify + publish everything repaired
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the six `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local` — see `frontend/src/lib/firebase.ts` for setup details.

Visit `/dashboard` for the live audit view.

## Team

Built by [Namyaraj Rawat] and [Bhumika Singh] for the All Things Agentic Hackathon.