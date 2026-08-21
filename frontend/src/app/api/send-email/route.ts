import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResendClient, getResendFrom } from "@/lib/resend/client";

// Same guard-rail spirit as /api/chat — this endpoint holds a real API key
// on Resend and must not become an open relay.
const MAX_RECIPIENTS = 10;
const MAX_SUBJECT_CHARS = 300;
const MAX_BODY_CHARS = 50_000;

type Body = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

function isValid(body: unknown): body is Body {
  if (typeof body !== "object" || body === null) return false;
  const { to, subject, html, text } = body as Partial<Body>;

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS) return false;
  if (!recipients.every((addr) => typeof addr === "string" && addr.includes("@"))) return false;

  if (typeof subject !== "string" || subject.length === 0) return false;
  if (typeof html !== "string" && typeof text !== "string") return false;

  return true;
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
    return Response.json(
      { error: "Expected { to, subject, html | text }, with to as a string or array of strings." },
      { status: 400 }
    );
  }

  const resend = getResendClient();
  const from = getResendFrom();
  const to = body.to;
  const subject = body.subject.slice(0, MAX_SUBJECT_CHARS);

  const { error } = body.html
    ? await resend.emails.send({ from, to, subject, html: body.html.slice(0, MAX_BODY_CHARS) })
    : await resend.emails.send({ from, to, subject, text: body.text!.slice(0, MAX_BODY_CHARS) });

  if (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }

  return Response.json({ ok: true });
}
