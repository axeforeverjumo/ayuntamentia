from celery import Celery
from celery.schedules import crontab
from ..config import config

app = Celery("ayuntamentia", broker=config.REDIS_URL, backend=config.REDIS_URL)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Madrid",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_rate_limit=f"{config.BACKFILL_RATE_PER_MINUTE}/m",
    beat_schedule={
        "sync-ckan-catalog": {
            "task": "pipeline.src.workers.tasks.sync_ckan_catalog",
            "schedule": crontab(minute=0, hour="*/6"),  # Every 6 hours
        },
        "sync-municat": {
            "task": "pipeline.src.workers.tasks.sync_municat_data",
            "schedule": crontab(minute=0, hour=3, day_of_week=1),  # Monday 3am
        },
        "process-backfill-batch": {
            "task": "pipeline.src.workers.tasks.process_backfill_batch",
            "schedule": 30.0,  # Every 30 seconds
        },
        "weekly-report": {
            "task": "pipeline.src.workers.tasks.generate_weekly_report",
            "schedule": crontab(minute=0, hour=8, day_of_week=1),  # Monday 8am
        },
    },
)
