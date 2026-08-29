"""
NoCap — one-time local authorization for Gmail ingestion.

Not deployed, not imported by anything else -- run this once, by hand, on
whichever machine has a browser, to authorize NoCap's Gmail ingestion
against your own inbox and get back a refresh token.

Needs a Desktop-app OAuth client (Google Cloud Console -> APIs & Services ->
Credentials -> Create Credentials -> OAuth client ID -> Desktop app).
The existing GOOGLE_OAUTH_CLIENT_ID/SECRET in .env is a Web client scoped
to Supabase's own "Sign in with Google" and can't complete this script's
localhost-redirect flow -- it needs its own, separate client.

Usage:
    pip install google-auth-oauthlib
    python scripts/gmail_oauth_setup.py <client_id> <client_secret>

Opens your browser, you sign into the Gmail account you want NoCap
watching and approve read-only access, then this prints three env vars --
save all three to .env and to Vercel's dashboard.
"""

import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python gmail_oauth_setup.py <client_id> <client_secret>")
        sys.exit(1)

    client_id, client_secret = sys.argv[1], sys.argv[2]
    flow = InstalledAppFlow.from_client_config(
        {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        },
        scopes=SCOPES,
    )
    credentials = flow.run_local_server(port=0)

    print("\nSuccess -- save these to .env and to Vercel's dashboard:\n")
    print(f"GMAIL_OAUTH_CLIENT_ID={client_id}")
    print(f"GMAIL_OAUTH_CLIENT_SECRET={client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={credentials.refresh_token}")


if __name__ == "__main__":
    main()
