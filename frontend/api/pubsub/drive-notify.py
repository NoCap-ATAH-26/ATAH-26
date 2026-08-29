"""
NoCap — webhook handler for Google Drive change notifications.

Unlike the other handlers in this folder, this isn't a Pub/Sub push --
Drive delivers change notifications as a direct HTTPS POST to the address
registered in drive_client.start_watch(), carrying no signed payload at
all, just headers (X-Goog-Channel-ID/Token/Resource-State/Message-Number).
Authenticity is verified by checking X-Goog-Channel-Token against the
random token we generated and stored at watch-registration time, the
mechanism Google's own docs recommend for this API.

The notification itself says nothing about *what* changed, just "go
check" -- drive_client.fetch_new_files() pages through the Changes API
from the last stored page token to find out.
"""

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "_lib"))

import drive_client  # noqa: E402
import pubsub_bus  # noqa: E402
import pubsub_dedup  # noqa: E402
import storage  # noqa: E402
from admin_client import get_admin_client  # noqa: E402

DOCUMENT_INGESTED_TOPIC = "nocap-document-ingested"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Drive always sends a body-less POST; headers carry everything.
        length = int(self.headers.get("Content-Length", 0))
        if length:
            self.rfile.read(length)

        channel_id = self.headers.get("X-Goog-Channel-ID")
        channel_token = self.headers.get("X-Goog-Channel-Token")
        resource_state = self.headers.get("X-Goog-Resource-State")
        message_number = self.headers.get("X-Goog-Message-Number")

        client = get_admin_client()
        if client is None:
            self.send_response(200)
            self.end_headers()
            return

        row = (
            client.table("source_connections")
            .select("config")
            .eq("source", "google")
            .single()
            .execute()
        )
        config = (row.data or {}).get("config") or {}

        if not channel_token or channel_token != config.get("drive_channel_token"):
            print("[drive-notify] channel token mismatch, rejecting", file=sys.stderr)
            self.send_response(401)
            self.end_headers()
            return

        # "sync" fires once immediately after watch() registers -- nothing to
        # process yet, just acknowledge it.
        if resource_state == "sync":
            self.send_response(200)
            self.end_headers()
            return

        if not pubsub_dedup.claim(f"drive:{channel_id}:{message_number}"):
            print("[drive-notify] duplicate delivery, skipping", file=sys.stderr)
            self.send_response(200)
            self.end_headers()
            return

        try:
            page_token = config.get("drive_page_token") or drive_client.start_page_token()
            files, new_page_token = drive_client.fetch_new_files(page_token)

            for file_name, data in files:
                storage.write_incoming(file_name, data)
                pubsub_bus.publish(DOCUMENT_INGESTED_TOPIC, {"file_name": file_name})
                print(f"[drive-notify] ingested {file_name} from Drive", file=sys.stderr)

            config["drive_page_token"] = new_page_token
            client.table("source_connections").update({"config": config}).eq(
                "source", "google"
            ).execute()
        except Exception as exc:  # noqa: BLE001
            print(f"[drive-notify] failed: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
