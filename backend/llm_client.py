"""
NoCap — Pluggable LLM backend for the pipeline agents (Inspector/Repair/Verifier)

Defaults to Gemini (GEMINI_API_KEY), same as always. Set LLM_PROVIDER=ollama
to run the whole pipeline on a local Ollama server instead -- no API key, no
quota, no cost. Useful when Gemini's free-tier credits run out.

    LLM_PROVIDER=ollama
    OLLAMA_BASE_URL=http://localhost:11434   # default, override if needed
    OLLAMA_MODEL=qwen2.5:14b                  # default, override if needed

    ollama pull qwen2.5:14b                   # once, before first use

Gemini's response_schema (strict per-field JSON schema enforcement) has no
real equivalent on Ollama, so the Ollama path relies on prompt instructions
plus Ollama's own JSON mode instead. This isn't a gap in practice: every
agent already runs its own defensive checks after parsing (valid status
enum, known source files, non-empty repaired text, ...) specifically because
model output can't be fully trusted even with schema enforcement turned on
-- that same safety net catches malformed Ollama output just as well.

Binary (non-text) documents are Gemini-only for now: Inspector reads those
via Gemini's Files API, which has no Ollama equivalent in this codebase.
generate_json() raises a clear error if that combination is attempted rather
than silently mishandling it.
"""

import json
import os

OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434"
OLLAMA_DEFAULT_MODEL = "qwen2.5:14b"


def provider() -> str:
    return os.getenv("LLM_PROVIDER", "gemini").strip().lower()


def generate_json(
    *,
    client=None,
    model: str = "",
    system_instruction: str,
    contents,
    response_schema=None,
) -> dict:
    """Runs one prompt through whichever provider is configured and returns
    the parsed JSON response.

    contents is either a str (plain text prompt) or, Gemini-only, a list
    mixing prompt text with an uploaded genai File (for binary documents).
    client/model/response_schema are Gemini-only and ignored on Ollama.
    """
    if provider() == "ollama":
        if not isinstance(contents, str):
            raise RuntimeError(
                "Binary (non-text) documents aren't supported when "
                "LLM_PROVIDER=ollama -- that path needs Gemini's Files API. "
                "Unset LLM_PROVIDER (or set it to gemini) to process this file."
            )
        return _generate_json_ollama(system_instruction, contents)

    from google.genai import types

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=response_schema,
            temperature=0,
        ),
    )
    return json.loads(response.text)


def _generate_json_ollama(system_instruction: str, user_prompt: str) -> dict:
    import requests

    base_url = os.getenv("OLLAMA_BASE_URL", OLLAMA_DEFAULT_BASE_URL).rstrip("/")
    model = os.getenv("OLLAMA_MODEL", OLLAMA_DEFAULT_MODEL)

    try:
        response = requests.post(
            f"{base_url}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                "format": "json",
                "stream": False,
                "options": {"temperature": 0},
            },
            # Local inference on a big system prompt (approved sources +
            # document) can take a while on modest hardware.
            timeout=300,
        )
    except requests.exceptions.ConnectionError as exc:
        raise RuntimeError(
            f"Could not reach Ollama at {base_url}. Is `ollama serve` running, "
            f"and have you pulled `{model}` (ollama pull {model})?"
        ) from exc

    response.raise_for_status()
    content = response.json()["message"]["content"]
    return json.loads(content)
