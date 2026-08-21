"""
NoCap — Incoming Document Watcher

This is the "watching for a change" half of the Taskmaster pattern: it
notices a new file in incoming_docs/ and publishes a nocap-document-ingested
event, which is what actually kicks the autonomous pipeline off. new document
shows up -> event published -> orchestrator.py takes it from there with no
human involved.

"New file" now has two sources, checked in this order on every poll:
1. sync_web_uploads() pulls in anything dropped through the dashboard's
   upload UI (Supabase Storage bucket 'incoming-uploads') into incoming_docs/.
2. find_new_files() then diffs incoming_docs/ (any file, any type) against
   what's already been through Inspector, same as before.

Usage:
    python publish_incoming.py            # publish events for every new file, once
    python publish_incoming.py --watch    # keep polling every 5s (good for a live demo:
                                           # drop a file into incoming_docs/ and watch it
                                           # get picked up without touching the terminal)
"""

import argparse
import os
import sys
import time

import audit_log
import inspector
import pubsub_bus

DOCUMENT_INGESTED_TOPIC = "nocap-document-ingested"

# Files uploaded through the dashboard's upload UI land here (Supabase
# Storage), not in incoming_docs/ directly — sync_web_uploads() bridges the
# two so they flow through the exact same pipeline as a locally-dropped file.
STORAGE_BUCKET = "incoming-uploads"

_storage_client = None
_storage_warned = False


def _get_storage_client():
    """Lazily create and cache the Supabase client for Storage access.
    Returns None (after one warning) if Supabase isn't configured/reachable,
    so a Storage outage never blocks locally-dropped files from publishing."""
    global _storage_client, _storage_warned
    if _storage_client is not None:
        return _storage_client

    try:
        from supabase import create_client
    except ImportError:
        if not _storage_warned:
            print(
                "[publish_incoming] supabase package not installed, skipping "
                "web-upload sync. Run: pip install supabase",
                file=sys.stderr,
            )
            _storage_warned = True
        return None

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        if not _storage_warned:
            print(
                "[publish_incoming] SUPABASE_URL/SUPABASE_KEY not set, skipping "
                "web-upload sync.",
                file=sys.stderr,
            )
            _storage_warned = True
        return None

    try:
        _storage_client = create_client(url, key)
        return _storage_client
    except Exception as exc:  # noqa: BLE001 - any config failure should fail soft here
        if not _storage_warned:
            print(f"[publish_incoming] Supabase Storage unavailable ({exc}), skipping web-upload sync.", file=sys.stderr)
            _storage_warned = True
        return None


def sync_web_uploads() -> int:
    """Pull files uploaded via the dashboard into incoming_docs/. A file
    already present locally is left alone (already synced, or was dropped
    there directly), so this is safe to call on every poll."""
    client = _get_storage_client()
    if client is None:
        return 0

    try:
        objects = client.storage.from_(STORAGE_BUCKET).list()
    except Exception as exc:  # noqa: BLE001
        print(f"[publish_incoming] failed to list {STORAGE_BUCKET}: {exc}", file=sys.stderr)
        return 0

    inspector.INCOMING_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    for obj in objects:
        name = obj.get("name")
        if not name:
            continue
        local_path = inspector.INCOMING_DOCUMENTS_DIR / name
        if local_path.exists():
            continue
        try:
            data = client.storage.from_(STORAGE_BUCKET).download(name)
            local_path.write_bytes(data)
            downloaded += 1
        except Exception as exc:  # noqa: BLE001
            print(f"[publish_incoming] failed to download {name}: {exc}", file=sys.stderr)
    return downloaded


def find_new_files() -> list[str]:
    already_seen = audit_log.already_ingested_files()
    all_files = {p.name for p in inspector.INCOMING_DOCUMENTS_DIR.iterdir() if p.is_file()}
    return sorted(all_files - already_seen)


def publish_new_files() -> int:
    sync_web_uploads()
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
