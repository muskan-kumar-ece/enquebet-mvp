"""
Notification Signals
Durable real-time broadcasts are managed transactionally by NotificationService
and OutboxProcessor to guarantee delivery on transaction commit and prevent
uncommitted race conditions.
"""
# Real-time broadcasts are handled transactionally via NotificationService / NotificationOutbox.
