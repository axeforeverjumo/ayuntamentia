from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

API_SRC = Path(__file__).resolve().parents[3] / "api" / "src"
API_ROOT = API_SRC.parent
for candidate in (API_ROOT, API_SRC):
    candidate_str = str(candidate)
    if candidate_str not in sys.path:
        sys.path.insert(0, candidate_str)

from api.src.services.trending_score_service import trending_score_service  # noqa: E402
from .celery_app import app  # noqa: E402


@app.task(name="src.workers.trending_tasks.recalculate_daily_trending_scores")
def recalculate_daily_trending_scores() -> dict[str, Any]:
    logger.info("Starting daily trending score recalculation")

    try:
        payload = trending_score_service.calculate_and_persist_from_existing_data()
    except Exception:
        logger.exception("Daily trending score recalculation failed before persistence")
        raise

    items = payload.get("items", [])
    errors: list[dict[str, Any]] = []

    for item in items:
        try:
            logger.info(
                "Trending recalculated tema=%s widget_trending_score=%.4f base_score=%.4f delta_plens=%.4f score_premsa=%.4f score_xarxes=%.4f",
                item.get("tema"),
                float(item.get("widget_trending_score") or 0.0),
                float(item.get("base_score") or 0.0),
                float(item.get("delta_plens") or 0.0),
                float(item.get("score_premsa") or 0.0),
                float(item.get("score_xarxes") or 0.0),
            )
        except Exception as exc:
            tema = item.get("tema")
            logger.warning("Failed to log trending item tema=%s error=%s", tema, exc)
            errors.append({"tema": tema, "error": str(exc)})

    summary = {
        "processed": len(items),
        "persistence": payload.get("persistence", {}),
        "config_meta": payload.get("config_meta", {}),
        "windows": payload.get("windows", {}),
        "log_errors": errors,
    }

    logger.info(
        "Finished daily trending score recalculation processed=%s updated=%s attempted=%s log_errors=%s",
        summary["processed"],
        summary["persistence"].get("updated", 0),
        summary["persistence"].get("attempted", 0),
        len(errors),
    )
    return summary


if __name__ == "__main__":
    result = recalculate_daily_trending_scores()
    logger.info("Manual trending task result: %s", result)
    print(result)
