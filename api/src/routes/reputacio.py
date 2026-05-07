"""
Reputació & Premsa — monitoratge de premsa catalana en temps real.
Ingesta RSS, classificació IA (partit, tema, sentiment), evolució temporal.
"""

import os
import json
import hashlib
import logging
import time
from datetime import datetime, timedelta, timezone, date
from email.utils import parsedate_to_datetime
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

# Fallback heurístic (només quan el LLM no està disponible).
SENTIMENT_KEYWORDS = {
    "positiu": ["èxit", "acord", "millora", "creixement", "aprovació", "victòria", "guanya", "recolzament", "excel·lent", "logro", "avança"],
    "negatiu": ["escàndol", "crisi", "dimissió", "rebuig", "fracàs", "corrupció", "polèmica", "crítica", "condemna", "problema", "retirada", "derrota", "caiguda", "racisme", "racista", "xenofòbia", "xenòfob", "insult", "denúncia", "denuncia", "atac", "agressió"],
}

# Senyals que indiquen que la notícia és NEGATIVA per AC encara que en superfície sembli positiva
# (suport a víctimes/institucions = atac contra AC).
AC_NEGATIVE_SIGNALS = [
    "racisme", "racista", "xenofòbia", "xenòfob", "xenofobo",
    "insult", "insults", "denúncia", "denuncia", "denunciar",
    "rebuig", "rebutgen", "rebutja", "condemna", "condemnen",
    "atac", "agressió", "agressions", "amenaça", "amenaces",
    "polèmica", "escàndol", "expulsió", "expulsen", "investigació",
    "querella", "judici", "imputat", "imputació", "discriminació",
    "feixisme", "feixista", "ultradret", "extrema dreta",
    "manifestació contra", "concentració contra", "protesta contra",
    "donar suport a", "dona suport a", "dóna suport a", "donen suport a",  # suport a víctimes d'AC
]


def _detect_sentiment_keywords(text: str) -> tuple[str, float]:
    """Heurístic de fallback per quan el LLM falla."""
    text_lower = text.lower()
    pos = sum(1 for kw in SENTIMENT_KEYWORDS["positiu"] if kw in text_lower)
    neg = sum(1 for kw in SENTIMENT_KEYWORDS["negatiu"] if kw in text_lower)
    # Si menciona AC i hi ha senyals negatius típics → forçar negatiu
    if "aliança catalana" in text_lower or "orriols" in text_lower:
        ac_neg = sum(1 for kw in AC_NEGATIVE_SIGNALS if kw in text_lower)
        if ac_neg >= 1:
            return "negatiu", -0.7
    score = (pos - neg) / max(pos + neg, 1)
    if score > 0.2:
        return "positiu", score
    elif score < -0.2:
        return "negatiu", score
    return "neutre", score


def _detect_sentiment_llm(title: str, summary: str, partits: list[str]) -> tuple[str, float]:
    """Classifica sentiment des de la perspectiva d'Aliança Catalana (AC).

    Si AC apareix a l'article: positiu = bo per AC, negatiu = dolent per AC.
    Si no apareix AC però sí altres partits: positiu/negatiu segons el to general
    (un atac a un rival pot ser neutre/positiu indirecte; ho deixem al LLM).
    Retorna (etiqueta, score [-1,1]).
    """
    try:
        from openai import OpenAI
        proxy_url = os.environ.get("OPENCLAW_PROXY_URL", "http://127.0.0.1:10531/v1")
        model = os.environ.get("OPENCLAW_MODEL_FAST", os.environ.get("OPENCLAW_MODEL_FULL", "gpt-5.4"))
        client = OpenAI(base_url=proxy_url, api_key="subscription")

        text = f"TÍTOL: {title}\nRESUM: {(summary or '')[:600]}"
        partits_str = ", ".join(partits) if partits else "cap detectat"
        ac_present = "AC" in partits

        focus = (
            "L'article menciona Aliança Catalana (AC). Avalua si la notícia és FAVORABLE o DESFAVORABLE PER A AC. "
            "Una notícia on AC és acusada, denunciada, criticada, condemnada per racisme/xenofòbia, atacada, "
            "investigada, o on institucions/persones donen suport a víctimes d'AC, és NEGATIVA per AC. "
            "Una notícia on AC creix, aconsegueix vots, fa proposta acceptada, etc. és POSITIVA per AC."
            if ac_present else
            f"L'article no menciona AC directament. Partits detectats: {partits_str}. "
            "Avalua el to general de la notícia (positiu/negatiu/neutre) sense biaix de partit."
        )

        prompt = (
            "Ets un analista polític. Classifica el sentiment d'aquesta notícia.\n\n"
            f"{focus}\n\n"
            f"{text}\n\n"
            "Respon NOMÉS amb JSON vàlid: {\"sentiment\": \"positiu|negatiu|neutre\", \"score\": -1.0 a 1.0, \"motiu\": \"breu\"}"
        )

        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=150,
        )
        content = resp.choices[0].message.content.strip()
        # Extreu JSON
        if "```" in content:
            content = content.split("```")[1].lstrip("json").strip()
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(content[start:end + 1])
            sent = data.get("sentiment", "neutre").lower()
            if sent not in ("positiu", "negatiu", "neutre"):
                sent = "neutre"
            score = float(data.get("score", 0))
            score = max(-1.0, min(1.0, score))
            return sent, score
    except Exception as e:
        logger.warning(f"LLM sentiment fail, fallback keywords: {e}")

    return _detect_sentiment_keywords(f"{title} {summary or ''}")


def _detect_sentiment(title: str, summary: str = "", partits: Optional[list[str]] = None) -> tuple[str, float]:
    """Wrapper: usa LLM si està disponible, fallback a keywords."""
    use_llm = os.environ.get("REPUTACIO_LLM_SENTIMENT", "1") != "0"
    if use_llm:
        return _detect_sentiment_llm(title, summary or "", partits or [])
    return _detect_sentiment_keywords(f"{title} {summary or ''}")


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except Exception:
        return None


def _article_within_window(article_date: Optional[str], days: int) -> bool:
    parsed = _parse_iso_date(article_date)
    if not parsed:
        return False
    today = datetime.now(timezone.utc).date()
    cutoff = today - timedelta(days=days)
    return cutoff <= parsed <= today


def _parse_entry_datetime(entry) -> Optional[datetime]:
    """Normalitza dates RSS a UTC aware evitant timestamps locals/futurs incorrectes."""
    candidates = [
        entry.get("published_parsed"),
        entry.get("updated_parsed"),
    ]
    for parsed in candidates:
        if parsed:
            try:
                return datetime.fromtimestamp(time.mktime(parsed), tz=timezone.utc)
            except Exception:
                continue

    text_candidates = [
        entry.get("published"),
        entry.get("updated"),
        entry.get("pubDate"),
    ]
    for value in text_candidates:
        if not value:
            continue
        try:
            dt = parsedate_to_datetime(value)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except Exception:
            continue

    return None


def cleanup_old_articles(days_to_keep: int = 30) -> int:
    """Elimina noticias antiguas y fechas futuras fuera de la ventana operativa."""
    _ensure_table()
    conn = _get_conn()
    cur = conn.cursor()
    now_utc = datetime.now(timezone.utc)
    threshold = now_utc - timedelta(days=days_to_keep)
    cur.execute(
        """
        DELETE FROM premsa_articles
        WHERE data_publicacio IS NOT NULL
          AND (data_publicacio < %s OR data_publicacio > %s)
        """,
        (threshold, now_utc),
    )
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    logger.info(f"Premsa cleanup: {deleted} articles eliminats fora de finestra ({days_to_keep} dies)")
    return deleted


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




def ingest_rss_feeds():
    """Ingest all RSS feeds — called by celery beat."""
    _ensure_table()
    cleanup_old_articles(30)
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
                if not title:
                    continue

                pub_date = _parse_entry_datetime(entry)
                if pub_date and pub_date > datetime.now(timezone.utc) + timedelta(days=1):
                    logger.warning(
                        "Skipping future-dated RSS entry from %s: %s (%s)",
                        feed_cfg["nom"],
                        title[:120],
                        pub_date.isoformat(),
                    )
                    continue

                text = f"{title} {summary}"
                h = hashlib.md5(f"{feed_cfg['nom']}:{link or title}".encode()).hexdigest()

                partits = _detect_partits(text)
                sentiment, score = _detect_sentiment(title, summary, partits)

                try:
                    # Si l'article ja existeix, actualitzem data_publicacio/resum/títol/font/sentiment
                    # per evitar que es quedi una versió antiga (bug de dades "congelades").
                    cur.execute("""
                    INSERT INTO premsa_articles (hash, font, titol, resum, url, data_publicacio, partits, sentiment, sentiment_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (hash) DO UPDATE SET
                        font = EXCLUDED.font,
                        titol = EXCLUDED.titol,
                        resum = EXCLUDED.resum,
                        url = COALESCE(EXCLUDED.url, premsa_articles.url),
                        data_publicacio = COALESCE(EXCLUDED.data_publicacio, premsa_articles.data_publicacio),
                        partits = EXCLUDED.partits,
                        sentiment = EXCLUDED.sentiment,
                        sentiment_score = EXCLUDED.sentiment_score,
                        data_ingesta = NOW()
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


@router.get("/diagnostic")
def reputacio_diagnostic(partit: str = Query("AC"), dies: int = Query(30)):
    """Diagnóstico reproducible del estado del feed y refresco."""
    _ensure_table()
    conn = _get_conn()
    cur = conn.cursor()
    since = datetime.now() - timedelta(days=dies)

    cur.execute("SELECT max(data_publicacio)::date, min(data_publicacio)::date, count(*) FROM premsa_articles")
    max_date, min_date, total_articles = cur.fetchone()

    cur.execute(
        """
        SELECT titol, font, data_publicacio::date, data_ingesta
        FROM premsa_articles
        WHERE %s = ANY(partits) AND data_publicacio >= %s
        ORDER BY data_publicacio DESC NULLS LAST
        LIMIT 5
        """,
        (partit, since),
    )
    latest_articles = [
        {
            "titol": row[0],
            "font": row[1],
            "data_publicacio": str(row[2]) if row[2] else None,
            "data_ingesta": row[3].isoformat() if row[3] else None,
        }
        for row in cur.fetchall()
    ]

    cur.execute("SELECT count(*) FROM premsa_articles WHERE data_publicacio < %s", (since,))
    old_articles = cur.fetchone()[0]
    conn.close()

    latest_visible_date = str(max_date) if max_date and max_date >= since.date() else None

    feed_status = []
    for feed_cfg in RSS_FEEDS:
        try:
            feed = feedparser.parse(feed_cfg["url"])
            entry = feed.entries[0] if feed.entries else None
            feed_status.append({
                "font": feed_cfg["nom"],
                "url": feed_cfg["url"],
                "status": getattr(feed, "status", None),
                "entries": len(feed.entries),
                "bozo": bool(getattr(feed, "bozo", 0)),
                "latest_title": entry.get("title") if entry else None,
                "latest_published": entry.get("published", entry.get("updated")) if entry else None,
            })
        except Exception as e:
            feed_status.append({
                "font": feed_cfg["nom"],
                "url": feed_cfg["url"],
                "status": "error",
                "entries": 0,
                "bozo": True,
                "latest_title": None,
                "latest_published": None,
                "error": str(e),
            })

    return {
        "partit": partit,
        "dies": dies,
        "db": {
            "total_articles": total_articles,
            "min_data_publicacio": str(min_date) if min_date else None,
            "max_data_publicacio": str(max_date) if max_date else None,
            "latest_visible_date": latest_visible_date,
            "old_articles_outside_window": old_articles,
            "latest_articles_for_partit": latest_articles,
        },
        "scheduler": {
            "client_auto_refresh_seconds": 30,
            "server_ingest_expected_minutes": 30,
            "cleanup_on_ingest": True,
        },
        "feeds": feed_status,
    }


@router.post("/reclassify")
def reclassify_articles(
    dies: int = Query(60, description="Reclassifica articles dels últims N dies"),
    nomes_ac: bool = Query(True, description="Només articles que mencionen AC"),
    limit: int = Query(500),
):
    """Reclassifica el sentiment d'articles existents amb el LLM (perspectiva AC)."""
    _ensure_table()
    conn = _get_conn()
    cur = conn.cursor()
    since = datetime.now() - timedelta(days=dies)

    where = "data_publicacio >= %s"
    params = [since]
    if nomes_ac:
        where += " AND 'AC' = ANY(partits)"

    cur.execute(f"""
        SELECT id, titol, COALESCE(resum, ''), partits
        FROM premsa_articles
        WHERE {where}
        ORDER BY data_publicacio DESC
        LIMIT %s
    """, params + [limit])
    rows = cur.fetchall()

    updated = 0
    changes = []
    for row in rows:
        aid, titol, resum, partits = row
        try:
            new_sent, new_score = _detect_sentiment(titol, resum, list(partits or []))
            cur.execute("""
                UPDATE premsa_articles SET sentiment=%s, sentiment_score=%s
                WHERE id=%s AND (sentiment IS DISTINCT FROM %s OR sentiment_score IS DISTINCT FROM %s)
            """, (new_sent, new_score, aid, new_sent, new_score))
            if cur.rowcount > 0:
                updated += 1
                changes.append({"id": aid, "titol": titol[:120], "sentiment": new_sent, "score": round(new_score, 2)})
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.warning(f"reclassify fail id={aid}: {e}")

    conn.close()
    return {"ok": True, "revisats": len(rows), "actualitzats": updated, "canvis": changes[:50]}
