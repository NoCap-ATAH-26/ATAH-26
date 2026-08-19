import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChatProvider, SYSTEM_PROMPT } from "@/lib/chat/provider";
import { openAIStreamToText } from "@/lib/chat/stream";

// Guard rails on what we'll forward upstream — this endpoint holds a real API
// key on hosted providers, so it must not become an open relay.
const MAX_MESSAGES = 40;
const MAX_CHARS = 8000;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function isValid(body: unknown): body is { messages: IncomingMessage[] } {
  if (typeof body !== "object" || body === null) return false;
  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
  );
}

export async function POST(request: NextRequest) {
  // Same trust boundary as the rest of /dashboard: signed-in users only.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  if (!isValid(body)) {
    return Response.json({ error: "Expected { messages: [{ role, content }] }." }, { status: 400 });
  }

  const messages = body.messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_CHARS),
  }));

  const provider = getChatProvider();

  let upstream: Response;
  try {
    upstream = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });
  } catch {
    // Overwhelmingly the local case: nothing listening on :11434.
    const hint = provider.isLocalDefault
      ? `Could not reach Ollama at ${provider.baseUrl}. Is \`ollama serve\` running, and have you pulled \`${provider.model}\`?`
      : `Could not reach the chat provider at ${provider.baseUrl}.`;
    return Response.json({ error: hint }, { status: 503 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `Chat provider returned ${upstream.status}. ${detail.slice(0, 300)}` },
      { status: 502 }
    );
  }

  // Unwrap the upstream SSE into a plain token stream, so the client never has
  // to parse provider-specific envelopes — which differ in small ways between
  // Ollama and the hosted APIs.
  return new Response(openAIStreamToText(upstream.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Stops intermediary proxies buffering the response, which would
      // collect the whole reply and defeat streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
