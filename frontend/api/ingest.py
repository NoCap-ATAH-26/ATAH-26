"""
NoCap — Frontend-triggered ingestion trigger.

Closes the last manual step in the Vercel push pipeline. Previously, a
document landing in the 'incoming-uploads' bucket did nothing on its own,
someone had to publish nocap-document-ingested by hand (see
docs/PROJECT_STATUS.md's watcher open item, and the smoke test that stood
in for this). Now DocumentUpload.tsx calls this endpoint right after a
successful Storage upload, so the pipeline starts as part of the normal
upload action itself, not a separate manual command someone runs.

Confirms the file actually exists in 'incoming-uploads' before publishing,
so this endpoint can't be used to spam the pipeline with file names that
were never uploaded.
"""

import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "_lib"))

import pubsub_bus  # noqa: E402
import storage  # noqa: E402

DOCUMENT_INGESTED_TOPIC = "nocap-document-ingested"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
            file_name = body["file_name"]
        except (ValueError, KeyError):
            self.send_response(400)
            self.end_headers()
            return

        if not storage.incoming_exists(file_name):
            self.send_response(404)
            self.end_headers()
            return

        try:
            pubsub_bus.publish(DOCUMENT_INGESTED_TOPIC, {"file_name": file_name})
        except Exception as exc:  # noqa: BLE001
            print(f"[ingest] failed to publish for {file_name}: {exc}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
