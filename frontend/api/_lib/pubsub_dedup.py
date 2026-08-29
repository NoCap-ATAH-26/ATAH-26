"""
NoCap — Pub/Sub push idempotency guard.

A push subscription redelivers a message if the handler doesn't return 2xx
before Pub/Sub's ack deadline (~10s by default). Every push handler here
calls an LLM (Inspector/Repair/Verifier) before acking, which routinely
runs past that -- so the same message gets redelivered and reprocessed
while the first attempt is still running, each pass logging its own
audit_log row. claim() makes that safe: it atomically records a message's
ID in Supabase before processing starts, so a redelivered copy of a
message already being (or already) handled is detected and skipped.

Setup (.env): reuses SUPABASE_URL/SUPABASE_KEY, same as audit_log.py.
Requires a table (see docs/PUBSUB_DEDUP.sql for the exact statement):
    pubsub_dedup(message_id text primary key, claimed_at timestamptz)
"""

import sys

from audit_log import _get_client


def claim(message_id: str | None) -> bool:
    """Returns True if this message_id hasn't been seen before (proceed with
    processing), False if it's a redelivery of one already claimed (skip).

    Fails open (returns True) if Supabase isn't reachable or message_id is
    missing, so a dedup outage never blocks the pipeline -- redelivery
    duplicates are a wasted LLM call, not a correctness issue.
    """
    if not message_id:
        return True

    client = _get_client()
    if client is None:
        return True

    try:
        client.table("pubsub_dedup").insert({"message_id": message_id}).execute()
        return True
    except Exception as exc:  # noqa: BLE001 - unique-violation means a duplicate
        if "duplicate" in str(exc).lower() or "unique" in str(exc).lower():
            return False
        print(f"[pubsub_dedup] claim failed open for {message_id}: {exc}", file=sys.stderr)
        return True
