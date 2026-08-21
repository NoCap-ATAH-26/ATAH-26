"""
NoCap — Orchestrator

The autonomous brain: three Pub/Sub subscribers, one per pipeline stage,
each reacting to an event and (when the outcome calls for it) publishing
the next event itself. Nothing here is invoked by a human between stages,
a document ingested event on its own can end with the doc published or
quarantined, with no other command run in between.

    nocap-document-ingested   -> Inspector -> (needs_repair?) -> nocap-repair-needed
    nocap-repair-needed       -> Repair     -> (repaired?)    -> nocap-verification-needed
    nocap-verification-needed -> Verifier   -> published_documents/ or stays quarantined

Run it once, leave it running (this is what gets deployed to Cloud Run):
    python orchestrator.py

Then trigger the pipeline by publishing document-ingested events, e.g. with
publish_incoming.py, which is the "watching for a change" side of Taskmaster:
new files showing up is the change being watched for.
"""

import sys
from concurrent.futures import wait, FIRST_EXCEPTION

from google import genai

import inspector
import repair
import verifier
import pubsub_bus

DOCUMENT_INGESTED_SUB = "nocap-document-ingested-sub"
REPAIR_NEEDED_SUB = "nocap-repair-needed-sub"
VERIFICATION_NEEDED_SUB = "nocap-verification-needed-sub"

REPAIR_NEEDED_TOPIC = "nocap-repair-needed"
VERIFICATION_NEEDED_TOPIC = "nocap-verification-needed"


def make_handlers(client: genai.Client, sources: dict[str, str]):
    def on_document_ingested(payload: dict):
        file_name = payload["file_name"]
        result = inspector.inspect_document(file_name, client, sources)
        print(f"[orchestrator] inspector -> {file_name}: {result['status']}", file=sys.stderr)
        if result["status"] == "needs_repair":
            pubsub_bus.publish(REPAIR_NEEDED_TOPIC, {"file_name": file_name})

    def on_repair_needed(payload: dict):
        file_name = payload["file_name"]
        result = repair.repair_document(file_name, client, sources)
        print(f"[orchestrator] repair -> {file_name}: {result['status']}", file=sys.stderr)
        if result["status"] == "repaired":
            pubsub_bus.publish(VERIFICATION_NEEDED_TOPIC, {"file_name": file_name})

    def on_verification_needed(payload: dict):
        file_name = payload["file_name"]
        result = verifier.verify_document(file_name, client, sources)
        print(f"[orchestrator] verifier -> {file_name}: {result['status']}", file=sys.stderr)

    return on_document_ingested, on_repair_needed, on_verification_needed


def main():
    client = None
    if inspector.llm_client.provider() != "openai":
        api_key = inspector.os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY not found. Make sure .env exists and is loaded.")
        client = genai.Client(api_key=api_key)
    sources = inspector.load_approved_sources()

    on_document_ingested, on_repair_needed, on_verification_needed = make_handlers(client, sources)

    futures = [
        pubsub_bus.listen(DOCUMENT_INGESTED_SUB, on_document_ingested),
        pubsub_bus.listen(REPAIR_NEEDED_SUB, on_repair_needed),
        pubsub_bus.listen(VERIFICATION_NEEDED_SUB, on_verification_needed),
    ]

    print("[orchestrator] running, waiting for events on all three subscriptions ...", file=sys.stderr)
    try:
        wait(futures, return_when=FIRST_EXCEPTION)
        for f in futures:
            if f.done():
                f.result()  # re-raise if any subscriber thread died
    except KeyboardInterrupt:
        for f in futures:
            f.cancel()


if __name__ == "__main__":
    main()
