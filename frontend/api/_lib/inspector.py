"""
NoCap — Inspector Agent (deployed/Storage-backed copy)

Same decision logic as backend/inspector.py: compares an incoming document
against the approved policy sources and returns approved / needs_repair /
quarantined. The only difference is where documents live — this copy runs
inside a Vercel push-handler function (one invocation per Pub/Sub message,
no persistent disk between invocations), so it reads/writes Supabase
Storage via storage.py instead of local incoming_docs/ and
published_documents/. See frontend/api/_lib/storage.py's docstring for why.

Kept in sync with backend/inspector.py by hand, not imported across the
frontend/backend boundary — Vercel's Python runtime only sees files inside
frontend/, and backend/ lives outside that. Two copies is real drift risk
if you change the prompt/schema in one and forget the other; worth checking
both when you do.
"""

import os
import tempfile
from pathlib import Path

from google import genai
from google.genai import types

import audit_log
import llm_client
import storage

load_env = None  # Vercel injects env vars directly; no .env file to load here.

MODEL = "gemini-3.5-flash"

APPROVED_SOURCES_DIR = Path(__file__).resolve().parent / "approved_sources"

VALID_STATUSES = {"approved", "needs_repair", "quarantined"}

RESULT_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "file_name": types.Schema(type=types.Type.STRING),
        "status": types.Schema(
            type=types.Type.STRING,
            enum=["approved", "needs_repair", "quarantined"],
        ),
        "risk_score": types.Schema(
            type=types.Type.INTEGER,
            description="0-100. Higher means more severe policy conflict or risk.",
        ),
        "issues": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Short, specific list of problems found (empty if none).",
        ),
        "source_files": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Approved source file names this decision is based on.",
        ),
        "reason": types.Schema(
            type=types.Type.STRING,
            description="1-3 sentence plain-language explanation of the decision.",
        ),
    },
    required=["file_name", "status", "risk_score", "issues", "source_files", "reason"],
)

SYSTEM_INSTRUCTION = """You are the Inspector Agent for NoCap, an autonomous
truth layer that protects employee policy information.

You will be given:
1. One incoming employee-facing document.
2. The full text of every official approved policy source.

Your job is to decide whether the incoming document should be:

- "approved": the document is accurate, not a near-duplicate of an existing
  approved document, and contains no unsafe or malicious instructions. It may
  paraphrase or summarize an approved source as long as it stays correct.

- "needs_repair": the document is well-intentioned and mostly usable, but
  contains information that conflicts with, is outdated relative to, or is
  incorrect compared to an approved source. A corrected version could
  reasonably be produced from the approved sources.

- "quarantined": the document is a near-duplicate of existing content adding
  no value, or it contains unsafe/malicious instructions, or it fabricates
  policy that has no basis in any approved source, or repair is not feasible.

Always cite the specific approved source file(s) your decision relies on.
Be specific and concrete in "issues" — name the exact claim that is wrong,
duplicated, or unsafe. Do not invent source files that were not provided.

Respond ONLY with the structured JSON result. No prose, no markdown fences.
"""


def load_approved_sources() -> dict[str, str]:
    """Load every approved policy source as {filename: text}."""
    sources = {}
    if not APPROVED_SOURCES_DIR.exists():
        raise FileNotFoundError(
            f"Approved sources directory not found: {APPROVED_SOURCES_DIR}"
        )
    for path in sorted(APPROVED_SOURCES_DIR.glob("*.md")):
        sources[path.name] = path.read_text(encoding="utf-8")
    if not sources:
        raise FileNotFoundError(
            f"No approved source .md files found in {APPROVED_SOURCES_DIR}"
        )
    return sources


def build_prompt(incoming_name: str, incoming_text: str, sources: dict[str, str]) -> str:
    sources_block = "\n\n".join(
        f"### APPROVED SOURCE: {name}\n{text}" for name, text in sources.items()
    )
    return (
        f"{sources_block}\n\n"
        f"### INCOMING DOCUMENT: {incoming_name}\n{incoming_text}\n\n"
        "Evaluate the incoming document against the approved sources above "
        "and return the structured JSON result."
    )


def _load_incoming_content(file_name: str, raw_bytes: bytes, client: genai.Client | None):
    """Text documents come back as str, same as the CLI version. Anything
    that isn't valid UTF-8 (PDFs, images, docx, ...) gets uploaded to
    Gemini's Files API instead, which needs a real file path — Vercel gives
    each invocation a writable /tmp, so the bytes get written there just
    long enough to hand off to Gemini, not kept as persistent storage."""
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        if client is None:
            raise RuntimeError(
                f"{file_name} is a binary file, which needs Gemini's Files API to "
                "read -- not supported when LLM_PROVIDER=openai. Unset "
                "LLM_PROVIDER (or set it to gemini) to process this file."
            )
        tmp_path = Path(tempfile.gettempdir()) / file_name
        tmp_path.write_bytes(raw_bytes)
        try:
            return client.files.upload(file=str(tmp_path))
        finally:
            tmp_path.unlink(missing_ok=True)


def inspect_document(file_name: str, client: genai.Client | None, sources: dict[str, str]) -> dict:
    """Run a single incoming document through the Inspector Agent."""
    raw_bytes = storage.read_incoming(file_name)

    incoming_content = _load_incoming_content(file_name, raw_bytes, client)
    if isinstance(incoming_content, str):
        contents = build_prompt(file_name, incoming_content, sources)
    else:
        contents = [
            build_prompt(file_name, "(attached below — read it directly)", sources),
            incoming_content,
        ]

    result = llm_client.generate_json(
        client=client,
        model=MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
        contents=contents,
        response_schema=RESULT_SCHEMA,
    )

    # Defensive checks so bad model output never silently breaks the pipeline.
    result["file_name"] = file_name  # trust our own record, not the model
    if result.get("status") not in VALID_STATUSES:
        raise ValueError(f"Inspector returned invalid status for {file_name}: {result.get('status')!r}")
    if not isinstance(result.get("source_files"), list) or not result["source_files"]:
        raise ValueError(f"Inspector returned no source_files for {file_name}")
    unknown_sources = set(result["source_files"]) - set(sources.keys())
    if unknown_sources:
        raise ValueError(
            f"Inspector cited unknown source file(s) for {file_name}: {unknown_sources}"
        )

    # A document that's already correct doesn't need to go through Repair
    # and Verifier to be published, publish it as-is. needs_repair and
    # quarantined documents are NOT published here; Repair/Verifier own that.
    result["published_path"] = None
    if result["status"] == "approved":
        result["published_path"] = storage.write_published(file_name, raw_bytes)

    audit_log.log_event(file_name, "inspector", result)

    return result


def make_client() -> genai.Client | None:
    if llm_client.provider() == "openai":
        return None
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY not found in the environment.")
    return genai.Client(api_key=api_key)
