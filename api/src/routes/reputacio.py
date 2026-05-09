"""
Reputació & Premsa — monitoratge de premsa catalana en temps real.
Ingesta RSS, classificació IA (partit, tema, sentiment), evolució temporal.
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from typing import Optional

import feedparser
import psycopg2
from fastapi import APIRouter, Query, Response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reputacio", tags=["reputacio"])

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# RSS feeds de premsa catalana
RSS_FEEDS = [
    {"nom": "Vilaweb", "url": "https://www.vilaweb.cat/feed/", "idioma": "ca"},
    {"nom": "NacióDigital", "url": "https://www.naciodigital.cat/rss", "idioma": "ca"},
    {"nom": "ARA", "url": "https://www.ara.cat/rss/", "idioma": "ca"},
    {"nom": "El Punt Avui", "url": "https://www.elpuntavui.cat/?format=feed&type=rss", "idioma": "ca"},
    {"nom": "Betevé", "url": "https://beteve.cat/feed/", "idioma": "ca"},
    {"nom": "La Vanguardia", "url": "https://www.lavanguardia.com/rss/politica.xml", "idioma": "es"},
    {"nom": "El Periódico", "url": "https://www.elperiodico.com/es/rss/politica/rss.xml", "idioma": "es"},
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


def _parse_entry_datetime(entry) -> Optional[datetime]:
    """Extreu la millor data disponible del feed i la normalitza a UTC naive."""
    for attr in ("published_parsed", "updated_parsed", "created_parsed"):
        parsed = entry.get(attr)
        if parsed:
            try:
                return datetime(*parsed[:6])
            except Exception:
                logger.debug("Invalid %s in RSS entry", attr, exc_info=True)

    for attr in ("published", "updated", "created"):
        value = entry.get(attr)
        if not value:
            continue
        try:
            parsed_dt = parsedate_to_datetime(value)
            if parsed_dt.tzinfo is not None:
                parsed_dt = parsed_dt.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed_dt
        except Exception:
            try:
                normalized = str(value).replace("Z", "+00:00")
                parsed_dt = datetime.fromisoformat(normalized)
                if parsed_dt.tzinfo is not None:
                    parsed_dt = parsed_dt.astimezone(timezone.utc).replace(tzinfo=None)
                return parsed_dt
            except Exception:
                logger.debug("Invalid textual RSS date: %s", value, exc_info=True)

    return None


def _normalize_article_url(url: str) -> str:
    return (url or "").strip().lower().rstrip("/")


def _normalize_title(title: str) -> str:
    return " ".join(unescape(title or "").strip().lower().split())


def _legacy_article_hash(font: str, link: str, title: str, pub_date: Optional[datetime]) -> str:
    stable_key = "|".join([
        font.strip().lower(),
        _normalize_article_url(link),
        title.strip().lower(),
        pub_date.isoformat() if pub_date else "",
    ])
    return hashlib.md5(stable_key.encode()).hexdigest()



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
                if not title:
                    continue

                normalized_title = _normalize_title(title)
                normalized_link = _normalize_article_url(link)
                pub_date = _parse_entry_datetime(entry)

                text = f"{title} {summary}"
                stable_key = "|".join([
                    feed_cfg["nom"].strip().lower(),
                    normalized_link,
                    normalized_title,
                ])
                h = hashlib.md5(stable_key.encode()).hexdigest()
                legacy_hash = _legacy_article_hash(feed_cfg["nom"], link, title, pub_date)

                partits = _detect_partits(text)
                sentiment, score = _detect_sentiment(title, summary, partits)

                try:
                    cur.execute("""
                    UPDATE premsa_articles
                    SET hash = %s
                    WHERE hash = %s AND hash <> %s
                    """, (h, legacy_hash, h))

                    cur.execute("""
                    INSERT INTO premsa_articles (hash, font, titol, resum, url, data_publicacio, partits, sentiment, sentiment_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (hash) DO UPDATE
                    SET titol = EXCLUDED.titol,
                        resum = EXCLUDED.resum,
                        url = EXCLUDED.url,
                        data_publicacio = COALESCE(EXCLUDED.data_publicacio, premsa_articles.data_publicacio),
                        partits = EXCLUDED.partits,
                        sentiment = EXCLUDED.sentiment,
                        sentiment_score = EXCLUDED.sentiment_score
                    WHERE (
                        premsa_articles.data_publicacio IS DISTINCT FROM EXCLUDED.data_publicacio
                        OR premsa_articles.titol IS DISTINCT FROM EXCLUDED.titol
                        OR premsa_articles.resum IS DISTINCT FROM EXCLUDED.resum
                        OR premsa_articles.url IS DISTINCT FROM EXCLUDED.url
                        OR premsa_articles.partits IS DISTINCT FROM EXCLUDED.partits
                        OR premsa_articles.sentiment IS DISTINCT FROM EXCLUDED.sentiment
                        OR premsa_articles.sentiment_score IS DISTINCT FROM EXCLUDED.sentiment_score
                    )
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

@router.get("/latest")
def reputacio_latest(
    response: Response,
    limit: int = Query(50, ge=1, le=200),
    dies: int = Query(30, ge=1, le=365),
):
    conn = _get_conn()
    cur = conn.cursor()
    _ensure_table()
    since = datetime.now(timezone.utc) - timedelta(days=dies)

    cur.execute("""
    SELECT titol, resum, font, url, sentiment, sentiment_score, data_publicacio, partits
    FROM premsa_articles
    WHERE data_publicacio IS NOT NULL
      AND data_publicacio >= %s
    ORDER BY data_publicacio DESC, id DESC
    LIMIT %s
    """, (since, limit))
    articles = [{
        "titol": r[0],
        "resum": r[1],
        "font": r[2],
        "url": r[3],
        "sentiment": r[4],
        "score": r[5],
        "data": str(r[6])[:19] if r[6] else None,
        "partits": list(r[7] or []),
    } for r in cur.fetchall()]

    conn.close()
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return {"articles": articles}


@router.get("/stats")
def reputacio_stats(response: Response, dies: int = Query(30)):
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
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
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
def sentiment_per_partit(response: Response, partit: str = Query("AC"), dies: int = Query(30)):
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
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return {
        "partit": partit,
        "positius": sentiments.get("positiu", 0),
        "negatius": sentiments.get("negatiu", 0),
        "neutres": sentiments.get("neutre", 0),
        "evolucio": list(evolucio.values()),
        "articles": articles,
    }


@router.get("/temes-negatius")
def temes_negatius(response: Response, partit: str = Query("AC"), dies: int = Query(30)):
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
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return {"partit": partit, "articles": articles}


@router.post("/ingest")
def trigger_ingest():
    """Manual trigger for RSS ingestion."""
    n = ingest_rss_feeds()
    return {"ok": True, "nous_articles": n}


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
