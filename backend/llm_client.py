"""
NoCap — Pluggable LLM backend for the pipeline agents (Inspector/Repair/Verifier)

Defaults to Gemini (GEMINI_API_KEY), same as always. Set LLM_PROVIDER=openai
to run the pipeline against any OpenAI-compatible /v1/chat/completions
endpoint instead -- Mistral's free tier, Groq, OpenRouter, Cerebras, and a
local Ollama all speak that same protocol, so switching between them is
three env vars, no code change. Same pattern as the frontend chat feature
(frontend/docs/CHAT_SETUP.md), so the naming should feel familiar:

    LLM_PROVIDER=openai
    LLM_BASE_URL=https://api.mistral.ai/v1      # provider's OpenAI-compatible base URL
    LLM_MODEL=mistral-small-latest                # model name
    LLM_API_KEY=<your provider key>                # from the provider's dashboard

No local install needed for a hosted provider like Mistral -- just an API
key. LLM_BASE_URL/LLM_MODEL default to a local Ollama if left unset, so
LLM_PROVIDER=openai alone (no other vars) also works for anyone who does
want to run locally instead.

Gemini's response_schema (strict per-field JSON schema enforcement) has no
real equivalent here -- response_format: json_object only guarantees valid
JSON syntax, not any particular shape (confirmed against the real Mistral
API: asked to fill RESULT_SCHEMA, it came back valid JSON with its own field
names instead -- "decision" instead of "status", objects instead of strings
in "issues", no risk_score at all). So response_schema still gets used here,
just differently: _describe_schema() renders it into plain-language shape
instructions appended to the prompt, and json_object mode only guarantees
the output parses. Each agent's own post-parse defensive checks (valid
status enum, known source files, non-empty repaired text, ...) are the real
backstop if a model still doesn't comply.

Binary (non-text) documents are Gemini-only for now: Inspector reads those
via Gemini's Files API, which has no equivalent in this codebase for the
openai-compatible path. generate_json() raises a clear error if that
combination is attempted rather than silently mishandling it.
"""

import json
import os

# A local Ollama needs no key/account, so it's the zero-setup default if
# LLM_BASE_URL/LLM_MODEL aren't set. Point these at a hosted provider (e.g.
# Mistral) instead for a no-install setup.
OPENAI_COMPATIBLE_DEFAULT_BASE_URL = "http://localhost:11434/v1"
OPENAI_COMPATIBLE_DEFAULT_MODEL = "qwen2.5:14b"


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
    client/model/response_schema are Gemini-only and ignored otherwise.
    """
    if provider() == "openai":
        if not isinstance(contents, str):
            raise RuntimeError(
                "Binary (non-text) documents aren't supported when "
                "LLM_PROVIDER=openai -- that path needs Gemini's Files API. "
                "Unset LLM_PROVIDER (or set it to gemini) to process this file."
            )
        instruction = system_instruction
        if response_schema is not None:
            instruction += (
                "\n\nRespond with a JSON object matching EXACTLY this shape "
                "(every field is required, no extra fields, no renaming):\n"
                + _describe_schema(response_schema)
            )
        return _generate_json_openai_compatible(instruction, contents)

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


def _describe_schema(schema, indent: int = 0) -> str:
    """Renders a Gemini types.Schema as plain-language JSON-shape text, for
    providers whose JSON mode only guarantees valid syntax, not a specific
    shape the way Gemini's response_schema enforces structurally."""
    from google.genai import types

    pad = "  " * indent
    if schema.type == types.Type.OBJECT:
        required = set(schema.required or [])
        lines = ["{"]
        for name, prop in (schema.properties or {}).items():
            optional = "" if name in required else " (optional)"
            lines.append(f'{pad}  "{name}": {_describe_schema(prop, indent + 1)}{optional},')
        lines.append(pad + "}")
        return "\n".join(lines)

    if schema.type == types.Type.ARRAY:
        return f"array of {_describe_schema(schema.items, indent)}"

    if schema.type == types.Type.STRING and schema.enum:
        return "one of " + json.dumps(list(schema.enum))

    base = {
        types.Type.STRING: "string",
        types.Type.INTEGER: "integer",
        types.Type.NUMBER: "number",
        types.Type.BOOLEAN: "boolean",
    }.get(schema.type, "value")
    return f"{base} ({schema.description})" if schema.description else base


def _generate_json_openai_compatible(system_instruction: str, user_prompt: str) -> dict:
    import requests

    base_url = os.getenv("LLM_BASE_URL", OPENAI_COMPATIBLE_DEFAULT_BASE_URL).rstrip("/")
    model = os.getenv("LLM_MODEL", OPENAI_COMPATIBLE_DEFAULT_MODEL)
    # Ollama requires the Authorization header to be present but ignores its
    # value; hosted providers (Mistral, Groq, ...) need a real key here.
    api_key = os.getenv("LLM_API_KEY", "ollama")

    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
            # A big system prompt (every approved source + the document)
            # against a small/local model can take a while.
            timeout=300,
        )
    except requests.exceptions.ConnectionError as exc:
        hint = (
            f"Is `ollama serve` running, and have you pulled `{model}`?"
            if "localhost" in base_url or "127.0.0.1" in base_url
            else "Check LLM_BASE_URL and LLM_API_KEY."
        )
        raise RuntimeError(f"Could not reach the chat provider at {base_url}. {hint}") from exc

    if not response.ok:
        raise RuntimeError(
            f"Chat provider returned {response.status_code}: {response.text[:300]}"
        )

    content = response.json()["choices"][0]["message"]["content"]
    return json.loads(content)
