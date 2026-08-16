"""
NoCap — Incoming Document Watcher

This is the "watching for a change" half of the Taskmaster pattern: it
notices a new file in incoming_docs/ and publishes a nocap-document-ingested
event, which is what actually kicks the autonomous pipeline off. In a real
deployment this would be a webhook/upload trigger instead of folder polling,
but the effect is the same: new document shows up -> event published ->
orchestrator.py takes it from there with no human involved.

Usage:
    python publish_incoming.py            # publish events for every new file, once
    python publish_incoming.py --watch    # keep polling every 5s (good for a live demo:
                                           # drop a file into incoming_docs/ and watch it
                                           # get picked up without touching the terminal)
"""

import argparse
import sys
import time

import audit_log
import inspector
import pubsub_bus

DOCUMENT_INGESTED_TOPIC = "nocap-document-ingested"


def find_new_files() -> list[str]:
    already_seen = audit_log.already_ingested_files()
    all_files = {p.name for p in inspector.INCOMING_DOCUMENTS_DIR.glob("*.md")}
    return sorted(all_files - already_seen)


def publish_new_files() -> int:
    new_files = find_new_files()
    for file_name in new_files:
        pubsub_bus.publish(DOCUMENT_INGESTED_TOPIC, {"file_name": file_name})
    return len(new_files)


def main():
    parser = argparse.ArgumentParser(description="NoCap incoming-document watcher")
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Keep polling incoming_docs/ every --interval seconds instead of running once.",
    )
    parser.add_argument("--interval", type=float, default=5.0, help="Poll interval in seconds (--watch only).")
    args = parser.parse_args()

    if not args.watch:
        count = publish_new_files()
        print(f"Published {count} new document(s).", file=sys.stderr)
        return

    print(f"Watching {inspector.INCOMING_DOCUMENTS_DIR} every {args.interval}s ... (Ctrl+C to stop)", file=sys.stderr)
    try:
        while True:
            count = publish_new_files()
            if count:
                print(f"Published {count} new document(s).", file=sys.stderr)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("Stopped.", file=sys.stderr)


if __name__ == "__main__":
    main()
