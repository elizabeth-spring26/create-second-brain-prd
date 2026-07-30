"""
One-time local setup: runs the Google OAuth consent flow in your browser and
prints the three values to store as env vars (locally in .env AND on Vercel):

  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REFRESH_TOKEN

Prereq (local only — not deployed):  pip install google-auth-oauthlib
Reads the Desktop OAuth client file at .secrets/credentials.json.json.

NOTE: if your Google Cloud OAuth consent screen is in "Testing" mode, the
refresh token expires after ~7 days. To make it permanent, set the consent
screen's Publishing status to "In production" (calendar.readonly is a
non-sensitive scope, so no verification is required — just click through the
"unverified app" screen during consent).
"""
import json
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
CREDS = Path(__file__).parent.parent / ".secrets" / "credentials.json.json"


def main():
    if not CREDS.exists():
        print(f"OAuth client file not found at {CREDS}")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDS), SCOPES)
    # opens a browser, spins up a localhost listener, captures the redirect
    creds = flow.run_local_server(port=0, prompt="consent")

    with open(CREDS, encoding="utf-8") as f:
        client = json.load(f)["installed"]

    print("\n===== Add these to .env and to Vercel env vars =====\n")
    print(f"GOOGLE_CLIENT_ID={client['client_id']}")
    print(f"GOOGLE_CLIENT_SECRET={client['client_secret']}")
    print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
    print("\n====================================================")
    if not creds.refresh_token:
        print("\nWARNING: no refresh_token returned. Revoke the app's access at")
        print("https://myaccount.google.com/permissions and run this again.")


if __name__ == "__main__":
    main()
