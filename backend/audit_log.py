"""
NoCap — Audit Log

Writes every autonomous decision (Inspector, Repair, Verifier) to Firestore
so the pipeline has a real, queryable audit trail: which document, which
stage, what was decided, why, and when.

This is also the project's Google Cloud infrastructure component (the
hackathon requires at least one: Cloud Run, Cloud SQL, Firestore, GKE, or
Pub/Sub). Supabase is used elsewhere in this project for app-facing data,
but it does not count toward that requirement, Firestore does.

Setup (one-time, per machine that runs the pipeline):
    1. Create/select a GCP project with Firestore enabled (Native mode),
       via console.cloud.google.com or `gcloud firestore databases create`.
    2. Authenticate so the client library can find credentials, either:
         gcloud auth application-default login
       or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.
    3. Set GOOGLE_CLOUD_PROJECT in .env to that project's ID.

If Firestore isn't configured yet, logging fails soft: a warning is printed
once and the pipeline keeps running without it, so teammates without GCP
credentials set up locally aren't blocked from testing the agents.
"""

import os
import sys
from datetime import datetime, timezone

_client = None
_warned = False
_collection = "audit_log"


def _get_client():
    """Lazily create and cache the Firestore client. Returns None if
    Firestore isn't configured/reachable, after printing one warning."""
    global _client, _warned
    if _client is not None:
        return _client

    try:
        from google.cloud import firestore
    except ImportError:
        if not _warned:
            print(
                "[audit_log] google-cloud-firestore not installed, "
                "audit logging disabled. Run: pip install google-cloud-firestore",
                file=sys.stderr,
            )
            _warned = True
        return None

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    try:
        _client = firestore.Client(project=project_id) if project_id else firestore.Client()
        return _client
    except Exception as exc:  # noqa: BLE001 - any auth/config failure should fail soft here
        if not _warned:
            print(
                f"[audit_log] Firestore unavailable ({exc}), audit logging disabled. "
                "See backend/audit_log.py docstring for setup steps.",
                file=sys.stderr,
            )
            _warned = True
        return None


def log_event(file_name: str, stage: str, result: dict) -> None:
    """Record one agent decision. stage is 'inspector', 'repair', or 'verifier'.

    Never raises: a logging failure should not take down the pipeline.
    """
    client = _get_client()
    if client is None:
        return

    try:
        doc = {
            **result,
            "file_name": file_name,
            "stage": stage,
            "logged_at": datetime.now(timezone.utc),
        }
        client.collection(_collection).add(doc)
    except Exception as exc:  # noqa: BLE001
        print(f"[audit_log] failed to write event for {file_name} ({stage}): {exc}", file=sys.stderr)
