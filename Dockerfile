# NoCap orchestrator, deployed to Cloud Run. See docs/CLOUD_RUN_DEPLOY.md.
#
# Layout mirrors the repo root exactly (backend/, approved_sources/,
# incoming_docs/ as siblings) because backend/inspector.py resolves its
# paths relative to its own file location, same as it does locally.
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY approved_sources/ approved_sources/
COPY incoming_docs/ incoming_docs/

ENV PORT=8080
EXPOSE 8080

CMD ["python", "backend/cloud_run_main.py"]
