"""
NoCap — verifies that a Pub/Sub push request actually came from Google Pub/Sub.

A push subscription's target is just a public HTTPS URL. Without this check,
anyone who finds the endpoint could POST a fake "this document is approved"
event and manipulate the pipeline, or just spam it and burn Gemini quota.
Pub/Sub push subscriptions can be configured to attach a signed Google OIDC
token (Authorization: Bearer <token>) to every push request; this verifies
that token's signature, audience, and issuer before a handler trusts the
payload.

Requires the push subscription to have been created with:
    --push-auth-service-account=<PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL>
    --push-auth-token-audience=<this endpoint's exact URL>

See docs/CLOUD_RUN_DEPLOY.md's sibling doc for the actual subscription
setup commands (Vercel push migration, not that file specifically).
"""

import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


def verify_push_request(authorization_header: str | None, expected_audience: str) -> bool:
    """Returns True if this request is a genuine Pub/Sub push carrying a
    valid OIDC token for the expected service account and audience."""
    if not authorization_header or not authorization_header.startswith("Bearer "):
        return False

    token = authorization_header[len("Bearer "):]

    try:
        claims = id_token.verify_oauth2_token(
            token, google_requests.Request(), audience=expected_audience
        )
    except Exception:  # noqa: BLE001 - any verification failure means reject
        return False

    expected_email = os.getenv("PUBSUB_PUSH_SERVICE_ACCOUNT_EMAIL")
    if not expected_email:
        return False

    return claims.get("email") == expected_email and claims.get("email_verified") is True
