#!/bin/sh
# Railway worker entrypoint, run from the repo root (inspector.py resolves
# approved_sources/, incoming_docs/, and published_documents/ one level up
# from backend/, so this service's root directory must be the whole repo,
# not backend/ alone). cd into this script's own directory first so the
# relative `python orchestrator.py` below works regardless of Railway's cwd.
cd "$(dirname "$0")"

# Railway env vars are plain strings, not files, so the GCP service account
# key is pasted into GOOGLE_APPLICATION_CREDENTIALS_JSON (same var name
# already reserved in .env) and written to disk here before orchestrator.py
# starts — google-cloud-pubsub only accepts GOOGLE_APPLICATION_CREDENTIALS
# as a file path, not raw JSON.
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
  echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /tmp/gcp-key.json
  export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp-key.json
fi
exec python orchestrator.py
