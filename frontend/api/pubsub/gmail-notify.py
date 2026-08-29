"""
NoCap — Pub/Sub push handler for nocap-gmail-notify.

Gmail's own push notification (registered via gmail_client.start_watch())
lands here whenever the watched inbox changes -- unlike the other three
handlers this isn't "here's the one document," just "something changed, go
check." Pulls every attachment on every message added since the last known
historyId, drops each into incoming-uploads, and publishes
nocap-document-ingested for each one exactly as a dashboard upload would --
from that point on it's indistinguishable from a manual upload.
"""

import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "_lib"))

import gmail_client  # noqa: E402
import pubsub_bus  # noqa: E402
import pubsub_verify  # noqa: E402
import storage  # noqa: E402
from supabase import create_client  # noqa: E402

DOCUMENT_INGESTED_TOPIC = "nocap-document-ingested"


def _admin_db():
    return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        audience = os.getenv("PUBSUB_PUSH_AUDIENCE", "")
        if not pubsub_verify.verify_push_request(self.headers.get("Authorization"), audience):
            self.send_response(401)
            self.end_headers()
            return

        # Gmail's own notification body ({emailAddress, historyId}) isn't used --
        # gmail_watch_state's stored historyId is the resume point, not whatever
        # this one notification happens to carry (notifications can coalesce).
        length = int(self.headers.get("Content-Length", 0))
        self.rfile.read(length)

        try:
            db = _admin_db()
            row = (
                db.table("gmail_watch_state")
                .select("last_history_id")
                .eq("id", True)
                .single()
                .execute()
            )
            start_history_id = row.data["last_history_id"]
            if not start_history_id:
                print("[gmail-notify] no baseline historyId yet, skipping", file=sys.stderr)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"ok": true}')
                return

            attachments, new_history_id = gmail_client.fetch_new_attachments(start_history_id)

            for file_name, data in attachments:
                storage.write_incoming(file_name, data)
                pubsub_bus.publish(DOCUMENT_INGESTED_TOPIC, {"file_name": file_name})
                print(f"[gmail-notify] ingested {file_name} from email", file=sys.stderr)

            db.table("gmail_watch_state").update(
                {"last_history_id": new_history_id}
            ).eq("id", True).execute()
        except Exception as exc:  # noqa: BLE001
            print(f"[gmail-notify] failed: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
