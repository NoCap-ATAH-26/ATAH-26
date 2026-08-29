"""
NoCap — Notifier (deployed/Vercel copy)

See backend/notifier.py for the full design writeup -- this copy is
identical except it doesn't call load_dotenv(), since Vercel injects
env vars directly and there's no .env file in this environment (matches
every other module in frontend/api/_lib/).

Turns a pipeline decision into something a human can actually act on:
in-app (Supabase "notifications" table, read live by the dashboard's
bell icon) for every severity, plus email (Resend) for critical
(quarantined) results only. Every channel is OPTIONAL -- missing config
just no-ops with a printed note, nothing breaks.

Usage (called from inspector.py / verifier.py):
    import notifier
    notifier.notify(result, stage="verifier")
"""

from __future__ import annotations

import datetime
import os

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
NOTIFY_EMAIL_FROM = os.getenv("NOTIFY_EMAIL_FROM")
NOTIFY_EMAIL_TO = os.getenv("NOTIFY_EMAIL_TO")

_EMAIL_CONFIGURED = bool(RESEND_API_KEY and NOTIFY_EMAIL_FROM and NOTIFY_EMAIL_TO)

NOTIFICATIONS_TABLE = "notifications"

SEVERITY_CONFIG = {
    "critical": {"emoji": "🔴", "label": "Critical"},
    "important": {"emoji": "🟠", "label": "Important"},
    "info": {"emoji": "🔵", "label": "Information"},
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
        "source_files": source_files,
        "recommended_action": _recommended_action(severity),
        "reason": result.get("reason", ""),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def _to_db_row(n: dict) -> dict:
    """Maps the richer internal notification dict onto the notifications
    table's actual columns (title, severity, document_name, message,
    action_taken, source_files) -- id/created_at/read are left to the
    table's own defaults."""
    return {
        "title": n["title"],
        "severity": n["severity"],
        "document_name": n["file_name"],
        "message": n["what_changed"],
        "action_taken": n["recommended_action"],
        "source_files": n["source_files"],
    }


def _write_in_app_notification(notification: dict) -> None:
    try:
        from audit_log import _get_client

        client = _get_client()
        if client is None:
            return
        client.table(NOTIFICATIONS_TABLE).insert(_to_db_row(notification)).execute()
        print(f"[notifier] In-app notification written: {notification['file_name']}")
    except Exception as e:  # noqa: BLE001
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
    except Exception as e:  # noqa: BLE001
        print(f"[notifier] Email failed to send: {e}")


def _source_line(n: dict) -> str:
    return ", ".join(n["source_files"]) if n["source_files"] else "No source cited."


def _email_body(n: dict) -> str:
    issues_html = "".join(f"<li>{i}</li>" for i in n["all_issues"]) or "<li>None listed.</li>"
    return f"""
        <h2>{SEVERITY_CONFIG[n['severity']]['emoji']} {n['title']}</h2>
        <p><strong>What changed:</strong> {n['what_changed']}</p>
        <p><strong>Impact:</strong> {n['impact']}</p>
        <p><strong>Source:</strong> {_source_line(n)}</p>
        <p><strong>Recommended action:</strong> {n['recommended_action']}</p>
        <p><strong>All issues:</strong></p>
        <ul>{issues_html}</ul>
        <p style="color:#888;font-size:12px;">Stage: {n['stage']} · {n['timestamp']}</p>
    """


def notify(result: dict, stage: str) -> dict:
    """Single entry point — call this from any agent after producing a
    result. Automatically determines severity, writes an in-app
    notification for every severity level, and emails immediately for
    critical (quarantined) results only, to avoid alert fatigue on
    routine approvals."""
    notification = build_notification(result, stage)

    _write_in_app_notification(notification)

    if notification["severity"] == "critical":
        _send_email(
            subject=f"{SEVERITY_CONFIG['critical']['emoji']} NoCap: {notification['file_name']}",
            html_body=_email_body(notification),
        )

    return notification
