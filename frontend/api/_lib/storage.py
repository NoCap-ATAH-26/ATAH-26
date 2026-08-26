"""
NoCap — Storage-backed document I/O for the deployed (Vercel) pipeline.

backend/inspector.py, repair.py, and verifier.py read/write local disk
(incoming_docs/, repaired_documents/, published_documents/) because
orchestrator.py is one long-running process with its own persistent disk.
A Vercel serverless function has no such thing: nothing written during one
invocation is guaranteed to exist for the next, and there's no shared disk
between separate function invocations at all. So the deployed copies of
those three agents (in this same frontend/api/_lib/) use Supabase Storage
instead everywhere the CLI versions touch a local folder:

    incoming_docs/         -> 'incoming-uploads' bucket (already existed,
                               dashboard uploads already land here)
    repaired_documents/    -> 'pipeline-output' bucket, repaired/<file>
    published_documents/   -> 'pipeline-output' bucket, published/<file>

Same bucket/prefix scheme for every stage, so this one module is the only
place that knows about Storage specifics; the adapted agents just call
read_incoming(), write_repaired(), read_repaired(), write_published().
"""

import os

INCOMING_BUCKET = "incoming-uploads"
OUTPUT_BUCKET = "pipeline-output"

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL/SUPABASE_KEY not set. The deployed pipeline needs "
            "Storage for document I/O, unlike the local CLI version."
        )
    _client = create_client(url, key)
    return _client


def read_incoming(file_name: str) -> bytes:
    client = _get_client()
    return client.storage.from_(INCOMING_BUCKET).download(file_name)


def read_repaired(file_name: str) -> str | None:
    """Returns the repaired text, or None if no repair exists yet (mirrors
    the local version's `if not repaired_path.exists()` check)."""
    client = _get_client()
    try:
        data = client.storage.from_(OUTPUT_BUCKET).download(f"repaired/{file_name}")
    except Exception:  # noqa: BLE001 - Storage raises on missing object, not a typed 404
        return None
    return data.decode("utf-8")


def write_repaired(file_name: str, text: str) -> str:
    """Returns the Storage path, stored in audit_log the same way the local
    version stores a relative filesystem path."""
    client = _get_client()
    path = f"repaired/{file_name}"
    client.storage.from_(OUTPUT_BUCKET).upload(
        path, text.encode("utf-8"), {"upsert": "true"}
    )
    return f"{OUTPUT_BUCKET}/{path}"


def write_published(file_name: str, data: bytes) -> str:
    client = _get_client()
    path = f"published/{file_name}"
    client.storage.from_(OUTPUT_BUCKET).upload(path, data, {"upsert": "true"})
    return f"{OUTPUT_BUCKET}/{path}"
