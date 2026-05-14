from celery import Celery
from celery.schedules import crontab
from ..config import config

app = Celery(
    "ayuntamentia",
    broker=config.REDIS_URL,
    backend=config.REDIS_URL,
    include=["src.workers.tasks", "src.workers.trending_tasks"],
)

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
            "task": "src.workers.tasks.sync_ckan_catalog",
            "schedule": crontab(minute=0, hour="*/6"),  # Every 6 hours
        },
        "sync-municat": {
            "task": "src.workers.tasks.sync_municat_data",
            "schedule": crontab(minute=0, hour=3, day_of_week=1),  # Monday 3am
        },
        "process-backfill-batch": {
            "task": "src.workers.tasks.process_backfill_batch",
            "schedule": 30.0,  # Every 30 seconds
        },
        "dispatch-subscripciones": {
            "task": "src.workers.tasks.dispatch_subscripciones",
            "schedule": 60.0,  # Cada minuto
        },
        "ingest-social": {
            "task": "src.workers.tasks.ingest_social",
            "schedule": crontab(minute="*/15"),  # Cada 15 min
        },
        "classify-social-batch": {
            "task": "src.workers.tasks.classify_social_batch",
            "schedule": 90.0,  # Cada 90s
        },
        "detect-emerging": {
            "task": "src.workers.tasks.detect_emerging",
            "schedule": crontab(minute=0, hour="*/4"),  # Cada 4h
        },
        "discover-parlament": {
            "task": "src.workers.tasks.discover_parlament",
            "schedule": crontab(minute=0, hour=config.PARLAMENT_DISCOVER_HOUR),
        },
        "process-parlament-batch": {
            "task": "src.workers.tasks.process_parlament_batch",
            "schedule": 120.0,  # cada 2 min
        },
        "weekly-report": {
            "task": "src.workers.tasks.generate_weekly_report",
            "schedule": crontab(minute=0, hour=8, day_of_week=1),  # Monday 8am
        },
        "evaluate-alert-rules": {
            "task": "src.workers.tasks.evaluate_alert_rules",
            "schedule": crontab(minute="*/30"),  # cada 30 minutos
        },
        "ingest-premsa": {
            "task": "src.workers.tasks.ingest_premsa",
            "schedule": crontab(minute="*/30"),  # cada 30 minutos
        },
        "recalculate-daily-trending-scores": {
            "task": "src.workers.trending_tasks.recalculate_daily_trending_scores",
            "schedule": crontab(minute=15, hour=2),  # diaria 02:15 UTC para MVP
        },
    },
)
