"""Ingesta de menciones sociales: Bluesky firehose + RSS prensa catalana.

Mantiene la lógica simple: pull periódico de feeds públicos, dedupe por (fuente, fuente_url).
"""

import logging
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

import httpx

from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)


RSS_FEEDS = [
    ("vilaweb", "https://www.vilaweb.cat/rss/home/"),
    ("naciodigital", "https://www.naciodigital.cat/feed.rss"),
    ("ara", "https://www.ara.cat/rss/"),
    ("elnacional", "https://www.elnacional.cat/oc/rss"),
    ("elpuntavui", "https://www.elpuntavui.cat/rss/home.html"),
]

KEYWORDS_AC = ["aliança catalana", "alianza catalana", "ac ", "sílvia orriols"]
KEYWORDS_TOPICS = [
    "habitatge", "vivienda", "immigració", "inmigración", "seguretat", "seguridad",
    "urbanisme", "urbanismo", "agricultura", "pesca", "caça", "caza",
    "comerç", "comercio", "medi ambient", "medio ambiente",
]


def ingest_rss() -> int:
    inserted = 0
    for fuente, url in RSS_FEEDS:
        try:
            r = httpx.get(url, timeout=20, follow_redirects=True,
                          headers={"User-Agent": "AyuntamentIA-RSS/1.0"})
            r.raise_for_status()
            root = ET.fromstring(r.text)
        except Exception as e:
            logger.warning(f"RSS {fuente} fallo: {e}")
            continue
        for item in root.iter("item"):
            link = (item.findtext("link") or "").strip()
            title = (item.findtext("title") or "").strip()
            desc = (item.findtext("description") or "").strip()
            pub = item.findtext("pubDate") or ""
            text = f"{title}. {desc}"
            if not _is_relevant(text):
                continue
            try:
                dt = _parse_pub(pub)
                with get_db() as conn:
                    with get_cursor(conn) as cur:
                        cur.execute(
                            """INSERT INTO mencion_social (fuente, fuente_url, autor, texto, publicado_at, raw)
                               VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                               ON CONFLICT (fuente, fuente_url) DO NOTHING""",
                            (fuente, link, fuente, text[:5000], dt, '{}'),
                        )
                        if cur.rowcount:
                            inserted += 1
            except Exception as e:
                logger.warning(f"insert RSS item: {e}")
    return inserted


def ingest_bluesky() -> int:
    """Pull simple Bluesky search API (no auth, app.bsky.feed.searchPosts)."""
    inserted = 0
    queries = ["aliança catalana", "ple municipal catalunya"] + KEYWORDS_TOPICS
    for q in queries:
        try:
            r = httpx.get(
                "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts",
                params={"q": q, "limit": 25, "sort": "latest"},
                timeout=15,
            )
            if r.status_code != 200:
                continue
            posts = r.json().get("posts", [])
        except Exception as e:
            logger.warning(f"Bluesky '{q}' fallo: {e}")
            continue
        for p in posts:
            uri = p.get("uri", "")
            text = p.get("record", {}).get("text", "")
            author = p.get("author", {}).get("handle", "")
            created = p.get("record", {}).get("createdAt") or p.get("indexedAt")
            if not uri or not text:
                continue
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00")) if created else datetime.now(timezone.utc)
                with get_db() as conn:
                    with get_cursor(conn) as cur:
                        cur.execute(
                            """INSERT INTO mencion_social (fuente, fuente_url, autor, texto, publicado_at,
                                                           engagement, raw)
                               VALUES ('bluesky', %s, %s, %s, %s, %s, %s::jsonb)
                               ON CONFLICT (fuente, fuente_url) DO NOTHING""",
                            (uri, author, text[:5000], dt,
                             (p.get("likeCount", 0) or 0) + (p.get("repostCount", 0) or 0),
                             '{}'),
                        )
                        if cur.rowcount:
                            inserted += 1
            except Exception as e:
                logger.warning(f"insert bluesky: {e}")
    return inserted


def _is_relevant(text: str) -> bool:
    t = text.lower()
    if any(k in t for k in KEYWORDS_AC):
        return True
    return any(k in t for k in KEYWORDS_TOPICS)


def _parse_pub(s: str) -> datetime:
    from email.utils import parsedate_to_datetime
    try:
        return parsedate_to_datetime(s)
    except Exception:
        return datetime.now(timezone.utc)


def ingest_all() -> dict:
    rss = ingest_rss()
    bsky = ingest_bluesky()
    return {"rss": rss, "bluesky": bsky}
