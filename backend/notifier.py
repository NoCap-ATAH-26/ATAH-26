"""
NoCap — Notifier

Turns a pipeline decision into something a human can actually act on,
across two layers:

1. IN-APP — every result (critical, important, or info) gets written to a
   Supabase "notifications" table, which the dashboard's bell icon reads
   from (live, via Supabase Realtime). Each notification carries structured
   evidence — what changed, impact, source, recommended action — not just
   a status string.

2. EMAIL / SLACK — critical results (quarantined) fire immediately via
   Resend + Slack, since that's the case someone needs to see right now,
   not discover later by opening the dashboard.

Severity mapping (matches the dashboard's existing status colors):
    quarantined  -> critical  (🔴) — needs a human, right now
    needs_repair -> important (🟠) — repaired automatically, worth knowing
    approved     -> info      (🔵) — routine, no action needed

Every channel is OPTIONAL and independent — missing config just no-ops
with a printed note, nothing breaks.

Setup:
1. pip install resend
2. .env:
     RESEND_API_KEY=re_...
     NOTIFY_EMAIL_FROM=alerts@yourdomain.com
     NOTIFY_EMAIL_TO=you@yourcompany.com
     SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
3. In-app notifications reuse your existing Supabase setup, no extra
   config needed if audit_log.py already works (same SUPABASE_URL/KEY).

Usage (called from inspector.py / repair.py / verifier.py):
    from notifier import notify

    notify(result, stage="verifier")   # figures out severity automatically
"""

from __future__ import annotations

import datetime
import os

from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
NOTIFY_EMAIL_FROM = os.getenv("NOTIFY_EMAIL_FROM")
NOTIFY_EMAIL_TO = os.getenv("NOTIFY_EMAIL_TO")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

_EMAIL_CONFIGURED = bool(RESEND_API_KEY and NOTIFY_EMAIL_FROM and NOTIFY_EMAIL_TO)
_SLACK_CONFIGURED = bool(SLACK_WEBHOOK_URL)

NOTIFICATIONS_TABLE = "notifications"

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


def _impact_from_risk_score(risk_score) -> str:
    if risk_score is None:
        return "Unknown"
    if risk_score >= 70:
        return "High"
    if risk_score >= 40:
        return "Medium"
    return "Low"


def _recommended_action(severity: str) -> str:
    return {
        "critical": "Review immediately — this document is quarantined and not published.",
        "important": "Review the automated repair before relying on it.",
        "info": "No action needed — processed and published automatically.",
    }.get(severity, "Review this document.")


def build_notification(result: dict, stage: str) -> dict:
    """Turns a raw agent result into structured, evidence-based notification
    fields — not just a status string."""
    status = result.get("status") or result.get("current_status", "unknown")
    severity = STATUS_TO_SEVERITY.get(status, "info")

    file_name = result.get("file_name", "unknown file")
    issues = result.get("issues") or result.get("remaining_issues") or []
    what_changed = issues[0] if issues else result.get("reason", "No details available.")
    source_files = result.get("source_files") or []

    return {
        "file_name": file_name,
        "stage": stage,
        "status": status,
        "severity": severity,
        "title": f"{SEVERITY_CONFIG[severity]['label']}: {file_name}",
        "what_changed": what_changed,
        "all_issues": issues,
        "impact": _impact_from_risk_score(result.get("risk_score")),
        "source": ", ".join(source_files) if source_files else "No source cited.",
        "recommended_action": _recommended_action(severity),
        "reason": result.get("reason", ""),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def _write_in_app_notification(notification: dict) -> None:
    try:
        from audit_log import _get_client

        client = _get_client()
        if client is None:
            return
        client.table(NOTIFICATIONS_TABLE).insert(notification).execute()
        print(f"[notifier] In-app notification written: {notification['file_name']}")
    except Exception as e:
        # Notifications should never break the pipeline itself.
        print(f"[notifier] Could not write in-app notification: {e}")


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
    issues_html = "".join(f"<li>{i}</li>" for i in n["all_issues"]) or "<li>None listed.</li>"
    return f"""
        <h2>{SEVERITY_CONFIG[n['severity']]['emoji']} {n['title']}</h2>
        <p><strong>What changed:</strong> {n['what_changed']}</p>
        <p><strong>Impact:</strong> {n['impact']}</p>
        <p><strong>Source:</strong> {n['source']}</p>
        <p><strong>Recommended action:</strong> {n['recommended_action']}</p>
        <p><strong>All issues:</strong></p>
        <ul>{issues_html}</ul>
        <p style="color:#888;font-size:12px;">Stage: {n['stage']} · {n['timestamp']}</p>
    """


def _slack_message(n: dict) -> str:
    return (
        f"{SEVERITY_CONFIG[n['severity']]['slack_emoji']} *{n['title']}*\n"
        f"*What changed:* {n['what_changed']}\n"
        f"*Impact:* {n['impact']}\n"
        f"*Source:* {n['source']}\n"
        f"*Recommended action:* {n['recommended_action']}"
    )


def notify(result: dict, stage: str) -> dict:
    """Single entry point — call this from any agent after producing a
    result. Automatically determines severity, writes an in-app
    notification for every severity level, and fires email + Slack
    immediately for critical (quarantined) results only, to avoid
    alert fatigue on routine approvals.

    Important/info results are logged in-app but NOT emailed immediately
    by design — batch these into a daily/weekly digest in production
    (not built yet; see README roadmap notes).
    """
    notification = build_notification(result, stage)

    _write_in_app_notification(notification)

    if notification["severity"] == "critical":
        _send_email(
            subject=f"{SEVERITY_CONFIG['critical']['emoji']} NoCap: {notification['file_name']}",
            html_body=_email_body(notification),
        )
        _send_slack(_slack_message(notification))

    return notification


# Backward-compatible alias for existing call sites.
def notify_quarantine(result: dict, stage: str = "pipeline") -> dict:
    return notify(result, stage)