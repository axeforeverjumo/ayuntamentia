from pathlib import Path

_dir = Path(__file__).parent


def _load(name: str) -> str:
    return (_dir / name).read_text(encoding="utf-8")


EXTRACT_ACTA_PROMPT = _load("extract_acta.md")
COMPARE_POINTS_PROMPT = _load("compare_points.md")
CHAT_SYSTEM_PROMPT = _load("chat_system.md")
WEEKLY_REPORT_PROMPT = _load("weekly_report.md")
