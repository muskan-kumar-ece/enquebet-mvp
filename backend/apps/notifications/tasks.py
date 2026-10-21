import logging
from celery import shared_task
from .services import OutboxProcessor

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    name='notifications.deliver_outbox_entry'
)
def deliver_outbox_entry_task(self, outbox_id: str, user_id: str = None):
    """
    Asynchronously delivers a single outbox entry and updates user unread counters.
    Removes WebSocket channel transmission from the HTTP request thread.
    """
    try:
        success = OutboxProcessor.deliver_entry(outbox_id)
        if user_id:
            OutboxProcessor.broadcast_unread_count(user_id)
        return success
    except Exception as exc:
        logger.warning(f"Error in deliver_outbox_entry_task({outbox_id}): {exc}")
        raise self.retry(exc=exc)


@shared_task(name='notifications.process_pending_outbox_batch')
def process_pending_outbox_batch_task(limit: int = 100):
    """
    Periodic fallback worker to recover and deliver pending/retried outbox entries.
    """
    return OutboxProcessor.process_pending_outbox(limit=limit)
