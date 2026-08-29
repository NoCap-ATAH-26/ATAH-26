"""
NoCap — Vercel Cron: renew the Gmail watch subscription.

Gmail's users.watch() silently stops delivering push notifications after 7
days if not renewed -- this re-registers it weekly (see the schedule in
vercel.json), well inside that window. Also seeds gmail_watch_state's
last_history_id from watch()'s own response the first time this ever runs,
since nothing else initializes that baseline (frontend/api/pubsub/
gmail-notify.py just skips a notification if it isn't set yet).
"""

import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "_lib"))

import gmail_client  # noqa: E402
from supabase import create_client  # noqa: E402

GMAIL_NOTIFY_TOPIC = "nocap-gmail-notify"


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Vercel Cron signs its own requests with CRON_SECRET -- this is the
        # only thing standing between this endpoint and anyone on the internet
        # re-registering the watch, so it isn't optional.
        expected = os.getenv("CRON_SECRET")
        if not expected or self.headers.get("Authorization") != f"Bearer {expected}":
            self.send_response(401)
            self.end_headers()
            return

        try:
            result = gmail_client.start_watch(GMAIL_NOTIFY_TOPIC)

            db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
            row = (
                db.table("gmail_watch_state")
                .select("last_history_id")
                .eq("id", True)
                .single()
                .execute()
            )
            if not row.data.get("last_history_id"):
                db.table("gmail_watch_state").update(
                    {"last_history_id": result["historyId"]}
                ).eq("id", True).execute()

            print(
                f"[renew-gmail-watch] renewed, expires {result.get('expiration')}",
                file=sys.stderr,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[renew-gmail-watch] failed: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
