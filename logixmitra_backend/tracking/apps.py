import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)
_scheduler = None


def start_tracking_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    from tracking.services import update_all_orders_tracking

    _scheduler = BackgroundScheduler(timezone=str(settings.TIME_ZONE))
    minutes = getattr(settings, "TRACKING_CRON_MINUTES", 50)
    _scheduler.add_job(update_all_orders_tracking, "interval", minutes=minutes, id="tracking_update", replace_existing=True)
    _scheduler.start()
    logger.info("Tracking scheduler started (every %s minutes)", minutes)


class TrackingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tracking"

    def ready(self):
        import os
        if os.environ.get("RUN_MAIN") == "true" or os.environ.get("DJANGO_SETTINGS_MODULE"):
            try:
                start_tracking_scheduler()
            except Exception:
                logger.exception("Failed to start tracking scheduler")
