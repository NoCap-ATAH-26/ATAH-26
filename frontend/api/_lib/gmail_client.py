"""
NoCap — Gmail attachment ingestion (deployed/Vercel copy)

Alternative "watching for a change" source alongside the dashboard's manual
upload: watches a Gmail inbox via the Gmail API's push notifications
(start_watch() -> a Pub/Sub topic -> frontend/api/pubsub/gmail-notify.py),
and drops any attachment from a new message straight into the same
incoming-uploads bucket the dashboard writes to -- from there it's
indistinguishable from a manual upload to the rest of the pipeline.

Auth: a long-lived refresh token (GMAIL_REFRESH_TOKEN), obtained once via
scripts/gmail_oauth_setup.py run locally, plus a Desktop-app OAuth client's
id/secret (GMAIL_OAUTH_CLIENT_ID/GMAIL_OAUTH_CLIENT_SECRET) -- separate
from GOOGLE_OAUTH_CLIENT_ID/SECRET, which is a Web client scoped to
Supabase's own Google sign-in and can't complete a local script's redirect.

Gmail's history-based sync means each call only needs "what changed since
historyId X", not the whole mailbox -- last_history_id lives in Supabase's
gmail_watch_state table, since a Vercel invocation has no memory of the
last one. Plain REST calls via requests, not google-api-python-client --
consistent with pubsub_bus.py/pubsub_verify.py already doing the same for
their APIs rather than pulling in a heavier SDK.
"""

import base64
import os

import requests

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def _access_token() -> str:
    client_id = os.getenv("GMAIL_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GMAIL_OAUTH_CLIENT_SECRET")
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN")
    if not (client_id and client_secret and refresh_token):
        raise EnvironmentError(
            "GMAIL_OAUTH_CLIENT_ID/GMAIL_OAUTH_CLIENT_SECRET/GMAIL_REFRESH_TOKEN "
            "not set -- run scripts/gmail_oauth_setup.py once to get a refresh token."
        )
    response = requests.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def _headers() -> dict:
    return {"Authorization": f"Bearer {_access_token()}"}


def _leaf_parts(payload: dict):
    """Recursively walks a Gmail message payload's parts -- attachments can
    sit a couple of levels deep (e.g. multipart/mixed > multipart/alternative
    siblings), not just at the top level."""
    for part in payload.get("parts", []) or []:
        if part.get("parts"):
            yield from _leaf_parts(part)
        else:
            yield part


def _message_attachments(message_id: str) -> list[tuple[str, bytes]]:
    response = requests.get(
        f"{GMAIL_API}/messages/{message_id}",
        headers=_headers(),
        params={"format": "full"},
        timeout=15,
    )
    response.raise_for_status()
    message = response.json()

    results = []
    for part in _leaf_parts(message.get("payload", {})):
        file_name = part.get("filename")
        attachment_id = part.get("body", {}).get("attachmentId")
        if not file_name or not attachment_id:
            continue
        att_response = requests.get(
            f"{GMAIL_API}/messages/{message_id}/attachments/{attachment_id}",
            headers=_headers(),
            timeout=30,
        )
        att_response.raise_for_status()
        data = base64.urlsafe_b64decode(att_response.json()["data"])
        results.append((file_name, data))
    return results


def fetch_new_attachments(start_history_id: str) -> tuple[list[tuple[str, bytes]], str]:
    """Returns (every (file_name, data) attachment on every message added
    since start_history_id, the new history_id to save as the next
    resume point)."""
    response = requests.get(
        f"{GMAIL_API}/history",
        headers=_headers(),
        params={"startHistoryId": start_history_id, "historyTypes": "messageAdded"},
        timeout=15,
    )
    response.raise_for_status()
    body = response.json()
    new_history_id = body.get("historyId", start_history_id)

    message_ids = {
        record["message"]["id"]
        for change in body.get("history", [])
        for record in change.get("messagesAdded", [])
    }

    attachments: list[tuple[str, bytes]] = []
    for message_id in message_ids:
        attachments.extend(_message_attachments(message_id))
    return attachments, new_history_id


def start_watch(topic_name: str) -> dict:
    """Registers (or renews) push notifications for new mail. Expires after
    7 days per Gmail's API -- frontend/api/cron/renew-gmail-watch.py calls
    this weekly, well inside that window."""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    response = requests.post(
        f"{GMAIL_API}/watch",
        headers=_headers(),
        json={"topicName": f"projects/{project_id}/topics/{topic_name}", "labelIds": ["INBOX"]},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()
