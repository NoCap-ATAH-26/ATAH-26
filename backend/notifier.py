"""
NoCap — Notifier

Turns a pipeline decision into something a human can actually act on.

IN-APP NOTIFICATIONS (dual-write):
  Always saved locally to data/notifications.json (guaranteed, no
  credentials needed — works offline, for local dev). ALSO synced to
  Supabase's "notifications" table if SUPABASE_URL/SUPABASE_KEY are set,
  so the same notifications show up live on your deployed Vercel site,
  not just on your laptop. Either channel failing never blocks the other
  or crashes the pipeline.

  Setup for the Supabase side (.env):
    SUPABASE_URL=https://bsjjtbnovmbwpypfpilg.supabase.co
    SUPABASE_KEY=<publishable key, same one audit_log.py uses>
  Table: see the "notifications" table migration (run once in Supabase's
  SQL Editor) — id, title, severity, document_name, message, action_taken,
  source_files, created_at, read.

Severity mapping:
    quarantined  -> critical  (🔴) — needs a human, right now
    needs_repair -> important (🟠) — repaired automatically, worth knowing
    approved     -> info      (🔵) — routine, no action needed

Email (Resend) and Slack are OPTIONAL and independent of in-app logging —
missing config just no-ops with a printed note, nothing breaks. Only
critical (quarantined) results attempt to fire them.

Usage (called from inspector.py / repair.py / verifier.py):
    from notifier import notify

    notify(result, stage="verifier")   # figures out severity automatically
"""

from __future__ import annotations

import datetime
import json
import os
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
NOTIFY_EMAIL_FROM = os.getenv("NOTIFY_EMAIL_FROM")
NOTIFY_EMAIL_TO = os.getenv("NOTIFY_EMAIL_TO")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

_EMAIL_CONFIGURED = bool(RESEND_API_KEY and NOTIFY_EMAIL_FROM and NOTIFY_EMAIL_TO)
_SLACK_CONFIGURED = bool(SLACK_WEBHOOK_URL)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_supabase_client = None
_supabase_warned = False


def _get_supabase_client():
    """Lazily create and cache the Supabase client, mirroring audit_log.py's
    pattern exactly. Returns None (fails soft) if not configured/reachable,
    printing one warning rather than crashing the pipeline."""
    global _supabase_client, _supabase_warned
    if _supabase_client is not None:
        return _supabase_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        if not _supabase_warned:
            print(
                "[notifier] SUPABASE_URL/SUPABASE_KEY not set — notifications "
                "only saved locally (data/notifications.json), not live on "
                "the deployed site. See notifier.py setup docs.",
                file=sys.stderr,
            )
            _supabase_warned = True
        return None

    try:
        from supabase import create_client

        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase_client
    except Exception as exc:
        if not _supabase_warned:
            print(f"[notifier] Supabase unavailable ({exc}), notifications only saved locally.", file=sys.stderr)
            _supabase_warned = True
        return None

# backend/notifier.py -> project root -> data/notifications.json
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
NOTIFICATIONS_FILE = DATA_DIR / "notifications.json"

SEVERITY_CONFIG = {
    "critical": {"emoji": "🔴", "label": "Critical", "slack_emoji": ":red_circle:"},
    "important": {"emoji": "🟠", "label": "Important", "slack_emoji": ":large_orange_circle:"},
    "info": {"emoji": "🔵", "label": "Information", "slack_emoji": ":large_blue_circle:"},
}

STATUS_TO_SEVERITY = {
    "quarantined": "critical",
    "needs_repair": "important",
    "repaired": "important",
    "approved": "info",
}

ACTION_TAKEN_BY_STATUS = {
    "quarantined": "Quarantined — document not published, flagged for human review.",
    "needs_repair": "Flagged for repair — an automated fix will be attempted.",
    "repaired": "Repaired automatically using approved policy sources.",
    "approved": "Approved and published automatically.",
}


def _impact_from_risk_score(risk_score) -> str:
    if risk_score is None:
        return "Unknown"
    if risk_score >= 70:
        return "High"
    if risk_score >= 40:
        return "Medium"
    return "Low"


def build_notification(result: dict, stage: str) -> dict:
    """Turns a raw agent result into a structured notification record."""
    status = result.get("status") or result.get("current_status", "unknown")
    severity = STATUS_TO_SEVERITY.get(status, "info")

    file_name = result.get("file_name", "unknown file")
    issues = result.get("issues") or result.get("remaining_issues") or []
    message = issues[0] if issues else result.get("reason", "No details available.")
    source_files = result.get("source_files") or []

    return {
        "id": str(uuid.uuid4()),
        "title": f"{SEVERITY_CONFIG[severity]['label']}: {file_name}",
        "severity": severity,
        "document_name": file_name,
        "message": message,
        "action_taken": ACTION_TAKEN_BY_STATUS.get(status, "Processed."),
        "source_files": source_files,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "read": False,
        # Kept for internal use (email/Slack bodies, debugging) — not part
        # of the fixed schema requested, but harmless extra fields.
        "_stage": stage,
        "_status": status,
        "_impact": _impact_from_risk_score(result.get("risk_score")),
        "_all_issues": issues,
        "_reason": result.get("reason", ""),
    }


def _load_notifications() -> list[dict]:
    if not NOTIFICATIONS_FILE.exists():
        return []
    try:
        return json.loads(NOTIFICATIONS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_notification(notification: dict) -> None:
    """Appends one notification, newest first, to data/notifications.json
    (always — this is the guaranteed local fallback), AND writes the same
    notification to Supabase if configured, so it shows up live on the
    deployed site too. Either channel failing never blocks the other."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    notifications = _load_notifications()
    notifications.insert(0, notification)  # newest first

    NOTIFICATIONS_FILE.write_text(json.dumps(notifications, indent=2), encoding="utf-8")
    print("[notifier] In-app notification saved")

    client = _get_supabase_client()
    if client is not None:
        # Supabase table has fixed columns matching the local schema minus
        # the internal "_"-prefixed debug fields.
        row = {
            "id": notification["id"],
            "title": notification["title"],
            "severity": notification["severity"],
            "document_name": notification["document_name"],
            "message": notification["message"],
            "action_taken": notification["action_taken"],
            "source_files": notification["source_files"],
            "created_at": notification["created_at"],
            "read": notification["read"],
        }
        try:
            client.table("notifications").insert(row).execute()
            print("[notifier] Notification synced to Supabase (live on Vercel).")
        except Exception as exc:
            print(f"[notifier] Failed to sync notification to Supabase: {exc}", file=sys.stderr)


def _send_email(subject: str, html_body: str) -> None:
    if not _EMAIL_CONFIGURED:
        print("[notifier] Email not configured, skipping (see notifier.py setup docs).")
        return

    import resend

    resend.api_key = RESEND_API_KEY
    try:
        resend.Emails.send(
            {
                "from": NOTIFY_EMAIL_FROM,
                "to": [NOTIFY_EMAIL_TO],
                "subject": subject,
                "html": html_body,
            }
        )
        print(f"[notifier] Email sent: {subject}")
    except Exception as e:
        print(f"[notifier] Email failed to send: {e}")


def _send_slack(text: str) -> None:
    if not _SLACK_CONFIGURED:
        print("[notifier] Slack not configured, skipping (see notifier.py setup docs).")
        return

    import urllib.request
    import json as _json

    try:
        req = urllib.request.Request(
            SLACK_WEBHOOK_URL,
            data=_json.dumps({"text": text}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=10)
        print("[notifier] Slack alert sent.")
    except Exception as e:
        print(f"[notifier] Slack failed to send: {e}")


def _email_body(n: dict) -> str:
    issues_html = "".join(f"<li>{i}</li>" for i in n["_all_issues"]) or "<li>None listed.</li>"
    sources = ", ".join(n["source_files"]) or "No source cited."
    return f"""
        <h2>{SEVERITY_CONFIG[n['severity']]['emoji']} {n['title']}</h2>
        <p><strong>Message:</strong> {n['message']}</p>
        <p><strong>Impact:</strong> {n['_impact']}</p>
        <p><strong>Source:</strong> {sources}</p>
        <p><strong>Action taken:</strong> {n['action_taken']}</p>
        <p><strong>All issues:</strong></p>
        <ul>{issues_html}</ul>
        <p style="color:#888;font-size:12px;">Stage: {n['_stage']} · {n['created_at']}</p>
    """


def _slack_message(n: dict) -> str:
    sources = ", ".join(n["source_files"]) or "No source cited."
    return (
        f"{SEVERITY_CONFIG[n['severity']]['slack_emoji']} *{n['title']}*\n"
        f"*Message:* {n['message']}\n"
        f"*Impact:* {n['_impact']}\n"
        f"*Source:* {sources}\n"
        f"*Action taken:* {n['action_taken']}"
    )


def notify(result: dict, stage: str) -> dict:
    """Single entry point — call this from any agent after producing a
    result. Always saves an in-app notification locally. Only fires
    email + Slack for critical (quarantined) results, and only if those
    channels are configured — otherwise they no-op silently.
    """
    notification = build_notification(result, stage)

    _save_notification(notification)

    if notification["severity"] == "critical":
        _send_email(
            subject=f"{SEVERITY_CONFIG['critical']['emoji']} NoCap: {notification['document_name']}",
            html_body=_email_body(notification),
        )
        _send_slack(_slack_message(notification))

    return notification


# Backward-compatible alias for existing call sites.
def notify_quarantine(result: dict, stage: str = "pipeline") -> dict:
    return notify(result, stage)