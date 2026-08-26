"""
NoCap — Audit Log

Writes every autonomous decision (Inspector, Repair, Verifier) to Supabase
so the pipeline has a real, queryable audit trail: which document, which
stage, what was decided, why, and when. The dashboard's live activity feed
reads from this same table.

This project's Google Cloud infrastructure requirement (the hackathon
requires at least one: Cloud Run, Cloud SQL, Firestore, GKE, or Pub/Sub) is
satisfied by Pub/Sub, not by this table, Supabase is not a Google Cloud
service.

Setup (Vercel env vars, same names as backend/.env):
    SUPABASE_URL=https://bsjjtbnovmbwpypfpilg.supabase.co
    SUPABASE_KEY=<publishable key, safe to use here>

If Supabase isn't configured, logging fails soft: a warning is printed once
and the pipeline keeps running without it.

Identical to backend/audit_log.py — kept in sync by hand, not imported
across the frontend/backend boundary, since Vercel's Python runtime only
sees files inside frontend/. See frontend/api/_lib's own note on this.
"""

import os
import sys
from datetime import datetime, timezone

_client = None
_warned = False
_table = "audit_log"


def _get_client():
    """Lazily create and cache the Supabase client. Returns None if
    Supabase isn't configured/reachable, after printing one warning."""
    global _client, _warned
    if _client is not None:
        return _client

    try:
        from supabase import create_client
    except ImportError:
        if not _warned:
            print(
                "[audit_log] supabase package not installed, audit logging "
                "disabled. Run: pip install supabase",
                file=sys.stderr,
            )
            _warned = True
        return None

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        if not _warned:
            print(
                "[audit_log] SUPABASE_URL/SUPABASE_KEY not set, "
                "audit logging disabled.",
                file=sys.stderr,
            )
            _warned = True
        return None

    try:
        _client = create_client(url, key)
        return _client
    except Exception as exc:  # noqa: BLE001 - any config failure should fail soft here
        if not _warned:
            print(f"[audit_log] Supabase unavailable ({exc}), audit logging disabled.", file=sys.stderr)
            _warned = True
        return None


def log_event(file_name: str, stage: str, result: dict) -> None:
    """Record one agent decision. stage is 'inspector', 'repair', or 'verifier'.

    Never raises: a logging failure should not take down the pipeline.
    """
    client = _get_client()
    if client is None:
        return

    # audit_log has fixed columns, only pass through fields that match.
    known_columns = {
        "status", "risk_score", "issues", "source_files", "reason",
        "changes_made", "remaining_issues", "published_path",
    }
    row = {k: v for k, v in result.items() if k in known_columns}
    row["file_name"] = file_name
    row["stage"] = stage
    row["logged_at"] = datetime.now(timezone.utc).isoformat()

    try:
        client.table(_table).insert(row).execute()
    except Exception as exc:  # noqa: BLE001
        print(f"[audit_log] failed to write event for {file_name} ({stage}): {exc}", file=sys.stderr)


def already_ingested_files() -> set[str]:
    """File names that have already been through Inspector at least once.
    Returns an empty set (fails open, not closed) if Supabase isn't reachable,
    so a logging outage never blocks new documents from being processed."""
    client = _get_client()
    if client is None:
        return set()

    try:
        resp = client.table(_table).select("file_name").eq("stage", "inspector").execute()
        return {row["file_name"] for row in resp.data}
    except Exception as exc:  # noqa: BLE001
        print(f"[audit_log] failed to read already-ingested files: {exc}", file=sys.stderr)
        return set()
