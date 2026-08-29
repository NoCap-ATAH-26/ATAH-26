"""
NoCap — reads OAuth connection state written by the "Connect Sources" page
(frontend/src/app/connect/*/callback routes), so backend clients
(gmail_client.py, drive_client.py, ...) can use a token a user granted
through the browser instead of only a manually-configured env var.
"""

import sys

from audit_log import _get_client


def get_connection(source: str) -> dict | None:
    """Returns the source_connections row for `source` if it's connected and
    has a refresh token, else None (never raises -- callers fall back)."""
    client = _get_client()
    if client is None:
        return None

    try:
        row = (
            client.table("source_connections")
            .select("*")
            .eq("source", source)
            .single()
            .execute()
        )
        data = row.data
        if not data or data.get("status") != "connected" or not data.get("refresh_token"):
            return None
        return data
    except Exception as exc:  # noqa: BLE001
        print(f"[source_connections] failed to read {source}: {exc}", file=sys.stderr)
        return None
