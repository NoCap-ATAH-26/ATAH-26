import type { NextRequest } from "next/server";
import { PubSub } from "@google-cloud/pubsub";
import { createClient } from "@/lib/supabase/server";

// Next.js port of frontend/api/ingest.py — that file is a Vercel Python
// serverless function (the `api/*.py` convention), which only Vercel
// understands. Railway just runs `next start`, so it never served that
// endpoint at all; DocumentUpload.tsx's POST to /api/ingest silently
// 404'd there and the pipeline never started after an upload.

const DOCUMENT_INGESTED_TOPIC = "nocap-document-ingested";
const INCOMING_BUCKET = "incoming-uploads";

let _publisher: PubSub | null = null;

function getPublisher(): PubSub {
  if (_publisher) return _publisher;

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!projectId || !credsJson) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS_JSON must both be set."
    );
  }

  _publisher = new PubSub({ projectId, credentials: JSON.parse(credsJson) });
  return _publisher;
}

export async function POST(request: NextRequest) {
  // Same trust boundary as /api/chat: signed-in users only. The original
  // Python endpoint had no such check; adding one here is cheap and closes
  // an unauthenticated way to spend Gemini/Mistral tokens by triggering
  // pipeline runs for arbitrary uploaded-file names.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let fileName: string;
  try {
    const body = await request.json();
    fileName = body.file_name;
    if (typeof fileName !== "string" || !fileName) throw new Error();
  } catch {
    return Response.json({ error: "Expected { file_name: string }." }, { status: 400 });
  }

  // Cheap existence check (list, not download) so this endpoint can't be
  // used to spam the pipeline with names that were never actually uploaded.
  const { data: objects, error: listError } = await supabase.storage
    .from(INCOMING_BUCKET)
    .list();
  if (listError) {
    return Response.json({ error: listError.message }, { status: 500 });
  }
  if (!objects.some((obj) => obj.name === fileName)) {
    return Response.json({ error: "File not found in incoming-uploads." }, { status: 404 });
  }

  try {
    const publisher = getPublisher();
    const messageId = await publisher
      .topic(DOCUMENT_INGESTED_TOPIC)
      .publishMessage({ json: { file_name: fileName } });
    console.log(`[ingest] published to ${DOCUMENT_INGESTED_TOPIC}: ${fileName} (id=${messageId})`);
  } catch (exc) {
    console.error(`[ingest] failed to publish for ${fileName}:`, exc);
    return Response.json({ error: "Failed to publish ingest event." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
