"""
NoCap — Pub/Sub push handler for nocap-repair-needed.

Push replacement for orchestrator.py's on_repair_needed. Runs Repair, and
if it succeeds, publishes nocap-verification-needed for the next stage.
"""

import base64
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "_lib"))

import inspector  # noqa: E402
import pubsub_bus  # noqa: E402
import pubsub_dedup  # noqa: E402
import pubsub_verify  # noqa: E402
import repair  # noqa: E402

VERIFICATION_NEEDED_TOPIC = "nocap-verification-needed"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        audience = os.getenv("PUBSUB_PUSH_AUDIENCE", "")
        if not pubsub_verify.verify_push_request(self.headers.get("Authorization"), audience):
            self.send_response(401)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        message = body.get("message", {})
        data = base64.b64decode(message.get("data", "")).decode("utf-8")
        payload = json.loads(data)
        file_name = payload["file_name"]

        if not pubsub_dedup.claim(message.get("messageId")):
            print(f"[repair-needed] duplicate delivery for {file_name}, skipping", file=sys.stderr)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true, "duplicate": true}')
            return

        try:
            client = inspector.make_client()
            sources = inspector.load_approved_sources()
            result = repair.repair_document(file_name, client, sources)
            print(f"[repair-needed] repair -> {file_name}: {result['status']}", file=sys.stderr)
            if result["status"] == "repaired":
                pubsub_bus.publish(VERIFICATION_NEEDED_TOPIC, {"file_name": file_name})
        except Exception as exc:  # noqa: BLE001
            print(f"[repair-needed] failed for {file_name}: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
