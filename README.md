# NoCap

**No chatbot lies.**

Someone hid a prompt injection inside a company policy document and tried to trick the AI reviewer into approving itself. NoCap caught it. Quarantined it. Risk score 100. That is not a staged demo. That is the pipeline doing exactly what it was built to do, on a real file, with zero human in the loop.

Every knowledge base your chatbot pulls from is quietly rotting. Outdated numbers, fabricated policies, near duplicate junk, and occasionally something actively hostile. NoCap sits in front of that pile and reads every new document before your chatbot ever gets near it. It decides, on its own, whether something is safe to publish, needs fixing, or needs to be blocked. No review queue. No waiting on a human.

Built for the All Things Agentic Hackathon, Taskmaster track.

## How it thinks

Three agents, one event driven chain, powered by Gemini 3.5 Flash.

**Inspector** reads a new document against your approved sources and returns one of three verdicts: approved, needs repair, or quarantined. It rejects its own output if it cites a source that was never given to it, so it cannot talk its way past its own guardrails.

**Repair** only touches what Inspector flagged as fixable. It rewrites the document grounded strictly in approved sources. Nothing invented, nothing guessed.

**Verifier** is the skeptical last check. It rereads the repair and refuses to rubber stamp anything that just looks polished. Pass, and it publishes. Fail, and it stays quarantined with the exact issues listed.

A document lands, Pub/Sub fires, the right agent wakes up. No cron job, no person clicking run.

## What it actually caught

Not hypothetical. This ran against real files:

* A document claiming a ₹50,000 approval free expense limit. The real policy caps it at ₹10,000.
* A document promising unlimited leave carry forward. Real policy: five days, no more.
* A fabricated ₹25,000 monthly remote work allowance that does not exist anywhere in the actual policy.
* A near duplicate document adding nothing, quarantined on sight.
* One document engineered to manipulate the AI evaluator into approving it. Caught. Blocked. Risk score 100.

Every one of those quietly makes it into most company chatbots today. Not into this one.

## Stack

* Gemini 3.5 Flash via the Google GenAI SDK, doing every classification and rewrite
* Google Cloud Pub/Sub, the actual nervous system between agents
* Supabase, the live audit trail every decision gets logged to
* Next.js dashboard on Vercel, watching the pipeline think in real time
* An open model chat layer (Groq, OpenAI compatible) so asking the pipeline questions costs nothing to run

## Run it

**Backend**

```
pip install -r backend/requirements.txt
```

Create `.env` in the repo root:

```
GEMINI_API_KEY=your key
SUPABASE_URL=your project url
SUPABASE_KEY=your service key
GOOGLE_CLOUD_PROJECT=your gcp project id
```

One time Pub/Sub setup, once billing is enabled on the project:

```
gcloud config set project YOUR_PROJECT_ID
gcloud services enable pubsub.googleapis.com

for t in nocap-document-ingested nocap-repair-needed nocap-verification-needed; do
  gcloud pubsub topics create "$t"
  gcloud pubsub subscriptions create "${t}-sub" --topic="$t"
done
```

(These exact topic names, hyphens included, are what the code actually publishes to and listens on. Do not rename them.)

Start the pipeline:

```
python backend/orchestrator.py
```

In another terminal, feed it documents:

```
python backend/publish_incoming.py --watch
```

Drop a file into `incoming_docs/` while that is running and watch it get caught live.

**Frontend**

```
cd frontend
npm install
npm run dev
```

Needs its own `.env.local`, see `docs/CHAT_SETUP.md` for the chat layer's free model options.

## Where things stand

Inspector, Repair, and Verifier all run and have been proven against real files, including a real adversarial input. The dashboard and chat are live. Cloud Run deployment and the live Pub/Sub topic setup are the remaining piece before the full event driven loop runs unattended in production instead of locally.
