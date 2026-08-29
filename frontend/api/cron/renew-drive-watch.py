"""
NoCap — Vercel Cron: renew the Google Drive change-watch subscription.

Drive's changes.watch() expires after at most a few days (Google doesn't
publish a fixed number the way Gmail's 7-day limit is documented, so this
runs on the same weekly schedule as renew-gmail-watch.py, comfortably
inside any observed window) -- see the schedule in vercel.json.

Generates a fresh channel_id/channel_token pair on every run (Drive
requires a new channel id per watch() call; re-using one is rejected)
and stores both alongside the current page token in source_connections
.config, which drive-notify.py reads to verify requests and resume
paging.

Setup (.env):
    DRIVE_WEBHOOK_URL=https://<prod-domain>/api/pubsub/drive-notify
"""

import os
import secrets
import sys
import uuid
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "_lib"))

import drive_client  # noqa: E402
from admin_client import get_admin_client  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        expected = os.getenv("CRON_SECRET")
        if not expected or self.headers.get("Authorization") != f"Bearer {expected}":
            self.send_response(401)
            self.end_headers()
            return

        webhook_url = os.getenv("DRIVE_WEBHOOK_URL")
        if not webhook_url:
            print("[renew-drive-watch] DRIVE_WEBHOOK_URL not set, skipping", file=sys.stderr)
            self.send_response(200)
            self.end_headers()
            return

        client = get_admin_client()
        if client is None:
            self.send_response(200)
            self.end_headers()
            return

        row = (
            client.table("source_connections")
            .select("status, config")
            .eq("source", "google")
            .single()
            .execute()
        )
        if not row.data or row.data.get("status") != "connected":
            print("[renew-drive-watch] Google not connected, skipping", file=sys.stderr)
            self.send_response(200)
            self.end_headers()
            return

        config = row.data.get("config") or {}

        try:
            page_token = config.get("drive_page_token") or drive_client.start_page_token()
            channel_id = str(uuid.uuid4())
            channel_token = secrets.token_urlsafe(32)

            result = drive_client.start_watch(webhook_url, channel_id, channel_token, page_token)

            config["drive_page_token"] = page_token
            config["drive_channel_id"] = channel_id
            config["drive_channel_token"] = channel_token
            config["drive_channel_expiration"] = result.get("expiration")
            client.table("source_connections").update({"config": config}).eq(
                "source", "google"
            ).execute()

            print(f"[renew-drive-watch] renewed, expires {result.get('expiration')}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"[renew-drive-watch] failed: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
