"""
NoCap — Pub/Sub push handler for nocap-verification-needed.

Push replacement for orchestrator.py's on_verification_needed. Runs
Verifier, the last gate — publishes to Storage's pipeline-output/published/
on pass, nothing further to trigger on either outcome.
"""

import base64
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "_lib"))

import inspector  # noqa: E402
import pubsub_verify  # noqa: E402
import verifier  # noqa: E402


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
            result = verifier.verify_document(file_name, client, sources)
            print(f"[verification-needed] verifier -> {file_name}: {result['status']}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"[verification-needed] failed for {file_name}: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
