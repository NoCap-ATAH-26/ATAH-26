"""
NoCap — Google Drive file ingestion.

Watches a Drive account via the Drive API's change-notification webhooks
(start_watch() -> a direct HTTPS callback, unlike Gmail's Pub/Sub-routed
push -- see frontend/api/pubsub/drive-notify.py) and drops any new/changed
file straight into the same incoming-uploads bucket the dashboard writes
to -- from there it's indistinguishable from a manual upload.

Auth: reuses the "google" row in source_connections (see
source_connections.py), refreshed with the same GOOGLE_OAUTH_CLIENT_ID/
SECRET Supabase Auth already uses for sign-in -- no separate app needed,
unlike Gmail's original Desktop-app client.

Drive's push notifications carry no payload, just "something changed, go
check" (an X-Goog-Resource-State header) -- change_page_token in Supabase's
source_connections.config is the resume point, same idea as Gmail's
last_history_id.
"""

import os

import requests

from source_connections import get_connection

DRIVE_API = "https://www.googleapis.com/drive/v3"
TOKEN_URL = "https://oauth2.googleapis.com/token"

# Native Google formats can't be downloaded directly -- they're exported to
# a plain format instead. Anything else (PDF, DOCX, images, ...) is fetched
# as-is via alt=media.
EXPORT_MIME_TYPES = {
    "application/vnd.google-apps.document": ("text/plain", ".txt"),
    "application/vnd.google-apps.spreadsheet": ("text/csv", ".csv"),
    "application/vnd.google-apps.presentation": ("application/pdf", ".pdf"),
}


def _access_token() -> str:
    connection = get_connection("google")
    if not connection:
        raise EnvironmentError(
            "Google isn't connected -- connect it from /dashboard/sources first."
        )

    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    if not (client_id and client_secret):
        raise EnvironmentError("GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET not set.")

    response = requests.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": connection["refresh_token"],
            "grant_type": "refresh_token",
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def _headers() -> dict:
    return {"Authorization": f"Bearer {_access_token()}"}


def _download_file(file_id: str, name: str) -> tuple[str, bytes] | None:
    meta = requests.get(
        f"{DRIVE_API}/files/{file_id}",
        headers=_headers(),
        params={"fields": "mimeType,trashed"},
        timeout=15,
    )
    meta.raise_for_status()
    info = meta.json()
    if info.get("trashed"):
        return None

    mime_type = info.get("mimeType", "")
    export = EXPORT_MIME_TYPES.get(mime_type)

    if export:
        export_mime, suffix = export
        resp = requests.get(
            f"{DRIVE_API}/files/{file_id}/export",
            headers=_headers(),
            params={"mimeType": export_mime},
            timeout=30,
        )
        resp.raise_for_status()
        return f"{name}{suffix}", resp.content

    if mime_type.startswith("application/vnd.google-apps."):
        # Other native Drive types (forms, drawings, ...) have no clean
        # export target -- skip rather than guess.
        return None

    resp = requests.get(
        f"{DRIVE_API}/files/{file_id}",
        headers=_headers(),
        params={"alt": "media"},
        timeout=30,
    )
    resp.raise_for_status()
    return name, resp.content


def start_page_token() -> str:
    resp = requests.get(f"{DRIVE_API}/changes/startPageToken", headers=_headers(), timeout=15)
    resp.raise_for_status()
    return resp.json()["startPageToken"]


def fetch_new_files(page_token: str) -> tuple[list[tuple[str, bytes]], str]:
    """Returns (every (file_name, data) for files changed since page_token,
    the next page token to resume from)."""
    files: list[tuple[str, bytes]] = []
    token = page_token

    while token:
        resp = requests.get(
            f"{DRIVE_API}/changes",
            headers=_headers(),
            params={
                "pageToken": token,
                "fields": "nextPageToken,newStartPageToken,changes(fileId,removed,file(name,mimeType,trashed))",
            },
            timeout=15,
        )
        resp.raise_for_status()
        body = resp.json()

        for change in body.get("changes", []):
            if change.get("removed"):
                continue
            file_info = change.get("file")
            if not file_info or file_info.get("trashed"):
                continue
            downloaded = _download_file(change["fileId"], file_info["name"])
            if downloaded:
                files.append(downloaded)

        if "newStartPageToken" in body:
            return files, body["newStartPageToken"]
        token = body.get("nextPageToken")

    return files, page_token


def start_watch(webhook_url: str, channel_id: str, channel_token: str, page_token: str) -> dict:
    """Registers (or renews) push notifications for Drive changes. Expires
    within a few days per Drive's API -- frontend/api/cron/renew-drive-watch.py
    calls this periodically, well inside that window."""
    resp = requests.post(
        f"{DRIVE_API}/changes/watch",
        headers=_headers(),
        params={"pageToken": page_token},
        json={
            "id": channel_id,
            "type": "web_hook",
            "address": webhook_url,
            "token": channel_token,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
