"""
NoCap — Pub/Sub Event Bus

This is what makes the pipeline genuinely event-driven instead of a
sequential script: each stage publishes an event when it's done, and the
next stage is a subscriber reacting to that event, not a function call
chained by a human or a linear loop.

Topics (create once per GCP project, see setup commands below):
    nocap-document-ingested    -> consumed by Inspector
    nocap-repair-needed        -> consumed by Repair
    nocap-verification-needed  -> consumed by Verifier

Each has one pull subscription with the same name + "-sub".

One-time setup (needs the Pub/Sub API enabled on the project):
    gcloud config set project YOUR_PROJECT_ID
    gcloud services enable pubsub.googleapis.com

    for t in nocap-document-ingested nocap-repair-needed nocap-verification-needed; do
      gcloud pubsub topics create "$t"
      gcloud pubsub subscriptions create "${t}-sub" --topic="$t"
    done

Auth: gcloud auth application-default login (or GOOGLE_APPLICATION_CREDENTIALS
pointing at a service account key) on a machine with gcloud set up. On a
host with neither (Railway, Cloud Run, etc.), set GOOGLE_APPLICATION_CREDENTIALS_JSON
instead -- the service account key's raw JSON as a string, not a file path,
same convention frontend/api/_lib/pubsub_bus.py already uses. Requires
GOOGLE_CLOUD_PROJECT either way.
"""

import json
import os
import sys
from typing import Callable

_publisher = None
_subscriber = None


def _project_id() -> str:
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        raise EnvironmentError(
            "GOOGLE_CLOUD_PROJECT not set in .env. Pub/Sub needs a real GCP "
            "project id, see backend/pubsub_bus.py docstring for setup."
        )
    return project_id


def _credentials():
    """Explicit service-account credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON
    when set, so publish()/listen() work on hosts with no gcloud and no
    credentials file (only a pasted-JSON env var). Returns None otherwise,
    letting the client fall back to normal ADC discovery (gcloud auth
    application-default login, or GOOGLE_APPLICATION_CREDENTIALS as a file
    path) exactly as before."""
    creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not creds_json:
        return None
    from google.oauth2 import service_account

    return service_account.Credentials.from_service_account_info(json.loads(creds_json))


def _get_publisher():
    global _publisher
    if _publisher is None:
        from google.cloud import pubsub_v1

        _publisher = pubsub_v1.PublisherClient(credentials=_credentials())
    return _publisher


def _get_subscriber():
    global _subscriber
    if _subscriber is None:
        from google.cloud import pubsub_v1

        _subscriber = pubsub_v1.SubscriberClient(credentials=_credentials())
    return _subscriber


def publish(topic_name: str, payload: dict) -> str:
    """Publish a JSON payload to a topic. Returns the message id."""
    publisher = _get_publisher()
    topic_path = publisher.topic_path(_project_id(), topic_name)
    data = json.dumps(payload).encode("utf-8")
    future = publisher.publish(topic_path, data)
    message_id = future.result(timeout=30)
    print(f"[pubsub] published to {topic_name}: {payload} (id={message_id})", file=sys.stderr)
    return message_id


def listen(subscription_name: str, handler: Callable[[dict], None]):
    """Block, pulling messages from a subscription and calling handler(payload)
    for each. Acks on success, nacks (redelivers) if handler raises.

    Returns the StreamingPullFuture so callers can wait on multiple
    subscriptions concurrently, e.g. with concurrent.futures.wait().
    """
    subscriber = _get_subscriber()
    subscription_path = subscriber.subscription_path(_project_id(), subscription_name)

    def _callback(message):
        try:
            payload = json.loads(message.data.decode("utf-8"))
            print(f"[pubsub] received on {subscription_name}: {payload}", file=sys.stderr)
            handler(payload)
            message.ack()
        except Exception as exc:  # noqa: BLE001
            print(f"[pubsub] handler failed for {subscription_name}: {exc}", file=sys.stderr)
            message.nack()

    print(f"[pubsub] listening on {subscription_name} ...", file=sys.stderr)
    return subscriber.subscribe(subscription_path, callback=_callback)
