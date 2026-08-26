"""
NoCap — Repair Agent (deployed/Storage-backed copy)

Same logic as backend/repair.py: re-confirms via Inspector, then produces a
corrected replacement grounded strictly in the approved sources. This copy
writes the result to Supabase Storage (pipeline-output bucket) instead of
local repaired_documents/, for the same reason inspector.py's deployed copy
reads/writes Storage — see frontend/api/_lib/storage.py.

Kept in sync with backend/repair.py by hand; see inspector.py's note on
why these aren't imported across the frontend/backend boundary.
"""

from google import genai
from google.genai import types

import audit_log
import inspector
import llm_client
import storage

MODEL = inspector.MODEL

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
) -> dict:
    """Repair a single document. Confirms via Inspector first."""
    inspection = inspector.inspect_document(file_name, client, sources)

    if inspection["status"] != "needs_repair":
        refusal = {
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
        audit_log.log_event(file_name, "repair", refusal)
        return refusal

    raw_bytes = storage.read_incoming(file_name)
    try:
        incoming_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        # Repair works by having the model rewrite the document's text content
        # — there's no sensible way to "rewrite" a binary file's bytes, so
        # this refuses rather than clobbering it with a text blob saved under
        # the original (e.g. .pdf) filename.
        refusal = {
            "file_name": file_name,
            "status": "quarantined",
            "repaired_text_path": None,
            "source_files": inspection.get("source_files", []),
            "changes_made": [],
            "reason": (
                "Repair Agent refused: this is a binary file, and repair works by "
                "rewriting text content, which isn't possible for a format like "
                "this. Flagging for manual review instead."
            ),
        }
        audit_log.log_event(file_name, "repair", refusal)
        return refusal

    prompt = build_repair_prompt(file_name, incoming_text, sources, inspection)

    repair_result = llm_client.generate_json(
        client=client,
        model=MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
        contents=prompt,
        response_schema=REPAIR_SCHEMA,
    )

    # Defensive checks, same philosophy as Inspector.
    unknown_sources = set(repair_result.get("source_files", [])) - set(sources.keys())
    if unknown_sources:
        raise ValueError(
            f"Repair Agent cited unknown source file(s) for {file_name}: {unknown_sources}"
        )
    if not repair_result.get("repaired_text", "").strip():
        raise ValueError(f"Repair Agent returned empty repaired_text for {file_name}")

    repaired_path = storage.write_repaired(file_name, repair_result["repaired_text"])

    outcome = {
        "file_name": file_name,
        "status": "repaired",
        "repaired_text_path": repaired_path,
        "source_files": repair_result["source_files"],
        "changes_made": repair_result["changes_made"],
        "reason": repair_result["reason"],
    }
    audit_log.log_event(file_name, "repair", outcome)
    return outcome
