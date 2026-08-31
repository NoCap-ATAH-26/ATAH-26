"""
NoCap — One-command demo

Runs the full autonomous chain (Inspector, then Repair + Verifier for
anything that needs it) against the ten canonical demo documents and prints
a clean summary: how many were approved, repaired, or quarantined, and why.

This calls the exact same agent functions the live Pub/Sub pipeline calls
(inspector.inspect_document, repair.repair_document, verifier.verify_document)
directly, in order, instead of over Pub/Sub — a synchronous stand-in for
judges who want to see the whole thing run start to finish in one command,
without needing Pub/Sub topics configured. The event-driven, no-human-in-the-
loop version of this exact chain is proven separately (see
docs/PROJECT_STATUS.md and orchestrator.py); this script proves the agents'
actual decisions, live, on demand.

Usage:
    python backend/run_demo.py            # respects free-tier rate limits (slower)
    python backend/run_demo.py --fast     # no delay between calls (paid tier only)
"""

import argparse
import sys
import time

from google import genai

import inspector
import repair
import verifier

DEMO_FILES = [
    # approved
    "business_travel_guide.md",
    "expense_claims_guide.md",
    "leave_request_guide.md",
    "remote_work_guide.md",
    # needs_repair
    "executive_travel_update.md",
    "expense_claims_update.md",
    "leave_policy_update.md",
    "remote_work_benefits_update.md",
    # quarantined
    "remote_work_guide_copy.md",
    "security_access_notice.md",
]


def run(delay_seconds: float) -> list[dict]:
    client = None
    if inspector.llm_client.provider() != "openai":
        api_key = inspector.os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError("GEMINI_API_KEY not found. Make sure .env exists and is loaded.")
        client = genai.Client(api_key=api_key)
    sources = inspector.load_approved_sources()

    outcomes = []
    for i, file_name in enumerate(DEMO_FILES):
        print(f"\n[{i + 1}/{len(DEMO_FILES)}] Inspecting {file_name} ...", file=sys.stderr)
        inspection = inspector.inspect_document(file_name, client, sources)
        print(f"  -> Inspector: {inspection['status']} (risk {inspection.get('risk_score', '?')})", file=sys.stderr)

        outcome = {"file_name": file_name, "inspector": inspection, "repair": None, "verifier": None}

        if inspection["status"] == "needs_repair":
            if delay_seconds > 0:
                time.sleep(delay_seconds)
            print(f"  -> Repairing {file_name} ...", file=sys.stderr)
            repair_result = repair.repair_document(file_name, client, sources, delay_seconds=delay_seconds)
            outcome["repair"] = repair_result
            print(f"  -> Repair: {repair_result['status']}", file=sys.stderr)

            if repair_result["status"] == "repaired":
                if delay_seconds > 0:
                    time.sleep(delay_seconds)
                print(f"  -> Verifying {file_name} ...", file=sys.stderr)
                verify_result = verifier.verify_document(file_name, client, sources)
                outcome["verifier"] = verify_result
                print(f"  -> Verifier: {verify_result['status']}", file=sys.stderr)

        outcomes.append(outcome)

        is_last = i == len(DEMO_FILES) - 1
        if delay_seconds > 0 and not is_last:
            time.sleep(delay_seconds)

    return outcomes


def final_status(outcome: dict) -> str:
    if outcome["verifier"]:
        return "published" if outcome["verifier"]["status"] == "approved" else "unpublished (verifier)"
    if outcome["repair"]:
        return "unpublished (repair refused)" if outcome["repair"]["status"] != "repaired" else "repaired, unverified"
    if outcome["inspector"]["status"] == "approved":
        return "published"
    return "quarantined"


def print_summary(outcomes: list[dict]) -> None:
    approved = [o for o in outcomes if o["inspector"]["status"] == "approved"]
    repaired = [o for o in outcomes if o["inspector"]["status"] == "needs_repair"]
    quarantined = [o for o in outcomes if o["inspector"]["status"] == "quarantined"]

    print("\n" + "=" * 64)
    print("NOCAP — DEMO RUN SUMMARY")
    print("=" * 64)
    print(f"{len(approved)} approved  |  {len(repaired)} repaired  |  {len(quarantined)} quarantined\n")

    for o in outcomes:
        print(f"  {o['file_name']:<36} {final_status(o)}")
        print(f"      reason: {o['inspector']['reason']}")

    security_hits = [
        o for o in quarantined if (o["inspector"].get("risk_score") or 0) >= 90
    ]
    if security_hits:
        print("\n" + "-" * 64)
        print("SECURITY MOMENT")
        for o in security_hits:
            print(
                f"  {o['file_name']} — risk {o['inspector']['risk_score']}: "
                f"{o['inspector']['reason']}"
            )
    print("=" * 64)
    print("Every decision above is also in Supabase's audit_log table, live at /demo.\n")


def main():
    parser = argparse.ArgumentParser(description="NoCap one-command demo")
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Skip the free-tier rate-limit delay between Gemini calls (paid tier only).",
    )
    args = parser.parse_args()

    delay = 0 if args.fast else inspector.RATE_LIMIT_DELAY_SECONDS
    outcomes = run(delay)
    print_summary(outcomes)


if __name__ == "__main__":
    main()
