"""
NoCap — Inspector Agent

Compares an incoming employee document against the approved policy sources
and returns a structured decision:

    file_name, status, risk_score, issues, source_files, reason

status is one of: "approved", "needs_repair", "quarantined"

Usage:
    python inspector.py remote_work_benefits_update.md
    python inspector.py --all
"""

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

import audit_log

load_dotenv()

MODEL = "gemini-3.5-flash"

# Free-tier Gemini quota is 5 requests per minute for this model, so we wait
# between calls to avoid 429 RESOURCE_EXHAUSTED errors when processing many
# documents in one run. 13 seconds keeps us safely under 5/60s.
# If you upgrade to a paid tier, set this to 0 (or pass --delay 0).
RATE_LIMIT_DELAY_SECONDS = 13

# Resolve project paths relative to this file, so it works no matter
# what directory it's launched from.
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
APPROVED_SOURCES_DIR = PROJECT_ROOT / "approved_sources"
INCOMING_DOCUMENTS_DIR = PROJECT_ROOT / "incoming_docs"
PUBLISHED_DOCUMENTS_DIR = PROJECT_ROOT / "published_documents"

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


def inspect_document(file_name: str, client: genai.Client, sources: dict[str, str]) -> dict:
    """Run a single incoming document through the Inspector Agent."""
    incoming_path = INCOMING_DOCUMENTS_DIR / file_name
    if not incoming_path.exists():
        raise FileNotFoundError(f"Incoming document not found: {incoming_path}")

    incoming_text = incoming_path.read_text(encoding="utf-8")
    prompt = build_prompt(file_name, incoming_text, sources)

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=RESULT_SCHEMA,
            temperature=0,
        ),
    )

    result = json.loads(response.text)

    # Defensive checks so bad model output never silently breaks the pipeline.
    result["file_name"] = file_name  # trust our own file system, not the model
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
        PUBLISHED_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
        published_path = PUBLISHED_DOCUMENTS_DIR / file_name
        shutil.copyfile(incoming_path, published_path)
        result["published_path"] = str(published_path.relative_to(PROJECT_ROOT))

    audit_log.log_event(file_name, "inspector", result)

    return result


def run(file_names: list[str], delay_seconds: float = RATE_LIMIT_DELAY_SECONDS) -> list[dict]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY not found. Make sure .env exists and is loaded."
        )

    client = genai.Client(api_key=api_key)
    sources = load_approved_sources()

    results = []
    for i, file_name in enumerate(file_names):
        print(f"Inspecting {file_name} ...", file=sys.stderr)
        result = inspect_document(file_name, client, sources)
        results.append(result)
        print(json.dumps(result, indent=2))

        is_last = i == len(file_names) - 1
        if delay_seconds > 0 and not is_last:
            print(f"Waiting {delay_seconds}s (rate limit)...", file=sys.stderr)
            time.sleep(delay_seconds)
    return results


def main():
    parser = argparse.ArgumentParser(description="NoCap Inspector Agent")
    parser.add_argument(
        "files",
        nargs="*",
        help="Incoming document filename(s), e.g. remote_work_benefits_update.md",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Inspect every file in incoming_documents/",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=RATE_LIMIT_DELAY_SECONDS,
        help=(
            "Seconds to wait between requests (default: "
            f"{RATE_LIMIT_DELAY_SECONDS}, for free-tier rate limits). "
            "Set to 0 once you're on a paid tier."
        ),
    )
    args = parser.parse_args()

    if args.all:
        file_names = sorted(p.name for p in INCOMING_DOCUMENTS_DIR.glob("*.md"))
        if not file_names:
            print(f"No .md files found in {INCOMING_DOCUMENTS_DIR}", file=sys.stderr)
            sys.exit(1)
    elif args.files:
        file_names = args.files
    else:
        parser.error("Provide file name(s) to inspect, or use --all")

    run(file_names, delay_seconds=args.delay)


if __name__ == "__main__":
    main()