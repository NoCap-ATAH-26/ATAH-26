"""
NoCap — Cloud Run entrypoint

Cloud Run expects a container that serves HTTP on $PORT and can scale to
zero between requests. This pipeline is the opposite of that by design --
two long-running background loops:

- orchestrator.main(): blocks forever pulling from the three Pub/Sub
  subscriptions (the "autonomous routing" half of Taskmaster).
- a watch loop over publish_incoming.publish_new_files(): polls
  incoming_docs/ and the dashboard's upload bucket every few seconds for
  new documents (the "watching for a change" half).

Both run in background threads; the only thing actually served on $PORT is
a trivial health check, purely so Cloud Run's startup/liveness probes pass.
Deploy with --min-instances=1 so the container (and these threads) stays
alive with no incoming HTTP requests -- Cloud Run would otherwise scale it
to zero when idle and kill both loops along with it.

See docs/CLOUD_RUN_DEPLOY.md for the actual deploy commands.

Documents published/repaired by this container are NOT durable -- Cloud
Run's filesystem is ephemeral and wiped on restart/redeploy. The audit
trail in Supabase (audit_log) is the actual durable record; local files
here are just this run's working copy, same as on a laptop.
"""

import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import orchestrator
import publish_incoming

WATCH_INTERVAL_SECONDS = 5.0


class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"NoCap orchestrator is running.\n")

    def log_message(self, *_args):
        pass  # Cloud Run already captures stdout/stderr; skip the default access log.


def _watch_loop():
    while True:
        count = publish_incoming.publish_new_files()
        if count:
            print(f"[cloud_run_main] published {count} new document(s)", file=sys.stderr)
        time.sleep(WATCH_INTERVAL_SECONDS)


def main():
    threading.Thread(target=orchestrator.main, daemon=True, name="orchestrator").start()
    threading.Thread(target=_watch_loop, daemon=True, name="watch-incoming").start()

    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), _HealthHandler)
    print(f"[cloud_run_main] health endpoint listening on :{port}", file=sys.stderr)
    server.serve_forever()


if __name__ == "__main__":
    main()
