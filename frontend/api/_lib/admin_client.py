"""
NoCap — shared Supabase service-role client.

source_connections holds real OAuth tokens, so it deliberately has no RLS
policy for the publishable key that audit_log._get_client() uses (see the
migration that created it). Anything that reads or writes that table --
source_connections.py, drive-notify.py, renew-drive-watch.py, and
gmail-notify.py's own historical helper -- needs this instead.
"""

import os

from supabase import create_client


def get_admin_client():
    """Returns None (rather than raising) if the service-role key isn't
    configured, matching audit_log._get_client()'s fail-soft pattern."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)
