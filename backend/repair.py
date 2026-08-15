"""
NoCap — Repair Agent

Takes a document that Inspector marked "needs_repair" and produces a
corrected replacement using ONLY the official approved policy sources.

For each file it:
1. Re-runs the Inspector Agent to confirm the document still needs repair
   and to learn which specific issues to fix.
2. Generates a corrected version of the document grounded strictly in the
   approved sources.
3. Saves the repaired document to repaired_documents/<same_filename>.
4. Prints a structured JSON result:

    file_name, status, repaired_text_path, source_files, changes_made, reason

status is one of: "repaired", "quarantined"
  - "repaired": a corrected version was produced and saved.
  - "quarantined": Inspector found the document is NOT needs_repair (it's
    already approved, or it's unsafe/duplicate and repair isn't
    appropriate) — Repair Agent refuses to touch it and says why.

This file is meant to hand off directly to the Verifier Agent, which should
check repaired_documents/<file> against the approved sources before
anything is marked approved.

Usage:
    python repair.py remote_work_benefits_update.md
    python repair.py --all
"""

import argparse
import json
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types

# Reuse the Inspector Agent's setup, source-loading, and schema/status
# constants so both agents stay in sync automatically.
import inspector

MODEL = inspector.MODEL
RATE_LIMIT_DELAY_SECONDS = inspector.RATE_LIMIT_DELAY_SECONDS

PROJECT_ROOT = inspector.PROJECT_ROOT
REPAIRED_DOCUMENTS_DIR = PROJECT_ROOT / "repaired_documents"

REPAIR_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "repaired_text": types.Schema(
            type=types.Type.STRING,
            description=(
                "The full corrected document, in the same format/style as "
                "the original (e.g. markdown), with every incorrect claim "
                "fixed to match the approved sources."
            ),
        ),
        "changes_made": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Short, specific list of what was changed and why.",
        ),
        "source_files": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
            description="Approved source file names the repair relied on.",
        ),
        "reason": types.Schema(
            type=types.Type.STRING,
            description="1-3 sentence plain-language summary of the repair.",
        ),
    },
    required=["repaired_text", "changes_made", "source_files", "reason"],
)

SYSTEM_INSTRUCTION = """You are the Repair Agent for NoCap, an autonomous
truth layer that protects employee policy information.

You will be given:
1. An incoming employee-facing document that has been flagged as needing
   repair, along with the specific issues an Inspector Agent found in it.
2. The full text of every official approved policy source.

Your job is to produce a corrected replacement for the document that:
- Fixes every identified issue using ONLY information found in the approved
  sources provided. Never invent policy details, numbers, or rules that
  are not present in an approved source.
- Preserves everything in the original document that was already correct,
  including its tone, structure, and any content not related to the
  flagged issues.
- Stays in the same format as the original (e.g. markdown headings/lists).
- If a claim cannot be corrected because no approved source addresses it,
  remove that specific claim rather than guessing.

List every specific change you made in "changes_made", and list every
approved source file you relied on in "source_files". Do not cite a source
file that was not provided to you.

Respond ONLY with the structured JSON result. No prose, no markdown fences
around the JSON itself (markdown fences INSIDE repaired_text are fine, since
that's part of the document content).
"""


def build_repair_prompt(
    file_name: str,
    incoming_text: str,
    sources: dict[str, str],
    inspection: dict,
) -> str:
    sources_block = "\n\n".join(
        f"### APPROVED SOURCE: {name}\n{text}" for name, text in sources.items()
    )
    issues_block = "\n".join(f"- {issue}" for issue in inspection.get("issues", []))
    return (
        f"{sources_block}\n\n"
        f"### DOCUMENT TO REPAIR: {file_name}\n{incoming_text}\n\n"
        f"### ISSUES FOUND BY INSPECTOR\n{issues_block}\n\n"
        "Produce a corrected replacement for this document and return the "
        "structured JSON result."
    )


def repair_document(
    file_name: str,
    client: genai.Client,
    sources: dict[str, str],
    delay_seconds: float = RATE_LIMIT_DELAY_SECONDS,
) -> dict:
    """Repair a single document. Confirms via Inspector first."""
    inspection = inspector.inspect_document(file_name, client, sources)

    if delay_seconds > 0:
        time.sleep(delay_seconds)

    if inspection["status"] != "needs_repair":
        return {
            "file_name": file_name,
            "status": "quarantined",
            "repaired_text_path": None,
            "source_files": inspection.get("source_files", []),
            "changes_made": [],
            "reason": (
                f"Repair Agent refused: Inspector status for this document is "
                f"'{inspection['status']}', not 'needs_repair'. "
                f"({inspection.get('reason', '')})"
            ),
        }

    incoming_path = inspector.INCOMING_DOCUMENTS_DIR / file_name
    incoming_text = incoming_path.read_text(encoding="utf-8")
    prompt = build_repair_prompt(file_name, incoming_text, sources, inspection)

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=REPAIR_SCHEMA,
            temperature=0,
        ),
    )

    repair_result = json.loads(response.text)

    # Defensive checks, same philosophy as Inspector: never let bad model
    # output silently corrupt the pipeline.
    unknown_sources = set(repair_result.get("source_files", [])) - set(sources.keys())
    if unknown_sources:
        raise ValueError(
            f"Repair Agent cited unknown source file(s) for {file_name}: {unknown_sources}"
        )
    if not repair_result.get("repaired_text", "").strip():
        raise ValueError(f"Repair Agent returned empty repaired_text for {file_name}")

    REPAIRED_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPAIRED_DOCUMENTS_DIR / file_name
    out_path.write_text(repair_result["repaired_text"], encoding="utf-8")

    return {
        "file_name": file_name,
        "status": "repaired",
        "repaired_text_path": str(out_path.relative_to(PROJECT_ROOT)),
        "source_files": repair_result["source_files"],
        "changes_made": repair_result["changes_made"],
        "reason": repair_result["reason"],
    }


def run(file_names: list[str], delay_seconds: float = RATE_LIMIT_DELAY_SECONDS) -> list[dict]:
    api_key = inspector.os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY not found. Make sure .env exists and is loaded."
        )

    client = genai.Client(api_key=api_key)
    sources = inspector.load_approved_sources()

    results = []
    for i, file_name in enumerate(file_names):
        print(f"Repairing {file_name} ...", file=sys.stderr)
        result = repair_document(file_name, client, sources, delay_seconds=delay_seconds)
        results.append(result)
        print(json.dumps(result, indent=2))

        is_last = i == len(file_names) - 1
        if delay_seconds > 0 and not is_last:
            print(f"Waiting {delay_seconds}s (rate limit)...", file=sys.stderr)
            time.sleep(delay_seconds)
    return results


def main():
    parser = argparse.ArgumentParser(description="NoCap Repair Agent")
    parser.add_argument(
        "files",
        nargs="*",
        help="Incoming document filename(s), e.g. remote_work_benefits_update.md",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Attempt repair on every file in incoming_documents/",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=RATE_LIMIT_DELAY_SECONDS,
        help=(
            "Seconds to wait between API calls (default: "
            f"{RATE_LIMIT_DELAY_SECONDS}, for free-tier rate limits). "
            "Each document makes 2 calls (inspect + repair), so --all "
            "with many files will take a while on the free tier. "
            "Set to 0 once you're on a paid tier."
        ),
    )
    args = parser.parse_args()

    if args.all:
        file_names = sorted(p.name for p in inspector.INCOMING_DOCUMENTS_DIR.glob("*.md"))
        if not file_names:
            print(f"No .md files found in {inspector.INCOMING_DOCUMENTS_DIR}", file=sys.stderr)
            sys.exit(1)
    elif args.files:
        file_names = args.files
    else:
        parser.error("Provide file name(s) to repair, or use --all")

    run(file_names, delay_seconds=args.delay)


if __name__ == "__main__":
    main()