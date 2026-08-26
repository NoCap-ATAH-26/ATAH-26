"""
NoCap — Pub/Sub publish helper (deployed/Vercel copy)

backend/pubsub_bus.py has both publish() and listen(), because
orchestrator.py pulls from subscriptions in a loop. The deployed pipeline
doesn't pull at all, Pub/Sub pushes each event to these functions over
HTTP (see pubsub_verify.py and the handlers in frontend/api/pubsub/), so
this copy only needs publish() — Inspector's handler still has to publish
nocap-repair-needed when a document needs repair, same for Repair
publishing nocap-verification-needed.

Auth is the other real difference: backend/pubsub_bus.py relies on
`gcloud auth application-default login` having been run on the machine
it's on. Vercel has no such thing, so this copy authenticates with an
explicit service account instead, its JSON key stored in the
GOOGLE_APPLICATION_CREDENTIALS_JSON env var (the key's raw JSON as a
string, not a file path, since Vercel env vars aren't files).
"""

import json
import os
import sys

_publisher = None


def _project_id() -> str:
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        raise EnvironmentError("GOOGLE_CLOUD_PROJECT not set in the environment.")
    return project_id


def _get_publisher():
    global _publisher
    if _publisher is not None:
        return _publisher

    from google.cloud import pubsub_v1
    from google.oauth2 import service_account

    creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not creds_json:
        raise EnvironmentError(
            "GOOGLE_APPLICATION_CREDENTIALS_JSON not set. The deployed pipeline "
            "needs a service account key (as raw JSON, not a file path) to "
            "publish to Pub/Sub — there's no `gcloud auth` here the way there "
            "is on a laptop."
        )
    credentials = service_account.Credentials.from_service_account_info(
        json.loads(creds_json)
    )
    _publisher = pubsub_v1.PublisherClient(credentials=credentials)
    return _publisher


def publish(topic_name: str, payload: dict) -> str:
    """Publish a JSON payload to a topic. Returns the message id."""
    publisher = _get_publisher()
    topic_path = publisher.topic_path(_project_id(), topic_name)
    data = json.dumps(payload).encode("utf-8")
    future = publisher.publish(topic_path, data)
    message_id = future.result(timeout=30)
    print(f"[pubsub] published to {topic_name}: {payload} (id={message_id})", file=sys.stderr)
    return message_id
