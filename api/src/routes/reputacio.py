"""
Reputació & Premsa — monitoratge de premsa catalana en temps real.
Ingesta RSS, classificació IA (partit, tema, sentiment), evolució temporal.
"""

import os
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional

import feedparser
import psycopg2
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reputacio", tags=["reputacio"])

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# RSS feeds de premsa catalana
RSS_FEEDS = [
    {"nom": "Vilaweb", "url": "https://www.vilaweb.cat/feed/", "idioma": "ca"},
    {"nom": "NacióDigital", "url": "https://www.naciodigital.cat/rss", "idioma": "ca"},
    {"nom": "ARA", "url": "https://www.ara.cat/rss/", "idioma": "ca"},
    {"nom": "El Punt Avui", "url": "https://www.elpuntavui.cat/rss.html", "idioma": "ca"},
    {"nom": "ACN", "url": "https://www.acn.cat/rss", "idioma": "ca"},
    {"nom": "Betevé", "url": "https://beteve.cat/feed/", "idioma": "ca"},
    {"nom": "La Vanguardia", "url": "https://www.lavanguardia.com/rss/politica.xml", "idioma": "es"},
    {"nom": "El Periódico", "url": "https://www.elperiodico.com/es/rss/politica/rss.xml", "idioma": "es"},
    {"nom": "Catalunya Press", "url": "https://www.catalunyapress.cat/rss", "idioma": "ca"},
]

PARTITS_KEYWORDS = {
    "AC": ["aliança catalana", "aliança", "sílvia orriols", "orriols"],
    "JxCat": ["junts", "junts per catalunya", "jxcat", "puigdemont", "turull"],
    "ERC": ["erc", "esquerra republicana", "esquerra", "junqueras", "rovira"],
    "PSC": ["psc", "socialistes", "socialista", "illa", "salvador illa", "collboni"],
    "CUP": ["cup", "candidatura d'unitat popular", "anticapitalistes"],
    "PP": ["pp", "popular", "partido popular", "alejandro fernández"],
    "VOX": ["vox", "garriga", "ignacio garriga"],
    "Comuns": ["comuns", "en comú", "en comú podem", "colau", "albiach"],
    "Cs": ["ciutadans", "ciudadanos"],
}

SENTIMENT_KEYWORDS = {
    "positiu": ["èxit", "acord", "millora", "creixement", "suport", "aprovació", "victòria", "guanya", "recolzament", "excel·lent", "logro", "avança"],
    "negatiu": ["escàndol", "crisi", "dimissió", "rebuig", "fracàs", "corrupció", "polèmica", "crítica", "condemna", "problema", "retirada", "derrota", "caiguda"],
}


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def _ensure_table():
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS premsa_articles (
        id SERIAL PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL,
        font TEXT NOT NULL,
        titol TEXT NOT NULL,
        resum TEXT,
        url TEXT,
        data_publicacio TIMESTAMPTZ,
        data_ingesta TIMESTAMPTZ DEFAULT NOW(),
        partits TEXT[] DEFAULT '{}',
        temes TEXT[] DEFAULT '{}',
        sentiment TEXT DEFAULT 'neutre',
        sentiment_score REAL DEFAULT 0,
        processada BOOLEAN DEFAULT FALSE
    )
    """)
    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_premsa_data ON premsa_articles(data_publicacio DESC)
    """)
    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_premsa_partits ON premsa_articles USING GIN(partits)
    """)
    conn.commit()
    conn.close()


def _detect_partits(text: str) -> list[str]:
    text_lower = text.lower()
    found = []
    for partit, keywords in PARTITS_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(partit)
                break
    return found


def _detect_sentiment(text: str) -> tuple[str, float]:
    text_lower = text.lower()
    pos = sum(1 for kw in SENTIMENT_KEYWORDS["positiu"] if kw in text_lower)
    neg = sum(1 for kw in SENTIMENT_KEYWORDS["negatiu"] if kw in text_lower)
    score = (pos - neg) / max(pos + neg, 1)
    if score > 0.2:
        return "positiu", score
    elif score < -0.2:
        return "negatiu", score
    return "neutre", score


def ingest_rss_feeds():
    """Ingest all RSS feeds — called by celery beat."""
    _ensure_table()
    conn = _get_conn()
    cur = conn.cursor()
    total_new = 0

    for feed_cfg in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_cfg["url"])
            for entry in feed.entries[:50]:
                title = entry.get("title", "")
                summary = entry.get("summary", entry.get("description", ""))
                link = entry.get("link", "")
                published = entry.get("published_parsed") or entry.get("updated_parsed")

                if not title:
                    continue

                pub_date = None
                if published:
                    try:
                        pub_date = datetime(*published[:6])
                    except Exception:
                        pub_date = datetime.now()

                text = f"{title} {summary}"
                h = hashlib.md5(f"{feed_cfg['nom']}:{link or title}".encode()).hexdigest()

                partits = _detect_partits(text)
                sentiment, score = _detect_sentiment(text)

                try:
                    cur.execute("""
                    INSERT INTO premsa_articles (hash, font, titol, resum, url, data_publicacio, partits, sentiment, sentiment_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (hash) DO NOTHING
                    """, (h, feed_cfg["nom"], title, summary[:500] if summary else None,
                          link, pub_date, partits, sentiment, score))
                    if cur.rowcount > 0:
                        total_new += 1
                except Exception:
                    conn.rollback()
                    continue

            conn.commit()
        except Exception as e:
            logger.warning(f"Error ingesting {feed_cfg['nom']}: {e}")
            continue

    conn.close()
    logger.info(f"Premsa: {total_new} articles nous ingestats")
    return total_new


# ── API Endpoints ──

@router.get("/stats")
def reputacio_stats(dies: int = Query(30)):
    conn = _get_conn()
    cur = conn.cursor()
    _ensure_table()
    since = datetime.now() - timedelta(days=dies)

    # Total articles
    cur.execute("SELECT COUNT(*) FROM premsa_articles WHERE data_publicacio >= %s", (since,))
    total = cur.fetchone()[0]

    # Per sentiment
    cur.execute("""
    SELECT sentiment, COUNT(*) FROM premsa_articles
    WHERE data_publicacio >= %s GROUP BY sentiment
    """, (since,))
    sentiments = dict(cur.fetchall())

    # Per partit
    cur.execute("""
    SELECT unnest(partits) as partit, COUNT(*) as n
    FROM premsa_articles WHERE data_publicacio >= %s AND array_length(partits, 1) > 0
    GROUP BY 1 ORDER BY 2 DESC
    """, (since,))
    per_partit = [{"partit": r[0], "mencions": r[1]} for r in cur.fetchall()]

    # Per font
    cur.execute("""
    SELECT font, COUNT(*) FROM premsa_articles
    WHERE data_publicacio >= %s GROUP BY font ORDER BY 2 DESC
    """, (since,))
    per_font = [{"font": r[0], "articles": r[1]} for r in cur.fetchall()]

    conn.close()
    return {
        "total_articles": total,
        "positius": sentiments.get("positiu", 0),
        "negatius": sentiments.get("negatiu", 0),
        "neutres": sentiments.get("neutre", 0),
        "per_partit": per_partit,
        "per_font": per_font,
        "dies": dies,
    }


@router.get("/sentiment-partit")
def sentiment_per_partit(partit: str = Query("AC"), dies: int = Query(30)):
    conn = _get_conn()
    cur = conn.cursor()
    _ensure_table()
    since = datetime.now() - timedelta(days=dies)

    cur.execute("""
    SELECT sentiment, COUNT(*) FROM premsa_articles
    WHERE %s = ANY(partits) AND data_publicacio >= %s
    GROUP BY sentiment
    """, (partit, since))
    sentiments = dict(cur.fetchall())

    cur.execute("""
    SELECT date_trunc('day', data_publicacio)::date as dia, sentiment, COUNT(*)
    FROM premsa_articles
    WHERE %s = ANY(partits) AND data_publicacio >= %s
    GROUP BY 1, 2 ORDER BY 1
    """, (partit, since))
    evolucio = {}
    for dia, sent, count in cur.fetchall():
        d = str(dia)
        if d not in evolucio:
            evolucio[d] = {"dia": d, "positiu": 0, "negatiu": 0, "neutre": 0}
        evolucio[d][sent] = count

    cur.execute("""
    SELECT titol, font, url, sentiment, sentiment_score, data_publicacio
    FROM premsa_articles
    WHERE %s = ANY(partits) AND data_publicacio >= %s
    ORDER BY data_publicacio DESC LIMIT 20
    """, (partit, since))
    articles = [{"titol": r[0], "font": r[1], "url": r[2], "sentiment": r[3], "score": r[4], "data": str(r[5])[:10] if r[5] else None} for r in cur.fetchall()]

    conn.close()
    return {
        "partit": partit,
        "positius": sentiments.get("positiu", 0),
        "negatius": sentiments.get("negatiu", 0),
        "neutres": sentiments.get("neutre", 0),
        "evolucio": list(evolucio.values()),
        "articles": articles,
    }


@router.get("/temes-negatius")
def temes_negatius(partit: str = Query("AC"), dies: int = Query(30)):
    """Temes on el partit té mala premsa — candidats per 'neteja'."""
    conn = _get_conn()
    cur = conn.cursor()
    _ensure_table()
    since = datetime.now() - timedelta(days=dies)

    cur.execute("""
    SELECT titol, resum, font, sentiment_score, data_publicacio, url
    FROM premsa_articles
    WHERE %s = ANY(partits) AND sentiment = 'negatiu' AND data_publicacio >= %s
    ORDER BY sentiment_score ASC, data_publicacio DESC LIMIT 20
    """, (partit, since))
    articles = [{"titol": r[0], "resum": r[1], "font": r[2], "score": r[3], "data": str(r[4])[:10] if r[4] else None, "url": r[5]} for r in cur.fetchall()]

    conn.close()
    return {"partit": partit, "articles": articles}


@router.post("/ingest")
def trigger_ingest():
    """Manual trigger for RSS ingestion."""
    n = ingest_rss_feeds()
    return {"ok": True, "nous_articles": n}
