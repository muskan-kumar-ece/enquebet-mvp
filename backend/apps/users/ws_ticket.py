"""
Ephemeral WebSocket Ticket Authentication Service.
Prevents leaking long-lived JWT tokens into WebSocket query parameters,
reverse proxy access logs, and browser histories.
"""
import secrets
from django.core.cache import cache


TICKET_PREFIX = "ws_ticket:"
DEFAULT_TICKET_TTL = 30  # seconds


def create_ws_ticket(user_id: str, timeout: int = DEFAULT_TICKET_TTL) -> str:
    """
    Generate a cryptographically secure single-use ticket stored with a short TTL.
    """
    ticket = secrets.token_hex(24)
    cache.set(f"{TICKET_PREFIX}{ticket}", str(user_id), timeout=timeout)
    return ticket


def validate_and_consume_ws_ticket(ticket: str) -> str | None:
    """
    Atomically validate and consume (delete) a ticket. Returns user_id if valid.
    """
    if not ticket or not isinstance(ticket, str):
        return None
    key = f"{TICKET_PREFIX}{ticket}"
    user_id = cache.get(key)
    if user_id:
        # Atomic single-use: delete immediately
        cache.delete(key)
        return str(user_id)
    return None
