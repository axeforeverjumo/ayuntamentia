import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:8000")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    # OpenClaw / LLM
    OPENCLAW_BASE_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:4200/v1")
    OPENCLAW_MODEL_MINI = os.getenv("OPENCLAW_MODEL_MINI", "gpt-5.4-mini")
    OPENCLAW_MODEL_FULL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

    # Parlament
    PARLAMENT_ENABLED = os.getenv("PARLAMENT_ENABLED", "1") == "1"
    PARLAMENT_BASE_URL = os.getenv("PARLAMENT_BASE_URL", "https://www.parlament.cat")
    PARLAMENT_DSPC_INDEX_URL = os.getenv(
        "PARLAMENT_DSPC_INDEX_URL",
        "https://www.parlament.cat/web/activitat-parlamentaria/dspc/index.html",
    )
    PARLAMENT_USER_AGENT = os.getenv("PARLAMENT_USER_AGENT", "AyuntamentIA-Parlament/1.0")
    PARLAMENT_BATCH_SIZE = int(os.getenv("PARLAMENT_BATCH_SIZE", "2"))
    PARLAMENT_DISCOVER_HOUR = int(os.getenv("PARLAMENT_DISCOVER_HOUR", "2"))
    PARLAMENT_ALLOWED_TYPES = tuple(
        t.strip() for t in os.getenv("PARLAMENT_ALLOWED_TYPES", "pleno").split(",") if t.strip()
    )

    # Qdrant
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "ayuntamentia_puntos")

    # Redis / Celery
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Data sources
    CKAN_BASE_URL = os.getenv("CKAN_BASE_URL", "https://dadesobertes.seu-e.cat")
    CKAN_RESOURCE_ID = os.getenv("CKAN_RESOURCE_ID", "b5d370d0-7916-48b6-8a69-3c7fa62a1467")
    SOCRATA_BASE_URL = os.getenv("SOCRATA_BASE_URL", "https://analisi.transparenciacatalunya.cat")
    SOCRATA_CARGOS_DATASET = os.getenv("SOCRATA_CARGOS_DATASET", "nm3n-3vbj")
    SOCRATA_ENTES_DATASET = os.getenv("SOCRATA_ENTES_DATASET", "6nei-4b44")

    # Party
    PARTY_NAME = os.getenv("PARTY_NAME", "ALIANÇA CATALANA")

    # Pipeline
    BACKFILL_RATE_PER_MINUTE = int(os.getenv("BACKFILL_RATE_PER_MINUTE", "2"))
    BACKFILL_YEARS = int(os.getenv("BACKFILL_YEARS", "5"))
    PDF_STORAGE_PATH = os.getenv("PDF_STORAGE_PATH", "/data/pdfs")
    MAX_RETRIES = 3

    # Telegram
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


config = Config()
