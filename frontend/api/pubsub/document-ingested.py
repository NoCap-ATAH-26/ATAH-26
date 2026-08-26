"""
NoCap — Pub/Sub push handler for nocap-document-ingested.

Pub/Sub calls this over HTTP the instant a new-document event is
published (see backend/publish_incoming.py / the upcoming URL-watcher for
what publishes that event) — this is the "push" replacement for
orchestrator.py's on_document_ingested pull-loop handler. Runs Inspector,
and if the verdict is needs_repair, publishes nocap-repair-needed so the
next stage's push handler picks it up. Nothing here is triggered by a
human between stages.
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
import pubsub_verify  # noqa: E402

REPAIR_NEEDED_TOPIC = "nocap-repair-needed"


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

        try:
            client = inspector.make_client()
            sources = inspector.load_approved_sources()
            result = inspector.inspect_document(file_name, client, sources)
            print(f"[document-ingested] inspector -> {file_name}: {result['status']}", file=sys.stderr)
            if result["status"] == "needs_repair":
                pubsub_bus.publish(REPAIR_NEEDED_TOPIC, {"file_name": file_name})
        except Exception as exc:  # noqa: BLE001
            print(f"[document-ingested] failed for {file_name}: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
