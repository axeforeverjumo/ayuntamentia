"""Chat con tool-use manual — el LLM decide qué buscar via JSON."""

import os
import json
import re
import time
from typing import Optional
from openai import OpenAI
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from ..db import get_cursor
from ..auth import CurrentUser, get_optional_user, log_usage

router = APIRouter()

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")

ROUTER_PROMPT = """Eres un router AGRESIVO para política municipal catalana. Tu trabajo: lanzar SUFICIENTES búsquedas para que la respuesta sea sólida. Responde SOLO JSON.

REGLA DE ORO: ante la duda, pide MÁS herramientas, no menos. 3-5 tools es normal.
REGLA BILINGÜE: los datos están en catalán. Si la pregunta es en español, incluye SIEMPRE los términos catalanes en las queries (ej: "inmigración" → query "immigració immigració acollida estrangeria inmigración").

Herramientas:
1. buscar_actas(query) — texto libre en actas
2. buscar_votaciones(partido) — AC, ERC, PSC, CUP, JxCat/Junts, PP, VOX, Cs, Comuns
3. info_municipio(nombre) — composición + plenos + concejales AC
4. estadisticas() — stats generales
5. buscar_argumentos(query) — intervenciones/argumentos en debates (USA esta para "qué dice X sobre Y")
6. buscar_por_tema(tema) — urbanismo, hacienda, seguridad, medio_ambiente, cultura, transporte, servicios_sociales, vivienda, educacion, salud, comercio, mociones
7. comparar_partidos(p1, p2) — compara 2 partidos
8. elecciones_municipio(nombre) — resultados desde 1979
9. historial_alcaldes(nombre) — alcaldes desde 1979
10. mociones_govern(query) — mociones municipales al Govern
11. presupuesto_municipio(nombre) — presupuestos por año
12. poblacion_municipio(nombre) — demografía histórica
13. iniciativas_parlament(query) — propuestas/mociones/interpelaciones parlamentàries
14. recepcion_social(tema?, municipio?, dias?) — eco en prensa/Bluesky
15. tendencias_emergentes() — temas en crecimiento 30d
16. ranking_concejales(partido?, municipio?) — alineación con línea del partido

PATRÓN OBLIGATORIO para "qué dice/argumenta/opina PARTIDO sobre TEMA":
→ MÍNIMO 3 tools en paralelo: buscar_argumentos (query con sinónimos CA+ES del tema) + buscar_votaciones (partido) + buscar_actas (partido+tema CA+ES)

Ejemplos:
- "argumentos de Junts contra ordenanzas de civismo" → {"tools": [
    {"name": "buscar_argumentos", "args": {"query": "civisme convivència incivisme espai públic sorolls botellot neteja ordenança civismo convivencia incivismo"}},
    {"name": "buscar_votaciones", "args": {"partido": "JxCat"}},
    {"name": "buscar_actas", "args": {"query": "Junts JxCat civisme convivència ordenança"}}
  ]}
- "qué dice ERC sobre inmigración últimos meses" → {"tools": [
    {"name": "buscar_argumentos", "args": {"query": "immigració immigrants acollida estrangeria refugiats MENA menors asil inmigración inmigrantes acogida extranjería refugiados"}},
    {"name": "buscar_votaciones", "args": {"partido": "ERC"}},
    {"name": "buscar_actas", "args": {"query": "ERC immigració acollida"}}
  ]}
- "aliança catalana" → {"tools": [{"name": "buscar_votaciones", "args": {"partido": "AC"}}, {"name": "buscar_actas", "args": {"query": "Aliança Catalana"}}, {"name": "buscar_argumentos", "args": {"query": "Aliança Catalana"}}]}
- "historia política de Ripoll" → {"tools": [{"name": "historial_alcaldes", "args": {"nombre": "Ripoll"}}, {"name": "elecciones_municipio", "args": {"nombre": "Ripoll"}}, {"name": "info_municipio", "args": {"nombre": "Ripoll"}}]}
- "presupuesto Girona" → {"tools": [{"name": "presupuesto_municipio", "args": {"nombre": "Girona"}}]}
- "que se debate sobre urbanismo" → {"tools": [{"name": "buscar_por_tema", "args": {"tema": "urbanismo"}}, {"name": "buscar_argumentos", "args": {"query": "urbanisme POUM planejament llicències urbanismo planeamiento"}}]}
- "radiografía de Manlleu" → {"tools": [{"name": "info_municipio", "args": {"nombre": "Manlleu"}}, {"name": "historial_alcaldes", "args": {"nombre": "Manlleu"}}, {"name": "elecciones_municipio", "args": {"nombre": "Manlleu"}}, {"name": "presupuesto_municipio", "args": {"nombre": "Manlleu"}}, {"name": "poblacion_municipio", "args": {"nombre": "Manlleu"}}]}
- "hola" → {"tools": [], "direct_answer": "Hola! Sóc AyuntamentIA, el teu assistent de política municipal. Pregunta'm sobre plens, votacions, eleccions o qualsevol cosa de Catalunya!"}
- "gracias" → {"tools": [], "direct_answer": "De res!"}

Responde SOLO JSON."""

ANSWER_PROMPT = """Eres AyuntamentIA, jefe de gabinete analítico para política municipal catalana.
Hablas a un político ocupado: dale CONCLUSIONES accionables, no listados crudos.

ESTRUCTURA OBLIGATORIA (markdown EXACTO, sin desviaciones):

## Veredicto
1-2 frases directas que responden a la pregunta. Firme, sin hedging inútil. Si hay evidencia fuerte, afirma. Si hay ambigüedad, explícala en 1 línea.

## Punts clau
- 3-5 bullets con **cifras** (número de votos, % alineación, municipios) y **patrones** (no listas crudas).
- Menciona partidos como **JxCat**, **ERC**, **AC**, **PSC**, **CUP**, **PP**, **VOX**, **Cs** (negrita) — el frontend los resalta con color.
- Cita como `[Municipi · DD/MM/YYYY]` al final de cada bullet que use un dato concreto.

## I ara què?
1 frase: implicación accionable, oportunidad comunicativa o riesgo político concreto. Punto final.

REGLAS:
- Idioma: el de la pregunta (catalán si es en catalán, español si es en español).
- NO digas "no hay datos suficientes" si tienes ALGO. Extrae el patrón del poco material disponible y sé honesto sobre la muestra ("sobre 4 intervencions indexades…").
- Solo di "sin evidencia" si realmente *todas* las herramientas devolvieron vacío. En ese caso usa el formato:
  ## Veredicto
  No hi ha constància documental de [X] en les actes indexades.
  ## Punts clau
  - Volum total consultat: [Y tools, Z resultats]
  - Possible causa: [tema no debatit recentment / termes de cerca necessiten afinar-se]
  ## I ara què?
  Suggeriment: [reformulació concreta amb 2-3 termes nous].
- Cifras SIEMPRE con contexto (% o comparativa).
- No inventes cifras. Solo las que estén en los datos."""


def get_llm():
    return OpenAI(base_url=PROXY_URL, api_key="subscription")


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


# === Expansión bilingüe CA↔ES ===
# Sinónimos/variantes que se inyectan en las queries para que búsquedas en español
# encuentren términos catalanes y viceversa (los datos están en catalán).
TERMS_EXPANSION: dict[str, list[str]] = {
    # civismo
    "civismo": ["civisme", "convivencia", "convivència", "incivismo", "incivisme",
                "ordenanza civismo", "ordenança civisme", "ordre públic", "orden público",
                "botellón", "botellot", "soroll", "sorolls", "ruido"],
    "civisme": ["civismo", "convivència", "convivencia", "incivisme", "incivismo", "sorolls", "botellot"],
    "convivencia": ["convivència", "civisme", "civismo", "incivisme"],
    "convivència": ["convivencia", "civisme", "civismo", "incivisme"],
    "incivismo": ["incivisme", "civismo", "civisme", "convivència"],
    "incivisme": ["incivismo", "civismo", "civisme", "convivència"],
    # inmigración
    "inmigración": ["immigració", "immigrants", "inmigrantes", "acollida", "acogida",
                    "estrangeria", "extranjería", "refugiats", "refugiados", "asil", "asilo",
                    "MENA", "menors no acompanyats", "menores no acompañados"],
    "immigració": ["inmigración", "immigrants", "inmigrantes", "acollida", "estrangeria", "MENA"],
    "migración": ["migració", "migrants", "migrantes", "immigració", "inmigración"],
    "migrantes": ["migrants", "immigrants", "inmigración", "immigració"],
    "refugiados": ["refugiats", "asil", "asilo", "acollida"],
    "refugiats": ["refugiados", "asil", "acollida"],
    "extranjería": ["estrangeria", "immigració", "estrangers", "extranjeros"],
    "estrangeria": ["extranjería", "immigració", "estrangers"],
    "acogida": ["acollida", "refugiats", "immigració"],
    "acollida": ["acogida", "refugiats", "immigració"],
    "MENA": ["menors no acompanyats", "menores no acompañados", "immigració"],
    # vivienda
    "vivienda": ["habitatge", "habitatges", "lloguer", "alquiler", "okupació", "okupación",
                 "desnonament", "desahucio", "pisos"],
    "habitatge": ["vivienda", "lloguer", "alquiler", "desnonament"],
    "alquiler": ["lloguer", "habitatge", "vivienda"],
    "lloguer": ["alquiler", "habitatge", "vivienda"],
    "desahucio": ["desnonament", "habitatge", "vivienda"],
    "desnonament": ["desahucio", "habitatge"],
    "okupación": ["okupació", "ocupació", "ocupación", "habitatge"],
    "okupació": ["okupación", "ocupació"],
    # seguridad
    "seguridad": ["seguretat", "policia", "policía", "guàrdia urbana", "guardia urbana",
                  "delinqüència", "delincuencia", "vigilància", "vigilancia", "càmeres", "cámaras"],
    "seguretat": ["seguridad", "policia", "guàrdia urbana", "delinqüència"],
    "policía": ["policia", "guàrdia urbana", "guardia urbana", "mossos"],
    "policia": ["policía", "guàrdia urbana", "mossos"],
    "delincuencia": ["delinqüència", "seguretat", "seguridad"],
    "delinqüència": ["delincuencia", "seguretat"],
    # urbanismo
    "urbanismo": ["urbanisme", "POUM", "PGM", "planejament", "planeamiento", "llicències",
                  "licencias", "edificabilitat", "edificabilidad"],
    "urbanisme": ["urbanismo", "POUM", "planejament", "llicències"],
    "planeamiento": ["planejament", "urbanisme", "POUM"],
    "licencias": ["llicències", "urbanisme", "urbanismo"],
    # hacienda
    "hacienda": ["hisenda", "impostos", "impuestos", "IBI", "plusvàlua", "plusvalía",
                 "taxes", "tasas", "ordenança fiscal", "ordenanza fiscal", "pressupost", "presupuesto"],
    "hisenda": ["hacienda", "impostos", "IBI", "pressupost"],
    "impuestos": ["impostos", "IBI", "hisenda"],
    "impostos": ["impuestos", "IBI", "hisenda"],
    "presupuesto": ["pressupost", "hisenda", "impostos"],
    "pressupost": ["presupuesto", "hisenda"],
    # cultura
    "cultura": ["cultura", "festes", "fiestas", "festa major", "patrimoni", "patrimonio",
                "biblioteca", "biblioteques"],
    "fiestas": ["festes", "festa major", "cultura"],
    "festes": ["fiestas", "festa major", "cultura"],
    # educación
    "educación": ["educació", "escola", "escuela", "institut", "instituto", "beca", "beques",
                  "escola bressol", "guardería", "llar d'infants"],
    "educació": ["educación", "escola", "institut", "beques"],
    "escuela": ["escola", "educació", "educación"],
    "escola": ["escuela", "educació"],
    # salud
    "salud": ["salut", "CAP", "centre salut", "centro salud", "hospital", "farmàcia", "farmacia"],
    "salut": ["salud", "CAP", "hospital", "farmàcia"],
    # transporte
    "transporte": ["transport", "autobús", "bus", "carril bici", "aparcament", "aparcamiento",
                   "zona blava", "zona azul", "TRAM", "rodalies"],
    "transport": ["transporte", "autobús", "carril bici", "aparcament"],
    # medio ambiente
    "medio ambiente": ["medi ambient", "residus", "residuos", "reciclatge", "reciclaje",
                       "neteja", "limpieza", "contaminació", "contaminación", "sostenibilitat"],
    "medi ambient": ["medio ambiente", "residus", "reciclatge", "neteja"],
    "residuos": ["residus", "reciclatge", "neteja"],
    "residus": ["residuos", "reciclatge"],
    "reciclaje": ["reciclatge", "residus", "residuos"],
    "reciclatge": ["reciclaje", "residus"],
    "limpieza": ["neteja", "residus", "residuos"],
    "neteja": ["limpieza", "residus"],
    # comercio
    "comercio": ["comerç", "botigues", "tiendas", "mercat", "mercado"],
    "comerç": ["comercio", "botigues", "mercat"],
    # ruido
    "ruido": ["soroll", "sorolls", "contaminació acústica", "contaminación acústica", "botellot", "botellón"],
    "soroll": ["ruido", "sorolls", "contaminació acústica", "botellot"],
    # social
    "servicios sociales": ["serveis socials", "benestar social", "bienestar social"],
    "serveis socials": ["servicios sociales", "benestar social"],
}


def _expand_terms(query: str) -> list[str]:
    """Devuelve una lista ampliada de términos a partir de la query original.
    Detecta frases clave y añade sinónimos CA↔ES. No duplica."""
    q = (query or "").strip().lower()
    if not q:
        return []
    terms: list[str] = []
    seen: set[str] = set()

    def _add(t: str):
        tl = t.strip().lower()
        if tl and tl not in seen and len(tl) >= 3:
            seen.add(tl)
            terms.append(t.strip())

    # Frases enteras primero (multi-palabra)
    for key, syns in TERMS_EXPANSION.items():
        if " " in key and key in q:
            _add(key)
            for s in syns:
                _add(s)

    # Palabras sueltas de la query
    for w in re.findall(r'\w{3,}', q):
        _add(w)
        syns = TERMS_EXPANSION.get(w.lower())
        if syns:
            for s in syns:
                _add(s)

    return terms


def _build_tsquery(query: str) -> str:
    """Construye tsquery Postgres con OR entre todos los términos expandidos.
    Limita a 20 términos para que no explote el planner."""
    terms = _expand_terms(query)
    if not terms:
        return ""
    parts: list[str] = []
    for t in terms[:20]:
        # Frases multi-palabra → AND entre palabras (tsquery con &)
        words = re.findall(r'\w{3,}', t)
        if len(words) > 1:
            parts.append("(" + " & ".join(words) + ")")
        elif words:
            parts.append(words[0])
    return " | ".join(parts)


def _build_like_params(query: str, max_terms: int = 6) -> tuple[str, list[str]]:
    """Para tools que usan ILIKE: devuelve (clausula_OR, params) expandidos."""
    terms = _expand_terms(query)[:max_terms]
    if not terms:
        return "", []
    # Usar placeholder genérico para la columna (se completa en el caller con .format)
    clause_parts: list[str] = []
    params: list[str] = []
    for t in terms:
        clause_parts.append("{col} ILIKE %s")
        params.append(f"%{t}%")
    return " OR ".join(clause_parts), params


# === Matching expandido de partidos ===
def _partido_where(partido: str) -> str:
    """Devuelve cláusula WHERE para v.partido con alias habituales del partido."""
    p = (partido or "").upper().strip()
    # Aliança Catalana (cubre AC, ALIANÇA.CAT, AC-LOCAL, ERC-AC en confluencias)
    if p in ("AC", "ALIANÇA", "ALIANÇA CATALANA", "ALIANÇA.CAT", "ALIANCA", "ALIANCA CATALANA"):
        return "(v.partido = 'AC' OR v.partido = 'ALIANÇA.CAT' OR v.partido LIKE 'AC-%' OR v.partido = 'ERC-AC')"
    # ERC puro (excluye confluencias con AC)
    if p == "ERC":
        return "(v.partido ILIKE '%ERC%' AND v.partido NOT LIKE '%ERC-AC%' AND v.partido NOT LIKE '%AC%')"
    # Junts / JxCat / Convergència
    if p in ("JUNTS", "JXCAT", "JXC", "JUNTS PER CATALUNYA", "JUNTSXCAT", "CONVERGÈNCIA",
             "CONVERGENCIA", "CIU", "CONVERGÈNCIA I UNIÓ", "JUNTS PEL"):
        return ("(v.partido ILIKE '%JUNTS%' OR v.partido ILIKE '%JXCAT%' "
                "OR v.partido ILIKE '%JxC%' OR v.partido ILIKE '%CIU%' "
                "OR v.partido ILIKE '%CONVERGÈNCIA%' OR v.partido ILIKE '%CONVERGENCIA%')")
    # CUP
    if p in ("CUP", "CANDIDATURA D'UNITAT POPULAR"):
        return "(v.partido ILIKE 'CUP%' OR v.partido ILIKE '%CUP-%' OR v.partido ILIKE '%CUP %')"
    # PSC / PSOE
    if p in ("PSC", "PSOE", "PSC-PSOE"):
        return "(v.partido ILIKE 'PSC%' OR v.partido ILIKE '%PSOE%' OR v.partido ILIKE 'PSC-%')"
    # PP
    if p in ("PP", "PARTIT POPULAR", "PARTIDO POPULAR"):
        return "(v.partido = 'PP' OR v.partido ILIKE 'PP-%' OR v.partido ILIKE 'PP %')"
    # VOX
    if p == "VOX":
        return "(v.partido = 'VOX' OR v.partido ILIKE 'VOX-%' OR v.partido ILIKE 'VOX %')"
    # Ciudadanos
    if p in ("CS", "C'S", "CIUDADANOS", "CIUTADANS"):
        return "(v.partido = 'CS' OR v.partido = \"C'S\" OR v.partido ILIKE 'CIUDADAN%' OR v.partido ILIKE 'CIUTADA%')"
    # Comuns / Catalunya en Comú
    if p in ("COMUNS", "COMÚ", "EN COMÚ PODEM", "ECP", "CATCOMU", "ICV",
             "CATALUNYA EN COMÚ", "CATALUNYA EN COMU"):
        return ("(v.partido ILIKE '%COMÚ%' OR v.partido ILIKE '%COMU%' "
                "OR v.partido ILIKE '%ECP%' OR v.partido ILIKE '%ICV%')")
    # Fallback: substring puro
    # Escapar % del input para evitar pattern injection accidental
    safe = (partido or "").replace("%", "").replace("'", "")
    return f"v.partido ILIKE '%%{safe}%%'"


# === Tools ===

def tool_buscar_actas(query: str) -> str:
    tsquery = _build_tsquery(query)
    if not tsquery:
        return "[]"
    with get_cursor() as cur:
        cur.execute("""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object('partido', v.partido, 'sentido', v.sentido))
                       FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            JOIN actas a ON p.acta_id = a.id
            WHERE a.tsv @@ to_tsquery('spanish', %s)
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC LIMIT 15
        """, (tsquery,))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_buscar_votaciones(partido: str) -> str:
    where = _partido_where(partido)

    with get_cursor() as cur:
        cur.execute(f"""
            SELECT v.partido, v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, p.resumen
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} ORDER BY p.fecha DESC LIMIT 30
        """)
        rows = cur.fetchall()
        cur.execute(f"SELECT v.sentido, COUNT(*) as n FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id WHERE {where} GROUP BY v.sentido")
        stats = {s["sentido"]: s["n"] for s in cur.fetchall()}
        cur.execute(f"SELECT DISTINCT m.nombre, COUNT(v.id) as votos FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id JOIN municipios m ON p.municipio_id = m.id WHERE {where} GROUP BY m.nombre ORDER BY votos DESC")
        municipios = [dict(m) for m in cur.fetchall()]
        cur.execute(f"SELECT p.tema, COUNT(*) as n FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id WHERE {where} AND p.tema IS NOT NULL GROUP BY p.tema ORDER BY n DESC LIMIT 8")
        temas = [dict(t) for t in cur.fetchall()]
    return json.dumps({"partido": partido, "total": sum(stats.values()), "resumen": stats,
                        "municipios": municipios, "temas": temas,
                        "detalle": [dict(r) for r in rows]}, default=str, ensure_ascii=False)


def tool_info_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM municipios WHERE nombre ILIKE %s LIMIT 1", (f"%{nombre}%",))
        mun = cur.fetchone()
        if not mun:
            return json.dumps({"error": f"No trobat: {nombre}"})
        mid = mun["id"]
        cur.execute("SELECT partido, COUNT(*) as n FROM cargos_electos WHERE municipio_id=%s AND activo GROUP BY partido ORDER BY n DESC", (mid,))
        comp = cur.fetchall()
        cur.execute("SELECT a.fecha, a.tipo, (SELECT COUNT(*) FROM puntos_pleno p WHERE p.acta_id=a.id) as puntos FROM actas a WHERE a.municipio_id=%s AND a.status='structured' ORDER BY a.fecha DESC LIMIT 5", (mid,))
        plenos = cur.fetchall()
        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE municipio_id=%s AND tema IS NOT NULL GROUP BY tema ORDER BY n DESC LIMIT 8", (mid,))
        temas = cur.fetchall()
        cur.execute("SELECT nombre, cargo, partido FROM cargos_electos WHERE municipio_id=%s AND activo AND UPPER(partido) LIKE '%%ALIAN%%' ORDER BY nombre", (mid,))
        ac_concejales = cur.fetchall()
    return json.dumps({"nombre": mun["nombre"], "comarca": mun["comarca"], "provincia": mun["provincia"],
                        "poblacion": mun["poblacion"], "tiene_ac": mun["tiene_ac"],
                        "composicion": [dict(c) for c in comp], "plenos": [dict(p) for p in plenos],
                        "temas": [dict(t) for t in temas], "concejales_ac": [dict(c) for c in ac_concejales]},
                       default=str, ensure_ascii=False)


def tool_estadisticas() -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM dashboard_stats")
        stats = dict(cur.fetchone()) if cur.rowcount else {}
        cur.execute("SELECT status, COUNT(*) as n FROM actas GROUP BY status ORDER BY n DESC")
        pipeline = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT tema, COUNT(*) as n FROM puntos_pleno WHERE tema IS NOT NULL AND tema != 'procedimiento' GROUP BY tema ORDER BY n DESC LIMIT 10")
        temas = [dict(r) for r in cur.fetchall()]
    return json.dumps({"stats": stats, "pipeline": pipeline, "temas": temas}, default=str, ensure_ascii=False)


def tool_buscar_argumentos(query: str) -> str:
    clause_tpl, params = _build_like_params(query, max_terms=8)
    if not params:
        return "[]"
    like_clauses = clause_tpl.format(col="a.argumento")
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT a.partido, a.posicion, a.argumento, p.titulo, p.tema, p.fecha,
                   m.nombre as municipio
            FROM argumentos a
            JOIN puntos_pleno p ON a.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {like_clauses}
            ORDER BY p.fecha DESC LIMIT 20
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_buscar_por_tema(tema: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object('partido', v.partido, 'sentido', v.sentido))
                       FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            WHERE p.tema = %s
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC LIMIT 20
        """, (tema,))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_comparar_partidos(partido1: str, partido2: str) -> str:
    r1 = tool_buscar_votaciones(partido1)
    r2 = tool_buscar_votaciones(partido2)
    return json.dumps({"partido1": json.loads(r1), "partido2": json.loads(r2)}, ensure_ascii=False)


def tool_elecciones_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT anyo, partido, votos, porcentaje, concejales
            FROM elecciones WHERE municipio ILIKE %s
            ORDER BY anyo DESC, votos DESC
        """, (f"%{nombre}%",))
        rows = cur.fetchall()
    return json.dumps([dict(r) for r in rows], default=str, ensure_ascii=False)


def tool_historial_alcaldes(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT nombre, partido, legislatura, fecha_posesion
            FROM alcaldes WHERE municipio ILIKE %s
            ORDER BY legislatura DESC
        """, (f"%{nombre}%",))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_mociones_govern(query: str) -> str:
    clause_tpl, params = _build_like_params(query, max_terms=6)
    if not params:
        return "[]"
    like_clauses = clause_tpl.format(col="titulo")
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT titulo, municipio, vegueria, fecha, tema
            FROM mociones WHERE {like_clauses}
            ORDER BY fecha DESC LIMIT 25
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_presupuesto_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT anyo, tipo, total FROM presupuestos
            WHERE municipio ILIKE %s ORDER BY anyo DESC, tipo
        """, (f"%{nombre}%",))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_poblacion_municipio(nombre: str) -> str:
    with get_cursor() as cur:
        cur.execute("""
            SELECT anyo, total, hombres, mujeres FROM poblacion
            WHERE municipio ILIKE %s ORDER BY anyo DESC
        """, (f"%{nombre}%",))
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_recepcion_social(tema: str = "", municipio: str = "", dias: int = 14) -> str:
    where, params = ["publicado_at >= NOW() - (%s || ' days')::interval"], [str(dias)]
    if tema:
        where.append("tema = %s")
        params.append(tema)
    if municipio:
        where.append("municipio_id = (SELECT id FROM municipios WHERE LOWER(nombre)=LOWER(%s) LIMIT 1)")
        params.append(municipio)
    sql = f"""SELECT tema, sentiment, COUNT(*) AS n, SUM(engagement) AS engagement_total
              FROM mencion_social WHERE {' AND '.join(where)}
              GROUP BY tema, sentiment ORDER BY n DESC LIMIT 30"""
    with get_cursor() as cur:
        cur.execute(sql, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_tendencias_emergentes() -> str:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM v_tendencias_emergentes LIMIT 15")
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_ranking_concejales(partido: str = "", municipio: str = "", limit: int = 20) -> str:
    where, params = ["votos_total >= 5"], []
    if partido:
        where.append("partido = %s")
        params.append(partido)
    if municipio:
        where.append("LOWER(municipio) ILIKE LOWER(%s)")
        params.append(f"%{municipio}%")
    sql = f"""SELECT nombre, partido, municipio, votos_total, pct_alineacion, divergencias
              FROM v_ranking_concejales WHERE {' AND '.join(where)}
              ORDER BY pct_alineacion ASC LIMIT %s"""
    params.append(limit)
    with get_cursor() as cur:
        cur.execute(sql, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_iniciativas_parlament(query: str) -> str:
    clause_tpl, params = _build_like_params(query, max_terms=6)
    if not params:
        return "[]"
    like_clauses = clause_tpl.format(col="titulo")
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT tipo, numero, titulo, proponentes, grupo, fecha
            FROM iniciativas_parlament WHERE {like_clauses}
            ORDER BY fecha DESC LIMIT 20
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


TOOL_MAP = {
    "buscar_actas": lambda a: tool_buscar_actas(a.get("query", "")),
    "buscar_votaciones": lambda a: tool_buscar_votaciones(a.get("partido", "")),
    "info_municipio": lambda a: tool_info_municipio(a.get("nombre", "")),
    "estadisticas": lambda a: tool_estadisticas(),
    "buscar_argumentos": lambda a: tool_buscar_argumentos(a.get("query", "")),
    "buscar_por_tema": lambda a: tool_buscar_por_tema(a.get("tema", "")),
    "comparar_partidos": lambda a: tool_comparar_partidos(a.get("partido1", ""), a.get("partido2", "")),
    "elecciones_municipio": lambda a: tool_elecciones_municipio(a.get("nombre", "")),
    "historial_alcaldes": lambda a: tool_historial_alcaldes(a.get("nombre", "")),
    "mociones_govern": lambda a: tool_mociones_govern(a.get("query", "")),
    "presupuesto_municipio": lambda a: tool_presupuesto_municipio(a.get("nombre", "")),
    "poblacion_municipio": lambda a: tool_poblacion_municipio(a.get("nombre", "")),
    "iniciativas_parlament": lambda a: tool_iniciativas_parlament(a.get("query", "")),
    "recepcion_social": lambda a: tool_recepcion_social(a.get("tema", ""), a.get("municipio", ""), int(a.get("dias", 14))),
    "tendencias_emergentes": lambda a: tool_tendencias_emergentes(),
    "ranking_concejales": lambda a: tool_ranking_concejales(a.get("partido", ""), a.get("municipio", ""), int(a.get("limit", 20))),
}


def _extract_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r'\{[\s\S]*\}', text)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return None


def _count_useful_rows(tool_results: list[str]) -> int:
    """Suma aproximada de filas útiles en los resultados de tools."""
    total = 0
    for tr in tool_results:
        try:
            payload = tr.split("]:\n", 1)[1] if "]:\n" in tr else tr
            parsed = json.loads(payload)
            if isinstance(parsed, list):
                total += len(parsed)
            elif isinstance(parsed, dict):
                if parsed.get("detalle"):
                    total += len(parsed["detalle"])
                elif parsed.get("total"):
                    total += int(parsed["total"])
                elif not parsed.get("error"):
                    total += 1
        except Exception:
            continue
    return total


def _execute_plan(plan: dict, tool_results: list[str], sources: list[dict], tools_used: list[str]) -> None:
    """Ejecuta un plan de tools y acumula resultados + fuentes. Mutación in-place."""
    if not plan or not plan.get("tools"):
        return
    for tc in plan["tools"]:
        name = tc.get("name", "")
        args = tc.get("args", {}) or {}
        fn = TOOL_MAP.get(name)
        if not fn:
            continue
        try:
            result = fn(args)
            tool_results.append(f"[{name}({json.dumps(args, ensure_ascii=False)})]:\n{result}")
            tools_used.append(name)
            parsed = json.loads(result) if isinstance(result, str) else result
            items = parsed if isinstance(parsed, list) else (parsed.get("detalle") or parsed.get("votaciones") or [])
            for item in items[:5]:
                if isinstance(item, dict) and item.get("municipio"):
                    src = {"municipio": item["municipio"], "fecha": str(item.get("fecha", "")),
                           "tema": item.get("tema"), "titulo": item.get("titulo")}
                    if src not in sources:
                        sources.append(src)
        except Exception:
            continue


REFORMULATE_PROMPT = """La primera ronda de búsqueda devolvió pocos resultados. Reformula con términos DIFERENTES.
Genera hasta 3 nuevas llamadas a tools con queries distintas (sinónimos, variantes CA/ES, términos más específicos).
No repitas queries ya probadas. Si la consulta previa usaba "inmigración", prueba "immigració acollida estrangeria MENA".
Si usaba un partido, prueba argumentos/actas con el nombre del partido + tema.
Responde SOLO JSON {"tools": [...]}."""


FOLLOWUP_PROMPT = """A partir de la pregunta del usuario y la respuesta del asistente, propone 3 preguntas de seguimiento útiles para un político.
Deben ser concretas, cortas (<90 caracteres), en el idioma de la pregunta, y que aporten una nueva perspectiva (no reformulaciones).
Responde SOLO JSON: {"followups": ["...", "...", "..."]}"""


@router.post("/")
def chat(
    req: ChatRequest,
    request: Request,
    user: Optional[CurrentUser] = Depends(get_optional_user),
):
    t0 = time.time()
    client = get_llm()
    sources: list[dict] = []
    tool_results: list[str] = []
    tools_used: list[str] = []

    # Step 1: Route — LLM decides tools
    router_msgs = [{"role": "system", "content": ROUTER_PROMPT}]
    user_input = req.message
    if req.history and len(req.message.split()) < 8:
        prev = " | ".join(h.get("content", "")[:100] for h in req.history[-3:] if h.get("role") == "user")
        user_input = f"Historial: {prev}\nPregunta actual: {req.message}"
    router_msgs.append({"role": "user", "content": user_input})

    try:
        r1 = client.chat.completions.create(model=MODEL, messages=router_msgs, temperature=0, max_tokens=700)
        plan = _extract_json(r1.choices[0].message.content)
    except Exception:
        plan = None

    if plan and plan.get("direct_answer"):
        return {"answer": plan["direct_answer"], "sources": [], "follow_ups": []}

    # Step 2: Execute initial plan
    _execute_plan(plan or {}, tool_results, sources, tools_used)

    # Step 2b: Re-try loop — si hay <3 filas útiles, reformular y relanzar (máx 1 iteración extra)
    useful = _count_useful_rows(tool_results)
    retried = False
    if useful < 3 and plan and plan.get("tools"):
        retried = True
        try:
            retry_msgs = [
                {"role": "system", "content": REFORMULATE_PROMPT},
                {"role": "user", "content": (
                    f"Pregunta original: {req.message}\n"
                    f"Tools ya ejecutadas (pocos resultados): {json.dumps(plan['tools'], ensure_ascii=False)}\n"
                    f"Resultados útiles acumulados: {useful} filas."
                )},
            ]
            r_retry = client.chat.completions.create(
                model=MODEL, messages=retry_msgs, temperature=0.2, max_tokens=500,
            )
            retry_plan = _extract_json(r_retry.choices[0].message.content)
            if retry_plan:
                _execute_plan(retry_plan, tool_results, sources, tools_used)
        except Exception:
            pass

    if not tool_results:
        result = tool_buscar_actas(req.message)
        tool_results.append(f"[buscar_actas fallback]:\n{result}")
        tools_used.append("buscar_actas")

    # Step 3: Answer with data
    data = "\n\n---\n\n".join(tool_results)
    msgs = [{"role": "system", "content": ANSWER_PROMPT}]
    for h in req.history[-6:]:
        msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    msgs.append({"role": "user", "content": f"Dades consultades:\n\n{data[:14000]}\n\nPregunta: {req.message}"})

    try:
        r2 = client.chat.completions.create(model=MODEL, messages=msgs, temperature=0.3, max_tokens=4000)
        answer = r2.choices[0].message.content
    except Exception as e:
        answer = f"Error: {str(e)[:300]}\n\nDades trobades:\n{data[:2000]}"

    # Step 4: Follow-ups (best-effort, no bloquea)
    follow_ups: list[str] = []
    try:
        fu_msgs = [
            {"role": "system", "content": FOLLOWUP_PROMPT},
            {"role": "user", "content": f"Pregunta: {req.message}\n\nResposta: {(answer or '')[:1500]}"},
        ]
        r_fu = client.chat.completions.create(
            model=MODEL, messages=fu_msgs, temperature=0.5, max_tokens=250,
        )
        fu = _extract_json(r_fu.choices[0].message.content)
        if fu and isinstance(fu.get("followups"), list):
            follow_ups = [str(q).strip() for q in fu["followups"] if str(q).strip()][:3]
    except Exception:
        pass

    log_usage(
        user, "chat_query",
        payload={"message": req.message[:500]},
        response_meta={
            "tools_used": tools_used,
            "n_sources": len(sources),
            "useful_rows": useful,
            "retried": retried,
            "latency_ms": int((time.time() - t0) * 1000),
        },
        request=request,
    )
    return {
        "answer": answer or "Sense resposta.",
        "sources": sources[:6],
        "follow_ups": follow_ups,
    }
