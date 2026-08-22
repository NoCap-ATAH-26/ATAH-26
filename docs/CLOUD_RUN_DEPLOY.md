# Deploying the orchestrator to Cloud Run

`backend/orchestrator.py` blocks forever pulling from Pub/Sub — the opposite
of Cloud Run's usual request-driven model. `backend/cloud_run_main.py` wraps
it: the orchestrator and the incoming-document watch loop both run in
background threads, and the only thing actually served on `$PORT` is a
trivial health check purely so Cloud Run's probes pass. See that file's
docstring for the full reasoning.

Must run from **local PowerShell, in the repo root** — Cloud Shell doesn't
have this codebase, and `gcloud run deploy --source` needs the actual source
tree to upload.

Every `YOUR_*` placeholder below is a real value already sitting in the repo
root's `.env` (gitignored, not this file) — copy it from there.

## One-time setup

```bash
gcloud config set project nocap-505709

gcloud services enable run.googleapis.com cloudbuild.googleapis.com ^
  artifactregistry.googleapis.com secretmanager.googleapis.com

echo YOUR_GEMINI_API_KEY | gcloud secrets create nocap-gemini-api-key --data-file=-
echo YOUR_MISTRAL_API_KEY | gcloud secrets create nocap-mistral-api-key --data-file=-
```

(Re-running `secrets create` on an existing secret fails — use
`gcloud secrets versions add nocap-gemini-api-key --data-file=-` instead if
either key ever rotates.)

## Deploy

```bash
gcloud run deploy nocap-orchestrator ^
  --source . ^
  --region us-central1 ^
  --no-allow-unauthenticated ^
  --min-instances=1 --max-instances=1 ^
  --memory=512Mi ^
  --set-env-vars GOOGLE_CLOUD_PROJECT=nocap-505709,SUPABASE_URL=https://bsjjtbnovmbwpypfpilg.supabase.co,SUPABASE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY,LLM_PROVIDER=openai,LLM_BASE_URL=https://api.mistral.ai/v1,LLM_MODEL=mistral-small-latest ^
  --set-secrets GEMINI_API_KEY=nocap-gemini-api-key:latest,LLM_API_KEY=nocap-mistral-api-key:latest
```

`--no-allow-unauthenticated`: nothing needs to call this service's HTTP
endpoint from outside — it only exists for Cloud Run's own health probes.
`--min-instances=1 --max-instances=1`: exactly one instance, always running.
Without `min-instances`, Cloud Run scales this to zero when idle and kills
both background loops with it. `max-instances=1` avoids multiple instances
redundantly polling `incoming_docs/`/Storage for new files at once.

Once `LLM_PROVIDER=openai` (Mistral) gets removed from `.env` locally
(Gemini quota back), redeploy without that var and without `LLM_API_KEY` in
`--set-secrets`, or the deployed service will keep running on Mistral even
after local dev switches back.

## Grant permissions

The deploy command above creates a runtime service account if one doesn't
already have access; grant it what it actually needs:

```bash
for /f %i in ('gcloud projects describe nocap-505709 --format="value(projectNumber)"') do set PROJECT_NUMBER=%i
set SA=%PROJECT_NUMBER%-compute@developer.gserviceaccount.com

gcloud projects add-iam-policy-binding nocap-505709 --member="serviceAccount:%SA%" --role="roles/pubsub.editor"
gcloud projects add-iam-policy-binding nocap-505709 --member="serviceAccount:%SA%" --role="roles/secretmanager.secretAccessor"
```

(That's `cmd.exe` batch syntax for capturing the project number — if running
from PowerShell directly instead of a `.bat`, use:
`$PROJECT_NUMBER = gcloud projects describe nocap-505709 --format="value(projectNumber)"`
then reference `"$PROJECT_NUMBER-compute@developer.gserviceaccount.com"`.)

## Verify it's actually running

```bash
gcloud run services describe nocap-orchestrator --region us-central1 --format="value(status.url)"
gcloud run services logs read nocap-orchestrator --region us-central1 --limit=50
```

The logs should show the same `[orchestrator] running, waiting for events on
all three subscriptions ...` line we saw running locally. From there, the
real test: upload a document through the dashboard's upload UI (or drop one
via the Storage bucket directly) and watch `audit_log` pick up new rows with
no laptop, no local Python process, no human touching anything.

## Known limitation

Documents this container publishes/repairs to local disk are **not
durable** — Cloud Run's filesystem is ephemeral and wiped on restart or
redeploy. `audit_log` in Supabase is the real, durable record; local files
here are just this run's working copy, same as on a laptop.
