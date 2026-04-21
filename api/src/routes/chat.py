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

# === Configuración multi-tenant ===
# El "cliente" es el partido que usa la herramienta. Define el POV de los prompts,
# las preguntas de los modos políticos y los ejemplos del empty state.
CLIENT_PARTIDO = os.getenv("CLIENT_PARTIDO", "AC").strip()  # sigla canónica
CLIENT_NOMBRE = os.getenv("CLIENT_NOMBRE", "Aliança Catalana").strip()
# Rivales por defecto (en orden de prioridad política) — el prompt los usa en
# comparativas y ejemplos. Se puede override via CLIENT_RIVALES (lista CSV).
_default_rivales_por_partido: dict[str, str] = {
    "AC":     "JxCat,ERC,PSC,CUP,PP,VOX,Cs",
    "PP":     "PSC,ERC,JxCat,VOX,CUP,Cs",
    "PSC":    "ERC,JxCat,PP,CUP,VOX,Cs",
    "ERC":    "JxCat,PSC,CUP,PP,VOX,Cs",
    "JXCAT":  "ERC,PSC,CUP,PP,VOX,Cs",
    "CUP":    "ERC,JxCat,PSC,Comuns,PP,VOX",
    "VOX":    "PP,PSC,ERC,JxCat,CUP,Cs",
    "CS":     "PSC,PP,ERC,JxCat,CUP,VOX",
    "COMUNS": "PSC,ERC,CUP,JxCat,PP,VOX",
}
_client_key = CLIENT_PARTIDO.upper()
_rivales_env = os.getenv("CLIENT_RIVALES", "").strip()
CLIENT_RIVALES: list[str] = (
    [r.strip() for r in _rivales_env.split(",") if r.strip()]
    if _rivales_env
    else [r.strip() for r in _default_rivales_por_partido.get(_client_key, "JxCat,ERC,PSC,CUP,PP,VOX,Cs").split(",")]
)

_ROUTER_PROMPT_TMPL = """Eres un router AGRESIVO para política municipal catalana. Tu cliente: $CLIENT_NOMBRE ($CLIENT_PARTIDO). Necesita SABER QUÉ SE DICE (de sus rivales o sobre un tema) en un periodo concreto, y cómo usarlo. Responde SOLO JSON.

REGLA DE ORO: pide MUCHAS herramientas. 4-6 tools es normal. NUNCA menos de 3 si la pregunta es sustantiva.
REGLA BILINGÜE: los datos están en catalán. Traduce SIEMPRE español→catalán en las queries (ej: "inmigración" → "immigració acollida estrangeria MENA inmigración").

REGLA TEMPORAL (MUY IMPORTANTE):
- Detecta explícitamente el periodo de la pregunta y pásalo en los args:
  · "en marzo", "a març" → {mes: 3}
  · "en enero 2026", "gener 2026" → {año: 2026, mes: 1}
  · "últimos 3 meses", "darrers mesos" → {dias_atras: 90}
  · "esta semana" → {dias_atras: 7}
  · "este mes" → {dias_atras: 30}
  · "últimos meses", "recientes", "ahora" → {dias_atras: 60}
  · "todo 2026", "aquest any" → {año: 2026}
  · Rango: "entre enero y marzo 2026" → {desde: "2026-01-01", hasta: "2026-03-31"}
- Por defecto (sin indicación temporal explícita): {dias_atras: 60} para preguntas actuales, {año: 2026} para dossier.

Herramientas:
1. buscar_actas(query, año?, mes?, dias_atras?, desde?, hasta?) — texto libre en actas
2. buscar_votaciones(partido, año?, mes?, dias_atras?, ...) — votos del partido
3. info_municipio(nombre) — composición + plenos
4. estadisticas() — stats
5. buscar_argumentos(query, partido?, año?, mes?, ...) — argumentos en debates
6. buscar_por_tema(tema, año?, mes?, ...) — urbanismo, hacienda, seguridad, medio_ambiente, cultura, transporte, servicios_sociales, vivienda, educacion, salud, comercio, mociones
7. comparar_partidos(p1, p2)
8. elecciones_municipio(nombre)
9. historial_alcaldes(nombre)
10. mociones_govern(query)
11. presupuesto_municipio(nombre)
12. poblacion_municipio(nombre)
13. iniciativas_parlament(query)
14. recepcion_social(tema?, municipio?, dias?)
15. tendencias_emergentes()
16. ranking_concejales(partido?, municipio?)
17. citas_literales(partido, tema?, año?, mes?, dias_atras?) — FRASES TEXTUALES de concejales (rueda de prensa)
18. contradicciones_partido(partido, tema?) — incoherencias entre municipios
19. dossier_adversario(partido, tema?, año?, mes?, ...) — COMBO: votos + argumentos + incoherencias + citas
20. oportunidades_tema(tema) — temas calientes donde AC puede posicionarse
21. monitoring_partido(partido, tema?, año?, mes?, dias_atras?) — ⭐ EL MONITOR:
     · lo que DIJO el partido (intervenciones propias)
     · cómo VOTÓ (desglose por tema)
     · lo que DIJERON DE ÉL otros partidos (menciones rivales)
     · eco en prensa/Bluesky
     · stats agregados del periodo
     → Úsalo SIEMPRE para preguntas tipo "qué se dice de X", "qué se ha hablado de X en el mes Y", "resumen de X este mes", "X en marzo", "noticias de X", "monitoreo X", "actividad X en Y".
22. narrativas_cruzadas(partido_objetivo, partido_emisor?, tema?, año?, mes?, dias_atras?) — ⭐⭐ ATAQUES PERSONA-A-PERSONA:
     · confrontaciones directas: qué concejal de qué partido ATACA a quién de partido_objetivo
     · extrae autor, persona atacada, texto, señales de ataque (mentira/fals/títol/acusa/etc.)
     · agrupa narrativas REPLICADAS: misma tesis/keyword en 2+ municipios = ataque coordinado
     → Úsalo SIEMPRE para preguntas tipo "quién ataca a X", "quién dijo qué de X", "quiénes critican a X",
       "regidors que ataquen AC", "cruces contra X", "narrativas contra X", "qué dicen del concejal Y", "qué dicen los del PP sobre X".

DETECCIÓN DE INTENCIÓN POLÍTICA (añade "intent" al JSON):
- "atacar": "contra", "ataca", "dossier", "polémica", "contradicciones", "incoherencias", "punts dèbils", "cómo joder"
- "defender": "cómo responder", "qué dicen de $CLIENT_PARTIDO/nosotros", "argumentario", "críticas a $CLIENT_NOMBRE"
- "comparar": "X vs Y", "compara", "diferencia entre"
- "monitor": "qué se dice de", "qué se habla de", "resumen", "monitoreo", "actividad reciente", "noticias de", "en marzo", "este mes de X" ⭐
- "oportunidad": "dónde puede crecer $CLIENT_PARTIDO", "temas calientes", "hueco"
- "consulta": default

PATRONES:
- "qué se dice/habla de PARTIDO [en MES/periodo]" → monitoring_partido + narrativas_cruzadas + citas_literales
- "quién ataca/critica a PARTIDO" → narrativas_cruzadas(partido_objetivo=X) + monitoring_partido
- "qué dice PARTIDO_A del concejal/partido PARTIDO_B" → narrativas_cruzadas(partido_objetivo=B, partido_emisor=A)
- "narratives/ataques coordinats contra X" → narrativas_cruzadas + monitoring_partido
- "monitoring/actividad de PARTIDO en MES" → monitoring_partido + buscar_votaciones + citas_literales
- "qué dice PARTIDO sobre TEMA en MES" → monitoring_partido(partido, tema, mes) + citas_literales + buscar_argumentos
- "ataca/dossier contra PARTIDO" → dossier_adversario + monitoring_partido + narrativas_cruzadas + contradicciones_partido
- "P1 vs P2 sobre TEMA" → comparar_partidos + citas_literales(p1,tema) + citas_literales(p2,tema)

Ejemplos:
- "Qué se dice de Junts este mes?" → {"intent":"monitor","tools":[
    {"name":"monitoring_partido","args":{"partido":"JxCat","dias_atras":30}},
    {"name":"narrativas_cruzadas","args":{"partido_objetivo":"JxCat","dias_atras":60}},
    {"name":"citas_literales","args":{"partido":"JxCat","dias_atras":30}}
  ]}
- "Qui ataca AC als darrers mesos?" → {"intent":"monitor","tools":[
    {"name":"narrativas_cruzadas","args":{"partido_objetivo":"AC","dias_atras":120}},
    {"name":"monitoring_partido","args":{"partido":"AC","dias_atras":120}}
  ]}
- "Què diuen del PP sobre AC?" → {"intent":"monitor","tools":[
    {"name":"narrativas_cruzadas","args":{"partido_objetivo":"AC","partido_emisor":"PP","dias_atras":180}},
    {"name":"citas_literales","args":{"partido":"PP","dias_atras":180}}
  ]}
- "Qué ha pasado con ERC en marzo 2026?" → {"intent":"monitor","tools":[
    {"name":"monitoring_partido","args":{"partido":"ERC","año":2026,"mes":3}},
    {"name":"citas_literales","args":{"partido":"ERC","año":2026,"mes":3}},
    {"name":"buscar_votaciones","args":{"partido":"ERC","año":2026,"mes":3}}
  ]}
- "Qué se está hablando de $CLIENT_NOMBRE?" (el nostre partit) → {"intent":"monitor","tools":[
    {"name":"monitoring_partido","args":{"partido":"$CLIENT_PARTIDO","dias_atras":60}},
    {"name":"citas_literales","args":{"partido":"$CLIENT_PARTIDO","dias_atras":60}},
    {"name":"buscar_argumentos","args":{"query":"$CLIENT_NOMBRE $CLIENT_PARTIDO","dias_atras":60}},
    {"name":"recepcion_social","args":{"dias":60}}
  ]}
- "Qué argumentos usa Junts contra las ordenanzas de civismo?" → {"intent":"atacar","tools":[
    {"name":"monitoring_partido","args":{"partido":"JxCat","tema":"civisme convivència incivisme","dias_atras":120}},
    {"name":"citas_literales","args":{"partido":"JxCat","tema":"civisme convivència incivisme","dias_atras":180}},
    {"name":"buscar_argumentos","args":{"query":"civisme convivència incivisme espai públic sorolls botellot neteja ordenança civismo incivismo","partido":"JxCat","dias_atras":180}},
    {"name":"contradicciones_partido","args":{"partido":"JxCat"}},
    {"name":"buscar_votaciones","args":{"partido":"JxCat","año":2026}}
  ]}
- "Qué argumentos ha usado ERC sobre inmigración últimos meses?" → {"intent":"atacar","tools":[
    {"name":"monitoring_partido","args":{"partido":"ERC","tema":"immigració acollida estrangeria MENA","dias_atras":120}},
    {"name":"citas_literales","args":{"partido":"ERC","tema":"immigració acollida estrangeria refugiats MENA","dias_atras":180}},
    {"name":"buscar_argumentos","args":{"query":"immigració immigrants acollida estrangeria refugiats MENA asil inmigración acogida","partido":"ERC","dias_atras":180}},
    {"name":"dossier_adversario","args":{"partido":"ERC","tema":"inmigración","dias_atras":180}}
  ]}
- "dossier contra PSC sobre seguridad" → {"intent":"atacar","tools":[
    {"name":"dossier_adversario","args":{"partido":"PSC","tema":"seguridad","año":2026}},
    {"name":"monitoring_partido","args":{"partido":"PSC","tema":"seguretat policia","año":2026}},
    {"name":"contradicciones_partido","args":{"partido":"PSC","tema":"seguridad"}}
  ]}
- "comparar ERC vs Junts en vivienda" → {"intent":"comparar","tools":[
    {"name":"comparar_partidos","args":{"partido1":"ERC","partido2":"JxCat"}},
    {"name":"citas_literales","args":{"partido":"ERC","tema":"habitatge lloguer okupació","año":2026}},
    {"name":"citas_literales","args":{"partido":"JxCat","tema":"habitatge lloguer okupació","año":2026}}
  ]}
- "dónde puede crecer $CLIENT_PARTIDO" → {"intent":"oportunidad","tools":[
    {"name":"oportunidades_tema","args":{}},
    {"name":"tendencias_emergentes","args":{}},
    {"name":"recepcion_social","args":{"dias":30}}
  ]}
- "hola" → {"tools":[],"direct_answer":"Hola! Sóc AjuntamentIA, l'arma política de $CLIENT_NOMBRE. Pregunta'm: què es diu d'un rival al març? Dossier contra un partit? Comparar posicions? O on pots créixer?"}
- "gracias" → {"tools":[],"direct_answer":"De res!"}

Responde SOLO JSON."""

_ANSWER_PROMPT_TMPL = """Eres AjuntamentIA, jefe de gabinete de $CLIENT_NOMBRE ($CLIENT_PARTIDO). Hablas a un político que necesita MUNICIÓN UTILIZABLE, no análisis académicos. Todo lo que digas lo puede usar HOY en una rueda de prensa, tweet o entrevista.

ESTRUCTURA OBLIGATORIA (markdown EXACTO):

## Veredicto
1-2 frases CONTUNDENTES. Toma partido. Si hay evidencia → afirma con rotundidad política. Si la muestra es escasa, dilo con matiz pero NO te rindas: extrae siempre el patrón. JAMÁS empieces con "no hay datos suficientes" si se han consultado tools.

## Punts clau
- 4-6 bullets con MUNICIÓN: cifras concretas, CITAS LITERALES entrecomilladas (si las tools devuelven argumentos), contradicciones cruzadas.
- Si tienes citas literales de concejales: OBLIGATORIO incluir al menos 1-2 textualmente con formato `> "cita textual"` seguido de `— Nom Concejal (**PARTIDO**, [Municipi · DD/MM/YYYY])`.
- Menciona partidos SIEMPRE con su sigla en negrita: **JxCat**, **ERC**, **AC**, **PSC**, **CUP**, **PP**, **VOX**, **Cs**, **Comuns**.
- Cada bullet factual acaba con `[Municipi · DD/MM/YYYY]`.
- Destaca contradicciones y votos polémicos con **negrita** en la palabra clave.

## I ara què?
Según intent:
- **atacar** → 1-2 frases de ataque listo para usar (titular, tweet o frase de rueda). Formato: "**Frase atacable:** «...»" seguido de hashtags/canal sugerido.
- **defender** → 1 argumentario defensivo: qué decir si nos preguntan por esto.
- **comparar** → diferencia neta: "**$CLIENT_PARTIDO** debe posicionarse como X frente al Y de los rivales."
- **monitor** → resumen ejecutivo tipo briefing: "**Temperatura política:** [baja/media/alta]. Lo que merece atención: X. Lo que hay que seguir: Y."
- **oportunidad** → hueco comunicativo concreto a ocupar.
- **consulta** → implicación política accionable.

REGLAS DE FONDO:
- Idioma: el de la pregunta (catalán o español). Si la pregunta es en castellano, responde en castellano.
- NUNCA digas "la búsqueda no devuelve" si hay ALGO en los datos: usa lo poco que haya.
- Si *todas* las tools devolvieron cero, responde:
  ## Veredicto
  No hi ha rastre documental [o "No hay rastro documental" si es español] de [tema] per part de [partit] en les actes indexades de 2026.
  ## Punts clau
  - Volum consultat: [N tools, [M resultats]]
  - Patrón: silenci polític — útil si es pot usar («ni una paraula sobre X en tot l'any»).
  - Contrast: mentre altres partits sí en parlen ([afegeix cita d'altre partit si la tens]).
  ## I ara què?
  **Frase atacable:** «[partit] porta [temps] sense pronunciar-se sobre [tema]».
- Cifras SIEMPRE con contexto (% o comparativa con otro partido).
- Si hay municipios grandes (>20k hab), priorízalos en las citas: pesan más políticamente.
- No inventes citas. Solo las que aparezcan en las tools."""


# === Renderizado de prompts con config del cliente ===
from string import Template as _Tmpl

def _render_prompt(tmpl: str) -> str:
    return _Tmpl(tmpl).safe_substitute(
        CLIENT_PARTIDO=CLIENT_PARTIDO,
        CLIENT_NOMBRE=CLIENT_NOMBRE,
        CLIENT_RIVALES=", ".join(CLIENT_RIVALES),
    )

ROUTER_PROMPT = _render_prompt(_ROUTER_PROMPT_TMPL)
ANSWER_PROMPT = _render_prompt(_ANSWER_PROMPT_TMPL)


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


# === Filtros temporales flexibles ===
# Permite combinar: año (2026), mes (1-12), dias_atras (N), desde/hasta (YYYY-MM-DD).
# Si no se indica nada, no filtra. Si se indica mes sin año, asume año actual (2026).
MONTH_NAMES = {
    "gener": 1, "enero": 1, "january": 1, "jan": 1,
    "febrer": 2, "febrero": 2, "february": 2, "feb": 2,
    "març": 3, "marzo": 3, "march": 3, "mar": 3,
    "abril": 4, "april": 4, "apr": 4,
    "maig": 5, "mayo": 5, "may": 5,
    "juny": 6, "junio": 6, "june": 6, "jun": 6,
    "juliol": 7, "julio": 7, "july": 7, "jul": 7,
    "agost": 8, "agosto": 8, "august": 8, "aug": 8,
    "setembre": 9, "septiembre": 9, "september": 9, "sep": 9, "sept": 9,
    "octubre": 10, "october": 10, "oct": 10,
    "novembre": 11, "noviembre": 11, "november": 11, "nov": 11,
    "desembre": 12, "diciembre": 12, "december": 12, "dec": 12,
}


def _coerce_month(v) -> int | None:
    if v is None:
        return None
    if isinstance(v, int):
        return v if 1 <= v <= 12 else None
    s = str(v).strip().lower()
    if s.isdigit():
        n = int(s)
        return n if 1 <= n <= 12 else None
    return MONTH_NAMES.get(s)


def _coerce_int(v) -> int | None:
    try:
        return int(v) if v not in (None, "", False) else None
    except (TypeError, ValueError):
        return None


def _time_filter(col: str = "p.fecha", *, año=None, mes=None,
                 dias_atras=None, desde=None, hasta=None) -> tuple[str, list]:
    """Devuelve (fragmento_SQL, params) para filtrar por tiempo sobre la columna `col`.

    Reglas:
      - `desde` y `hasta` (YYYY-MM-DD) tienen prioridad si se dan
      - `dias_atras` → últimos N días hasta hoy
      - `año` y `mes` pueden combinarse (ej. año=2026 mes=3 → marzo 2026)
      - `mes` sin `año` asume 2026 (año en curso del dataset)
    """
    año_i = _coerce_int(año)
    mes_i = _coerce_month(mes)
    dias_i = _coerce_int(dias_atras)
    clauses: list[str] = []
    params: list = []

    if desde:
        clauses.append(f"{col} >= %s")
        params.append(str(desde)[:10])
    if hasta:
        clauses.append(f"{col} <= %s")
        params.append(str(hasta)[:10])

    if not desde and not hasta:
        if dias_i and dias_i > 0:
            clauses.append(f"{col} >= CURRENT_DATE - (%s || ' days')::interval")
            params.append(str(dias_i))
        elif año_i or mes_i:
            if año_i:
                clauses.append(f"EXTRACT(YEAR FROM {col}) = %s")
                params.append(año_i)
            else:
                # mes sin año → asume 2026
                clauses.append(f"EXTRACT(YEAR FROM {col}) = %s")
                params.append(2026)
            if mes_i:
                clauses.append(f"EXTRACT(MONTH FROM {col}) = %s")
                params.append(mes_i)

    if not clauses:
        return "", []
    return " AND ".join(clauses), params


def _time_args(a: dict) -> dict:
    return {
        "año": a.get("año") or a.get("year") or a.get("anyo"),
        "mes": a.get("mes") or a.get("month"),
        "dias_atras": a.get("dias_atras") or a.get("dias") or a.get("days"),
        "desde": a.get("desde") or a.get("from"),
        "hasta": a.get("hasta") or a.get("to"),
    }


# === Matching expandido de partidos ===
# IMPORTANTE: las cláusulas retornadas se insertan en strings SQL que se ejecutan
# con cur.execute(sql, params) donde params puede contener placeholders %s.
# Por eso todos los `%` literales dentro de patrones LIKE se escriben como `%%`,
# que psycopg2 convierte a `%` después de sustituir los placeholders.
def _partido_where(partido: str) -> str:
    """Devuelve cláusula WHERE para v.partido con alias habituales del partido.
    Los % literales están escapados como %% para compatibilidad con cur.execute(sql, params)."""
    p = (partido or "").upper().strip()
    if p in ("AC", "ALIANÇA", "ALIANÇA CATALANA", "ALIANÇA.CAT", "ALIANCA", "ALIANCA CATALANA"):
        return "(v.partido = 'AC' OR v.partido = 'ALIANÇA.CAT' OR v.partido LIKE 'AC-%%' OR v.partido = 'ERC-AC')"
    if p == "ERC":
        return "(v.partido ILIKE '%%ERC%%' AND v.partido NOT LIKE '%%ERC-AC%%' AND v.partido NOT LIKE '%%AC%%')"
    if p in ("JUNTS", "JXCAT", "JXC", "JUNTS PER CATALUNYA", "JUNTSXCAT", "CONVERGÈNCIA",
             "CONVERGENCIA", "CIU", "CONVERGÈNCIA I UNIÓ", "JUNTS PEL"):
        return ("(v.partido ILIKE '%%JUNTS%%' OR v.partido ILIKE '%%JXCAT%%' "
                "OR v.partido ILIKE '%%JxC%%' OR v.partido ILIKE '%%CIU%%' "
                "OR v.partido ILIKE '%%CONVERGÈNCIA%%' OR v.partido ILIKE '%%CONVERGENCIA%%')")
    if p in ("CUP", "CANDIDATURA D'UNITAT POPULAR"):
        return "(v.partido ILIKE 'CUP%%' OR v.partido ILIKE '%%CUP-%%' OR v.partido ILIKE '%%CUP %%')"
    if p in ("PSC", "PSOE", "PSC-PSOE"):
        return "(v.partido ILIKE 'PSC%%' OR v.partido ILIKE '%%PSOE%%' OR v.partido ILIKE 'PSC-%%')"
    if p in ("PP", "PARTIT POPULAR", "PARTIDO POPULAR"):
        return "(v.partido = 'PP' OR v.partido ILIKE 'PP-%%' OR v.partido ILIKE 'PP %%')"
    if p == "VOX":
        return "(v.partido = 'VOX' OR v.partido ILIKE 'VOX-%%' OR v.partido ILIKE 'VOX %%')"
    if p in ("CS", "C'S", "CIUDADANOS", "CIUTADANS"):
        return "(v.partido = 'CS' OR v.partido = \"C'S\" OR v.partido ILIKE 'CIUDADAN%%' OR v.partido ILIKE 'CIUTADA%%')"
    if p in ("COMUNS", "COMÚ", "EN COMÚ PODEM", "ECP", "CATCOMU", "ICV",
             "CATALUNYA EN COMÚ", "CATALUNYA EN COMU"):
        return ("(v.partido ILIKE '%%COMÚ%%' OR v.partido ILIKE '%%COMU%%' "
                "OR v.partido ILIKE '%%ECP%%' OR v.partido ILIKE '%%ICV%%')")
    safe = (partido or "").replace("%", "").replace("'", "")
    return f"v.partido ILIKE '%%{safe}%%'"


# === Tools ===

def tool_buscar_actas(query: str, **time_kw) -> str:
    tsquery = _build_tsquery(query)
    if not tsquery:
        return "[]"
    tf, tp = _time_filter("p.fecha", **time_kw)
    where_extra = f"AND {tf}" if tf else ""
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object('partido', v.partido, 'sentido', v.sentido))
                       FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            JOIN actas a ON p.acta_id = a.id
            WHERE a.tsv @@ to_tsquery('spanish', %s)
              {where_extra}
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC LIMIT 20
        """, [tsquery] + tp)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_buscar_votaciones(partido: str, **time_kw) -> str:
    where = _partido_where(partido)
    tf, tp = _time_filter("p.fecha", **time_kw)
    time_extra = f"AND {tf}" if tf else ""

    with get_cursor() as cur:
        cur.execute(f"""
            SELECT v.partido, v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, p.resumen
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where} {time_extra}
            ORDER BY p.fecha DESC LIMIT 40
        """, tp)
        rows = cur.fetchall()
        cur.execute(f"""SELECT v.sentido, COUNT(*) as n
                        FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
                        WHERE {where} {time_extra} GROUP BY v.sentido""", tp)
        stats = {s["sentido"]: s["n"] for s in cur.fetchall()}
        cur.execute(f"""SELECT DISTINCT m.nombre, COUNT(v.id) as votos
                        FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
                        JOIN municipios m ON p.municipio_id = m.id
                        WHERE {where} {time_extra}
                        GROUP BY m.nombre ORDER BY votos DESC LIMIT 15""", tp)
        municipios = [dict(m) for m in cur.fetchall()]
        cur.execute(f"""SELECT p.tema, COUNT(*) as n
                        FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
                        WHERE {where} {time_extra} AND p.tema IS NOT NULL
                        GROUP BY p.tema ORDER BY n DESC LIMIT 10""", tp)
        temas = [dict(t) for t in cur.fetchall()]
    return json.dumps({
        "partido": partido, "filtros_tiempo": {k: v for k, v in time_kw.items() if v},
        "total": sum(stats.values()), "resumen": stats,
        "municipios": municipios, "temas": temas,
        "detalle": [dict(r) for r in rows],
    }, default=str, ensure_ascii=False)


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


def tool_buscar_argumentos(query: str, partido: str = "", **time_kw) -> str:
    clause_tpl, params = _build_like_params(query, max_terms=8)
    if not params:
        return "[]"
    like_clauses = clause_tpl.format(col="a.argumento")
    extra_where = ""
    if partido:
        part_where = _partido_where(partido).replace("v.partido", "a.partido")
        extra_where += f" AND {part_where}"
    tf, tp = _time_filter("p.fecha", **time_kw)
    if tf:
        extra_where += f" AND {tf}"
        params.extend(tp)
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT a.partido, a.posicion, a.argumento, p.titulo, p.tema, p.fecha,
                   m.nombre as municipio
            FROM argumentos a
            JOIN puntos_pleno p ON a.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE ({like_clauses}) {extra_where}
            ORDER BY p.fecha DESC LIMIT 25
        """, params)
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_buscar_por_tema(tema: str, **time_kw) -> str:
    tf, tp = _time_filter("p.fecha", **time_kw)
    time_extra = f"AND {tf}" if tf else ""
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                   m.nombre as municipio,
                   json_agg(DISTINCT jsonb_build_object('partido', v.partido, 'sentido', v.sentido))
                       FILTER (WHERE v.id IS NOT NULL) as votaciones
            FROM puntos_pleno p
            JOIN municipios m ON p.municipio_id = m.id
            LEFT JOIN votaciones v ON v.punto_id = p.id
            WHERE p.tema = %s {time_extra}
            GROUP BY p.id, p.titulo, p.tema, p.resumen, p.resultado, p.fecha, m.nombre
            ORDER BY p.fecha DESC LIMIT 25
        """, [tema] + tp)
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


def tool_citas_literales(partido: str, tema: str = "", limit: int = 15, **time_kw) -> str:
    """Extrae frases textuales de concejales de un partido — MUNICIÓN POLÍTICA directa."""
    part_where = _partido_where(partido).replace("v.partido", "a.partido")
    where_parts = [part_where, "LENGTH(a.argumento) >= 30"]
    params: list = []
    if tema:
        clause_tpl, tema_params = _build_like_params(tema, max_terms=6)
        if tema_params:
            where_parts.append("(" + clause_tpl.format(col="a.argumento") + ")")
            params.extend(tema_params)
    tf, tp = _time_filter("p.fecha", **time_kw)
    if tf:
        where_parts.append(tf)
        params.extend(tp)
    where = " AND ".join(where_parts)
    with get_cursor() as cur:
        cur.execute(f"""
            SELECT a.partido, a.posicion, a.argumento, p.titulo, p.tema, p.fecha,
                   p.resultado, m.nombre as municipio, m.poblacion
            FROM argumentos a
            JOIN puntos_pleno p ON a.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {where}
            ORDER BY
                CASE WHEN m.poblacion > 20000 THEN 0 ELSE 1 END,
                p.fecha DESC
            LIMIT %s
        """, params + [limit])
        return json.dumps([dict(r) for r in cur.fetchall()], default=str, ensure_ascii=False)


def tool_contradicciones_partido(partido: str, tema: str = "") -> str:
    """Detecta incoherencias: mismo partido vota SÍ en un municipio y NO en otro sobre el mismo tema."""
    part_where = _partido_where(partido)
    tema_filter = ""
    params: list = []
    if tema:
        tema_filter = "AND p.tema = %s"
        params.append(tema)

    with get_cursor() as cur:
        # Incoherencias por tema: mismo partido vota distinto en distintos municipios
        cur.execute(f"""
            SELECT p.tema,
                   COUNT(DISTINCT CASE WHEN v.sentido = 'a_favor' THEN m.id END) AS muni_favor,
                   COUNT(DISTINCT CASE WHEN v.sentido = 'en_contra' THEN m.id END) AS muni_contra,
                   COUNT(DISTINCT CASE WHEN v.sentido = 'abstencion' THEN m.id END) AS muni_abst,
                   array_agg(DISTINCT m.nombre) FILTER (WHERE v.sentido = 'a_favor') AS municipios_favor,
                   array_agg(DISTINCT m.nombre) FILTER (WHERE v.sentido = 'en_contra') AS municipios_contra
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {part_where}
              AND p.tema IS NOT NULL AND p.tema != 'procedimiento'
              AND p.fecha >= CURRENT_DATE - INTERVAL '365 days'
              {tema_filter}
            GROUP BY p.tema
            HAVING COUNT(DISTINCT CASE WHEN v.sentido = 'a_favor' THEN m.id END) >= 1
               AND COUNT(DISTINCT CASE WHEN v.sentido = 'en_contra' THEN m.id END) >= 1
            ORDER BY (COUNT(DISTINCT CASE WHEN v.sentido = 'a_favor' THEN m.id END)
                    + COUNT(DISTINCT CASE WHEN v.sentido = 'en_contra' THEN m.id END)) DESC
            LIMIT 15
        """, params)
        incoherencias = [dict(r) for r in cur.fetchall()]

        # Votos polémicos: puntos donde el partido votó a favor/en contra contra la mayoría
        cur.execute(f"""
            SELECT v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, v.partido
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {part_where}
              AND p.fecha >= CURRENT_DATE - INTERVAL '180 days'
              AND (
                (v.sentido = 'en_contra' AND p.resultado = 'aprobada')
                OR (v.sentido = 'a_favor' AND p.resultado = 'rechazada')
              )
              {tema_filter}
            ORDER BY p.fecha DESC LIMIT 15
        """, params)
        votos_contracorriente = [dict(r) for r in cur.fetchall()]

    return json.dumps({
        "partido": partido,
        "tema_filtrado": tema or None,
        "incoherencias_por_tema": incoherencias,
        "votos_contracorriente": votos_contracorriente,
        "total_incoherencias": len(incoherencias),
    }, default=str, ensure_ascii=False)


def tool_dossier_adversario(partido: str, tema: str = "", **time_kw) -> str:
    """Combo completo: votaciones + argumentos + citas + contradicciones + votos polémicos."""
    # Si no hay filtro temporal, por defecto último año completo
    has_time = any(v for v in time_kw.values())
    if not has_time:
        time_kw = {"año": 2026}
    votaciones = json.loads(tool_buscar_votaciones(partido, **time_kw))
    citas_tema = json.loads(tool_citas_literales(partido, tema, limit=10, **time_kw)) if tema else []
    citas_generales = json.loads(tool_citas_literales(partido, "", limit=8, **time_kw))
    contradicciones = json.loads(tool_contradicciones_partido(partido, tema))

    return json.dumps({
        "partido": partido,
        "tema": tema or None,
        "filtros_tiempo": {k: v for k, v in time_kw.items() if v},
        "resumen_votacion": votaciones.get("resumen", {}),
        "total_votos": votaciones.get("total", 0),
        "municipios_top": votaciones.get("municipios", [])[:8],
        "temas_debatidos": votaciones.get("temas", [])[:6],
        "citas_sobre_tema": citas_tema,
        "citas_generales": citas_generales,
        "incoherencias": contradicciones.get("incoherencias_por_tema", []),
        "votos_contracorriente": contradicciones.get("votos_contracorriente", []),
        "votaciones_detalle": votaciones.get("detalle", [])[:12],
    }, default=str, ensure_ascii=False)


_PARTY_ALIASES: dict[str, list[str]] = {
    "AC": ["Aliança Catalana", "aliança catalana", "ALIANÇA", "Aliança.cat", "Alianza Catalana",
           "extrema dreta", "extrema derecha", "ultradreta", "ultraderecha"],
    "ERC": [" ERC ", "ERC-", "ERC,", "Esquerra Republicana", "esquerra republicana", "ERC/AM"],
    "JXCAT": ["Junts ", " JUNTS", "JxCat", "JXCat", "Junts per ", "Convergència", "convergents", "ex-convergents", "juntaires"],
    "CUP": [" CUP ", "CUP-", "CUP,", "Candidatura d'Unitat Popular", "candidatura d'unitat popular", "antisistema"],
    "PSC": [" PSC", "PSC-", "PSC,", "PSOE", "socialistes", "socialistas", "socialista"],
    "PP": [" PP ", "PP-", "PP,", "Partit Popular", "Partido Popular", "populars"],
    "VOX": [" VOX", "Vox ", "Vox,"],
    "CS": [" CS ", "C's", "Ciutadans", "Ciudadanos"],
    "COMUNS": ["Comuns", "En Comú", "ECP", "Catalunya en Comú", "ICV"],
}


def _party_key_for_mentions(partido: str) -> str:
    """Devuelve la clave canónica de _PARTY_ALIASES para un partido."""
    p = (partido or "").upper().strip()
    if p in ("AC", "ALIANÇA", "ALIANÇA CATALANA", "ALIANCA", "ALIANCA CATALANA", "ALIANÇA.CAT"):
        return "AC"
    if p in ("JUNTS", "JXCAT", "JXC", "JUNTS PER CATALUNYA", "JUNTSXCAT", "CONVERGÈNCIA", "CONVERGENCIA", "CIU"):
        return "JXCAT"
    if p == "ERC":
        return "ERC"
    if p in ("PSC", "PSOE", "PSC-PSOE"):
        return "PSC"
    if p == "CUP":
        return "CUP"
    if p in ("PP", "PARTIT POPULAR", "PARTIDO POPULAR"):
        return "PP"
    if p == "VOX":
        return "VOX"
    if p in ("CS", "C'S", "CIUDADANOS", "CIUTADANS"):
        return "CS"
    if p in ("COMUNS", "COMÚ", "EN COMÚ PODEM", "ECP", "CATCOMU", "ICV"):
        return "COMUNS"
    return ""


def _get_concejales_del_partido(cur, partido: str, limit: int = 30) -> list[dict]:
    """Carga concejales activos del partido desde cargos_electos."""
    part_where = _partido_where(partido).replace("v.partido", "partido")
    cur.execute(f"""
        SELECT ce.nombre, ce.cargo, ce.partido, m.nombre as municipio
        FROM cargos_electos ce
        LEFT JOIN municipios m ON ce.municipio_id = m.id
        WHERE ce.activo AND {part_where.replace('partido', 'ce.partido')}
        LIMIT %s
    """, (limit,))
    return [dict(r) for r in cur.fetchall()]


# Apellidos catalanes/españoles demasiado comunes → excluir para evitar falsos positivos.
_COMMON_SURNAMES = {
    "SERRA", "MAS", "PUIG", "FONT", "ROIG", "SOLER", "PI", "RIBAS", "RIBA", "VILA",
    "MARTÍ", "MARTI", "MARTÍN", "MARTIN", "GARCÍA", "GARCIA", "PÉREZ", "PEREZ",
    "LÓPEZ", "LOPEZ", "SÁNCHEZ", "SANCHEZ", "RUIZ", "GONZÁLEZ", "GONZALEZ",
    "FERNÁNDEZ", "FERNANDEZ", "RODRÍGUEZ", "RODRIGUEZ", "ALONSO", "DÍAZ", "DIAZ",
    "CASAS", "CASTELLS", "TORRES", "SANTOS", "JIMÉNEZ", "JIMENEZ", "GÓMEZ", "GOMEZ",
    "HERNÁNDEZ", "HERNANDEZ", "MORALES", "ROMERO", "NAVARRO", "DOMÍNGUEZ", "DOMINGUEZ",
    "GIL", "VARGAS", "CANO", "MOLINA", "REYES", "IGLESIAS", "MORENO",
    "SOLÉ", "SOLE", "ROCA", "COSTA", "CAMPS", "PRAT", "BOSCH", "CARBONELL", "BELTRÁN", "BELTRAN",
    "EXPÓSITO", "EXPOSITO",  # común y presente en alguna lista oficial
}


def _extract_surnames(nombre: str) -> list[str]:
    """Extrae los 2 últimos apellidos válidos de un nombre completo.
    De 'SÍLVIA ORRIOLS SERRA' → ['ORRIOLS'] (SERRA descartado por común)."""
    SKIP = {"DE", "DEL", "LA", "LAS", "LOS", "EL", "I", "Y", "VAN", "VON", "SAN"}
    parts = re.split(r'\s+', (nombre or "").strip())
    if len(parts) < 2:
        return []
    # Tomar las 2 últimas palabras (estructura típica: NOMBRE [SEGUNDO_NOMBRE] APELLIDO1 APELLIDO2)
    candidates = parts[-2:]
    result = []
    for p in candidates:
        clean = p.strip(",.;")
        up = clean.upper()
        if (len(clean) >= 5
            and up not in SKIP
            and up not in _COMMON_SURNAMES):
            result.append(clean)
    return result


def _build_name_patterns(concejales: list[dict]) -> list[str]:
    """Para cada concejal genera patrones ESPECÍFICOS que reducen falsos positivos:
      - nombre_pila + apellido1 (ej: 'Sílvia Orriols')
      - apellido1 + apellido2 (ej: 'Orriols Barranqueras')
    Evita buscar apellidos sueltos que sean comunes."""
    SKIP = {"DE", "DEL", "LA", "LAS", "LOS", "EL", "I", "Y", "VAN", "VON", "SAN"}
    patterns: list[str] = []
    for c in concejales:
        nombre = c.get("nombre", "").strip()
        if not nombre:
            continue
        parts = re.split(r'\s+', nombre)
        if len(parts) < 2:
            continue
        # primer token = nombre de pila (tal cual, con tilde); puede ser compuesto con 2º
        # apellidos = 2 últimas palabras
        first = parts[0].title()
        apellidos = [p.title() for p in parts[-2:]
                     if len(p) >= 4 and p.upper() not in SKIP]
        if not apellidos:
            continue
        # Pattern 1: primer_nombre + primer_apellido (muy específico)
        patterns.append(f"{first} {apellidos[0]}")
        # Pattern 2: los 2 apellidos juntos (también específico)
        if len(apellidos) == 2:
            patterns.append(f"{apellidos[0]} {apellidos[1]}")
        # Si apellido no es común, también lo añadimos solo (con bordes de palabra)
        if apellidos[0].upper() not in _COMMON_SURNAMES and len(apellidos[0]) >= 6:
            patterns.append(f" {apellidos[0]} ")
    # dedup preservando orden
    seen: set[str] = set()
    out = []
    for p in patterns:
        k = p.upper()
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out


def tool_monitoring_partido(partido: str, tema: str = "", **time_kw) -> str:
    """Monitoreo completo: qué dijo el partido + qué dijeron DE él (incluye menciones
    por nombre del partido, alias, apellidos de sus concejales) + votos + prensa."""
    part_where_v = _partido_where(partido)
    part_where_a = part_where_v.replace("v.partido", "a.partido")
    tf, tp = _time_filter("p.fecha", **time_kw)
    has_time = any(v for v in time_kw.values())
    if not has_time:
        tf = "p.fecha >= CURRENT_DATE - INTERVAL '60 days'"
        tp = []
    time_extra = f"AND {tf}" if tf else ""

    tema_filter_a = ""
    tema_params: list = []
    if tema:
        clause_tpl, tema_params = _build_like_params(tema, max_terms=6)
        if tema_params:
            tema_filter_a = "AND (" + clause_tpl.format(col="a.argumento") + ")"

    with get_cursor() as cur:
        # 0. Cargar concejales del partido y generar patrones específicos de búsqueda
        concejales = _get_concejales_del_partido(cur, partido, limit=50)
        name_patterns = _build_name_patterns(concejales)

        # 1. Intervenciones propias
        cur.execute(f"""
            SELECT a.partido, a.posicion, a.argumento, p.titulo, p.tema, p.fecha,
                   m.nombre as municipio, m.poblacion
            FROM argumentos a
            JOIN puntos_pleno p ON a.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {part_where_a}
              AND LENGTH(a.argumento) >= 30
              {time_extra}
              {tema_filter_a}
            ORDER BY
                CASE WHEN m.poblacion > 20000 THEN 0 ELSE 1 END,
                p.fecha DESC
            LIMIT 15
        """, tp + tema_params)
        intervenciones_propias = [dict(r) for r in cur.fetchall()]

        # 2. Votaciones en el periodo con desglose por tema
        cur.execute(f"""
            SELECT v.sentido, COUNT(*) as n
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            WHERE {part_where_v} {time_extra}
            GROUP BY v.sentido
        """, tp)
        resumen_votos = {r["sentido"]: r["n"] for r in cur.fetchall()}

        cur.execute(f"""
            SELECT p.tema,
                   COUNT(*) FILTER (WHERE v.sentido='a_favor') AS favor,
                   COUNT(*) FILTER (WHERE v.sentido='en_contra') AS contra,
                   COUNT(*) FILTER (WHERE v.sentido='abstencion') AS abst,
                   COUNT(*) AS total
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            WHERE {part_where_v} {time_extra} AND p.tema IS NOT NULL AND p.tema != 'procedimiento'
            GROUP BY p.tema ORDER BY total DESC LIMIT 10
        """, tp)
        votos_por_tema = [dict(r) for r in cur.fetchall()]

        cur.execute(f"""
            SELECT v.partido, v.sentido, p.titulo, p.tema, p.resultado, p.fecha,
                   m.nombre as municipio, p.resumen
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE {part_where_v} {time_extra}
            ORDER BY
                CASE WHEN m.poblacion > 20000 THEN 0 ELSE 1 END,
                p.fecha DESC
            LIMIT 20
        """, tp)
        votaciones_detalle = [dict(r) for r in cur.fetchall()]

        # 3. Menciones — argumentos/resúmenes externos que nombran al partido
        key = _party_key_for_mentions(partido)
        labels_search: list[str] = list(_PARTY_ALIASES.get(key, [partido or ""]))
        # Añadir patrones específicos de concejales (nombre+apellido o apellidos juntos)
        labels_search.extend(name_patterns[:25])
        labels_search = [l for l in labels_search if l and len(l.strip()) >= 3]

        # a) Argumentos externos que mencionan
        menciones_rivales: list = []
        if labels_search:
            like_clauses_arr = []
            like_params_arr: list = []
            for lab in labels_search[:25]:
                like_clauses_arr.append("a.argumento ILIKE %s")
                like_params_arr.append(f"%{lab}%")
            like_clause = " OR ".join(like_clauses_arr)
            cur.execute(f"""
                SELECT a.partido, a.posicion, a.argumento, p.titulo, p.tema, p.fecha,
                       m.nombre as municipio
                FROM argumentos a
                JOIN puntos_pleno p ON a.punto_id = p.id
                JOIN municipios m ON p.municipio_id = m.id
                WHERE ({like_clause})
                  AND NOT ({part_where_a})
                  AND a.partido IS NOT NULL
                  AND LENGTH(a.argumento) >= 30
                  {time_extra}
                ORDER BY p.fecha DESC LIMIT 15
            """, like_params_arr + tp)
            menciones_rivales = [dict(r) for r in cur.fetchall()]

        # b) Resúmenes y títulos de puntos que mencionan — contexto ambiental
        menciones_puntos: list = []
        if labels_search:
            like_clauses_p = []
            like_params_p: list = []
            for lab in labels_search[:20]:
                like_clauses_p.append("(p.resumen ILIKE %s OR p.titulo ILIKE %s)")
                like_params_p.extend([f"%{lab}%", f"%{lab}%"])
            clause_p = " OR ".join(like_clauses_p)
            cur.execute(f"""
                SELECT p.titulo, p.tema, p.resumen, p.resultado, p.fecha,
                       m.nombre as municipio
                FROM puntos_pleno p
                JOIN municipios m ON p.municipio_id = m.id
                WHERE ({clause_p})
                  {time_extra}
                ORDER BY p.fecha DESC LIMIT 10
            """, like_params_p + tp)
            menciones_puntos = [dict(r) for r in cur.fetchall()]

        # 4. Eco social
        eco_social: list = []
        try:
            sql_parts = []
            params_social: list = []
            # Reutilizar filtro temporal: si hay dias_atras/mes/año conviértelo en un rango razonable
            dias = _coerce_int(time_kw.get("dias_atras") or time_kw.get("dias"))
            if dias:
                sql_parts.append("publicado_at >= NOW() - (%s || ' days')::interval")
                params_social.append(str(dias))
            else:
                sql_parts.append("publicado_at >= NOW() - INTERVAL '30 days'")

            cur.execute(f"""
                SELECT tema, sentiment, COUNT(*) AS n
                FROM mencion_social
                WHERE {' AND '.join(sql_parts)}
                GROUP BY tema, sentiment
                ORDER BY n DESC LIMIT 15
            """, params_social)
            eco_social = [dict(r) for r in cur.fetchall()]
        except Exception:
            eco_social = []

        # 5. Stats agregados
        cur.execute(f"""
            SELECT COUNT(DISTINCT p.municipio_id) as municipios_activos,
                   COUNT(DISTINCT p.id) as puntos_totales,
                   COUNT(*) as votos_emitidos
            FROM votaciones v JOIN puntos_pleno p ON v.punto_id = p.id
            WHERE {part_where_v} {time_extra}
        """, tp)
        agregados = dict(cur.fetchone() or {})

    return json.dumps({
        "partido": partido,
        "tema": tema or None,
        "filtros_tiempo": {k: v for k, v in time_kw.items() if v},
        "resumen_ejecutivo": {
            **agregados,
            "votos_a_favor": resumen_votos.get("a_favor", 0),
            "votos_en_contra": resumen_votos.get("en_contra", 0),
            "abstenciones": resumen_votos.get("abstencion", 0),
            "total_intervenciones_propias": len(intervenciones_propias),
            "total_menciones_en_rivales": len(menciones_rivales),
            "total_menciones_en_puntos": len(menciones_puntos),
            "concejales_activos": len(concejales),
            "patrones_busqueda": labels_search[:12],
        },
        "concejales_del_partido": concejales[:20],
        "intervenciones_propias": intervenciones_propias,
        "votos_por_tema": votos_por_tema,
        "votaciones_detalle": votaciones_detalle,
        "menciones_rivales": menciones_rivales,
        "menciones_en_puntos": menciones_puntos,
        "eco_social": eco_social,
    }, default=str, ensure_ascii=False)


# Palabras señaladoras de ATAQUE/CONFRONTACIÓN en un argumento.
_ATTACK_KEYWORDS = [
    "mentida", "mentira", "mentides", "mentiras",
    "fals", "falso", "falsa", "falses", "falsas",
    "titol fals", "título falso", "títol fals",
    "curriculum", "currículum", "titulació", "titulación",
    "acusa", "acusar", "acusació", "acusación",
    "desmentir", "desmento", "desmentit",
    "no és veritat", "no es verdad", "no és cert", "no es cierto",
    "enganya", "engaña", "engaño", "engany",
    "impugna", "impugnar", "incompatibilitat", "incompatibilidad",
    "conflicte d'interessos", "conflicto de intereses",
    "denuncia", "denuncien", "denuncien",
    "irregularitat", "irregularidad",
    "nepotisme", "nepotismo",
    "caradura", "cínic", "cínico", "hipòcrita", "hipócrita",
    "miente", "minteix", "enganyoso", "engañoso",
    "corrupció", "corrupción", "corrupte", "corrupto",
    "fraude", "frau",
    "no té competència", "no tiene competencia", "no està capacitat", "no está capacitado",
]


def _extract_author_name(text: str) -> str:
    """Intenta extraer el nombre del concejal que HABLA al inicio del argumento.
    Estilo habitual: 'Sílvia Orriols defiende que...', 'Chantal Pérez recuerda...'
    Patrón: 2-4 palabras capitalizadas al inicio antes del verbo."""
    if not text:
        return ""
    m = re.match(
        r'^\s*((?:[A-ZÀ-ÚÇÑ][\wÀ-ÿçñ\'\-]+)(?:\s+(?:de\s+la\s+|del\s+|de\s+|d\')?[A-ZÀ-ÚÇÑ][\wÀ-ÿçñ\'\-]+){1,3})\s+(?:defensa|defiende|afirma|diu|dice|pregunta|recuerda|recorda|señala|assenyala|explica|comenta|intervé|interviene|replica|respon|responde|manifest|manifiesta|demana|pide|sol·licita|solicita|expressa|expresa|indica|anuncia|critica|rebutja|rechaza|acusa|atribueix|atribuye|sosté|sostiene)',
        text[:250],
        flags=re.UNICODE,
    )
    if m:
        return m.group(1).strip()
    return ""


def _detect_attack_keywords(text: str) -> list[str]:
    """Devuelve palabras de ataque presentes en el texto."""
    tl = (text or "").lower()
    return [k for k in _ATTACK_KEYWORDS if k in tl]


def _top_keywords(text: str, limit: int = 5) -> list[str]:
    """Tokens significativos (>=5 chars, no stopwords) más frecuentes en el texto."""
    STOPWORDS = {
        "sobre", "sobre", "també", "perquè", "porque", "entre", "sempre", "quan",
        "cuando", "donde", "dónde", "hacia", "hasta", "este", "esta", "estos", "estas",
        "aquest", "aquesta", "aquests", "aquestes", "alguns", "algunes", "algunos", "algunas",
        "tanto", "tantos", "mateix", "mateixa", "mismo", "misma", "mismos", "mismas",
        "molt", "mucho", "mucha", "poco", "poca", "tots", "todos", "totes", "todas",
        "altres", "otros", "otras", "altre", "altra", "otro", "otra",
        "regidor", "regidora", "alcalde", "alcaldessa", "alcaldesa", "partit", "partido",
        "govern", "gobierno", "pleno", "ple", "ajuntament", "ayuntamiento",
        "aprovar", "aprobar", "votar", "votació", "votación", "acord", "acuerdo",
        "punto", "punt", "sessió", "sesión", "reunió", "reunión",
    }
    tokens = re.findall(r'\b[\wÀ-ÿçñ]{5,}\b', (text or "").lower())
    freq: dict[str, int] = {}
    for t in tokens:
        if t in STOPWORDS or t.isdigit():
            continue
        freq[t] = freq.get(t, 0) + 1
    return [w for w, _ in sorted(freq.items(), key=lambda kv: -kv[1])[:limit]]


def tool_narrativas_cruzadas(
    partido_objetivo: str,
    partido_emisor: str = "",
    tema: str = "",
    **time_kw,
) -> str:
    """Detecta ATAQUES/MENCIONES persona-a-persona contra concejales del partido_objetivo.
    Por cada argumento devuelve:
      - autor_partido (del argumento)
      - autor_nombre (extraído del inicio del texto)
      - mencion_detectada (qué persona/alias del partido_objetivo aparece)
      - argumento completo
      - señales_ataque (palabras clave detectadas)
      - palabras_clave (tokens significativos)
    Luego AGRUPA por palabras clave comunes para identificar narrativas replicadas
    (misma tesis en varios municipios).

    Args:
      partido_objetivo: partido contra el que buscar ataques (ej 'AC')
      partido_emisor: partido desde el que buscar (opcional; vacío = cualquier rival)
    """
    tf, tp = _time_filter("p.fecha", **time_kw)
    has_time = any(v for v in time_kw.values())
    if not has_time:
        tf = "p.fecha >= CURRENT_DATE - INTERVAL '180 days'"
        tp = []
    time_extra = f"AND {tf}" if tf else ""

    part_target = _partido_where(partido_objetivo).replace("v.partido", "a.partido")
    part_emisor_filter = ""
    if partido_emisor:
        part_emisor_filter = "AND " + _partido_where(partido_emisor).replace("v.partido", "a.partido")

    with get_cursor() as cur:
        concejales = _get_concejales_del_partido(cur, partido_objetivo, limit=60)
        name_patterns = _build_name_patterns(concejales)
        key = _party_key_for_mentions(partido_objetivo)
        labels_search: list[str] = list(_PARTY_ALIASES.get(key, []))
        labels_search.extend(name_patterns[:30])
        labels_search = [l for l in labels_search if l and len(l.strip()) >= 3]
        if not labels_search:
            return json.dumps({
                "error": "sin_patrones_busqueda",
                "partido_objetivo": partido_objetivo,
                "concejales_encontrados": len(concejales),
            }, ensure_ascii=False)

        like_clauses = []
        like_params: list = []
        for lab in labels_search[:30]:
            like_clauses.append("a.argumento ILIKE %s")
            like_params.append(f"%{lab}%")
        like_clause = " OR ".join(like_clauses)

        cur.execute(f"""
            SELECT a.id, a.partido AS autor_partido, a.posicion, a.argumento,
                   p.titulo AS punto_titulo, p.tema, p.fecha, p.resumen AS punto_resumen,
                   m.nombre AS municipio, m.poblacion
            FROM argumentos a
            JOIN puntos_pleno p ON a.punto_id = p.id
            JOIN municipios m ON p.municipio_id = m.id
            WHERE ({like_clause})
              AND NOT ({part_target})
              AND a.partido IS NOT NULL
              AND LENGTH(a.argumento) >= 40
              {part_emisor_filter}
              {time_extra}
            ORDER BY
                CASE WHEN m.poblacion > 20000 THEN 0 ELSE 1 END,
                p.fecha DESC
            LIMIT 40
        """, like_params + tp)
        rows = [dict(r) for r in cur.fetchall()]

    # Post-procesado: identificar autor, mención concreta, keywords, ataques
    ataques: list[dict] = []
    for r in rows:
        texto = r.get("argumento") or ""
        # Detectar qué patrón del partido_objetivo aparece
        mencion = ""
        for lab in labels_search:
            if lab.strip().lower() in texto.lower():
                mencion = lab.strip()
                break
        autor_nombre = _extract_author_name(texto)
        señales = _detect_attack_keywords(texto)
        kw = _top_keywords(texto, limit=6)
        ataques.append({
            "autor_partido": r.get("autor_partido"),
            "autor_nombre": autor_nombre or None,
            "mencion_detectada": mencion,
            "municipio": r.get("municipio"),
            "fecha": r.get("fecha"),
            "punto_titulo": r.get("punto_titulo"),
            "tema": r.get("tema"),
            "argumento": texto,
            "señales_ataque": señales,
            "palabras_clave": kw,
            "es_confrontacional": bool(señales),
        })

    # Agrupar por palabras clave comunes → narrativas replicadas
    # (si 2+ argumentos comparten >=2 palabras clave en varios municipios, probable narrativa)
    narrativas_agrupadas: dict[str, dict] = {}
    for a in ataques:
        for kw in a["palabras_clave"][:3]:
            entry = narrativas_agrupadas.setdefault(kw, {
                "keyword": kw,
                "municipios": set(),
                "partidos_emisores": set(),
                "apariciones": 0,
                "ejemplos": [],
            })
            entry["municipios"].add(a["municipio"])
            entry["partidos_emisores"].add(a["autor_partido"] or "desconegut")
            entry["apariciones"] += 1
            if len(entry["ejemplos"]) < 3:
                entry["ejemplos"].append({
                    "municipio": a["municipio"],
                    "fecha": a["fecha"],
                    "autor_partido": a["autor_partido"],
                    "autor_nombre": a["autor_nombre"],
                    "argumento": a["argumento"][:300],
                })

    # Solo narrativas que aparezcan en 2+ municipios
    narrativas_replicadas = []
    for v in narrativas_agrupadas.values():
        if len(v["municipios"]) >= 2:
            narrativas_replicadas.append({
                "keyword": v["keyword"],
                "municipios_cnt": len(v["municipios"]),
                "municipios": sorted(v["municipios"]),
                "partidos_emisores": sorted(v["partidos_emisores"]),
                "apariciones": v["apariciones"],
                "ejemplos": v["ejemplos"],
            })
    narrativas_replicadas.sort(key=lambda n: (n["municipios_cnt"], n["apariciones"]), reverse=True)

    # Confrontaciones directas (con señales de ataque)
    confrontaciones = sorted(
        [a for a in ataques if a["es_confrontacional"]],
        key=lambda a: a["fecha"] or "",
        reverse=True,
    )[:10]

    return json.dumps({
        "partido_objetivo": partido_objetivo,
        "partido_emisor_filtro": partido_emisor or None,
        "filtros_tiempo": {k: v for k, v in time_kw.items() if v},
        "resumen": {
            "ataques_totales": len(ataques),
            "confrontaciones_detectadas": len(confrontaciones),
            "narrativas_replicadas": len(narrativas_replicadas),
            "municipios_implicados": len({a["municipio"] for a in ataques}),
            "partidos_emisores": sorted({a["autor_partido"] for a in ataques if a["autor_partido"]}),
        },
        "confrontaciones_directas": confrontaciones,
        "narrativas_replicadas": narrativas_replicadas[:8],
        "todos_los_ataques": ataques[:20],
    }, default=str, ensure_ascii=False)


def tool_oportunidades_tema(tema: str = "") -> str:
    """Detecta temas en tendencia donde el CLIENTE aún no ha tomado posición o rivales están divididos."""
    with get_cursor() as cur:
        tema_filter = ""
        params: list = []
        if tema:
            tema_filter = "AND p.tema = %s"
            params.append(tema)

        cur.execute(f"""
            SELECT p.tema, COUNT(*) AS total_puntos,
                   COUNT(DISTINCT p.municipio_id) AS municipios_debaten,
                   COUNT(*) FILTER (WHERE p.fecha >= CURRENT_DATE - INTERVAL '30 days') AS ult_30d
            FROM puntos_pleno p
            WHERE p.fecha >= CURRENT_DATE - INTERVAL '60 days'
              AND p.tema IS NOT NULL AND p.tema != 'procedimiento'
              {tema_filter}
            GROUP BY p.tema
            ORDER BY ult_30d DESC LIMIT 8
        """, params)
        temas_calientes = [dict(r) for r in cur.fetchall()]

        # Posición del cliente en esos temas
        client_where = _partido_where(CLIENT_PARTIDO)
        cur.execute(f"""
            SELECT p.tema,
                   COUNT(v.id) FILTER (WHERE {client_where}) AS votos_cliente,
                   COUNT(v.id) AS votos_totales,
                   COUNT(DISTINCT p.municipio_id) AS municipios_con_tema
            FROM puntos_pleno p
            LEFT JOIN votaciones v ON v.punto_id = p.id
            WHERE p.fecha >= CURRENT_DATE - INTERVAL '90 days'
              AND p.tema IS NOT NULL AND p.tema != 'procedimiento'
              {tema_filter}
            GROUP BY p.tema
            ORDER BY votos_totales DESC LIMIT 12
        """, params)
        posicion_cliente = [dict(r) for r in cur.fetchall()]

        # Divisiones entre rivales en esos temas (usa CLIENT_RIVALES)
        rivales_in = ",".join("%s" for _ in CLIENT_RIVALES) if CLIENT_RIVALES else "%s"
        rivales_params = list(CLIENT_RIVALES) if CLIENT_RIVALES else ["ERC"]
        cur.execute(f"""
            SELECT p.tema, v.partido,
                   COUNT(*) FILTER (WHERE v.sentido = 'a_favor') AS favor,
                   COUNT(*) FILTER (WHERE v.sentido = 'en_contra') AS contra
            FROM votaciones v
            JOIN puntos_pleno p ON v.punto_id = p.id
            WHERE p.fecha >= CURRENT_DATE - INTERVAL '90 days'
              AND p.tema IS NOT NULL AND p.tema != 'procedimiento'
              AND v.partido IN ({rivales_in})
              {tema_filter}
            GROUP BY p.tema, v.partido
            HAVING COUNT(*) FILTER (WHERE v.sentido = 'a_favor') >= 1
               AND COUNT(*) FILTER (WHERE v.sentido = 'en_contra') >= 1
            ORDER BY p.tema, (COUNT(*) FILTER (WHERE v.sentido = 'a_favor') + COUNT(*) FILTER (WHERE v.sentido = 'en_contra')) DESC
            LIMIT 20
        """, rivales_params + params)
        rivales_divididos = [dict(r) for r in cur.fetchall()]

    return json.dumps({
        "cliente": CLIENT_PARTIDO,
        "cliente_nombre": CLIENT_NOMBRE,
        "temas_calientes_60d": temas_calientes,
        "posicion_cliente_90d": posicion_cliente,
        "rivales_divididos_90d": rivales_divididos,
    }, default=str, ensure_ascii=False)


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
    "buscar_actas":        lambda a: tool_buscar_actas(a.get("query", ""), **_time_args(a)),
    "buscar_votaciones":   lambda a: tool_buscar_votaciones(a.get("partido", ""), **_time_args(a)),
    "info_municipio":      lambda a: tool_info_municipio(a.get("nombre", "")),
    "estadisticas":        lambda a: tool_estadisticas(),
    "buscar_argumentos":   lambda a: tool_buscar_argumentos(a.get("query", ""), a.get("partido", ""), **_time_args(a)),
    "buscar_por_tema":     lambda a: tool_buscar_por_tema(a.get("tema", ""), **_time_args(a)),
    "comparar_partidos":   lambda a: tool_comparar_partidos(a.get("partido1", ""), a.get("partido2", "")),
    "elecciones_municipio":lambda a: tool_elecciones_municipio(a.get("nombre", "")),
    "historial_alcaldes":  lambda a: tool_historial_alcaldes(a.get("nombre", "")),
    "mociones_govern":     lambda a: tool_mociones_govern(a.get("query", "")),
    "presupuesto_municipio":lambda a: tool_presupuesto_municipio(a.get("nombre", "")),
    "poblacion_municipio": lambda a: tool_poblacion_municipio(a.get("nombre", "")),
    "iniciativas_parlament":lambda a: tool_iniciativas_parlament(a.get("query", "")),
    "recepcion_social":    lambda a: tool_recepcion_social(a.get("tema", ""), a.get("municipio", ""), int(a.get("dias", 14))),
    "tendencias_emergentes":lambda a: tool_tendencias_emergentes(),
    "ranking_concejales":  lambda a: tool_ranking_concejales(a.get("partido", ""), a.get("municipio", ""), int(a.get("limit", 20))),
    "citas_literales":     lambda a: tool_citas_literales(a.get("partido", ""), a.get("tema", ""), int(a.get("limit", 15)), **_time_args(a)),
    "contradicciones_partido": lambda a: tool_contradicciones_partido(a.get("partido", ""), a.get("tema", "")),
    "dossier_adversario":  lambda a: tool_dossier_adversario(a.get("partido", ""), a.get("tema", ""), **_time_args(a)),
    "oportunidades_tema":  lambda a: tool_oportunidades_tema(a.get("tema", "")),
    "monitoring_partido":  lambda a: tool_monitoring_partido(a.get("partido", ""), a.get("tema", ""), **_time_args(a)),
    "narrativas_cruzadas": lambda a: tool_narrativas_cruzadas(
        a.get("partido_objetivo", "") or a.get("partido", ""),
        a.get("partido_emisor", ""),
        a.get("tema", ""),
        **_time_args(a),
    ),
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


def _llm_call(client, *, retries: int = 2, **kwargs):
    """Llamada al LLM con reintentos automáticos. Espera 1s y 3s entre intentos."""
    last_exc: Exception | None = None
    delays = [0, 1.0, 3.0][: retries + 1]
    for i, delay in enumerate(delays):
        if delay:
            time.sleep(delay)
        try:
            return client.chat.completions.create(**kwargs)
        except Exception as e:
            last_exc = e
            # Si el prompt es demasiado largo, no sirve reintentar
            msg = str(e).lower()
            if "too long" in msg or "context length" in msg or "max_tokens" in msg:
                raise
            continue
    raise last_exc if last_exc else RuntimeError("llm_call failed with no exception")


# Detección rápida de partido mencionado en la query (para fallback si router falla)
_PARTY_KEYWORDS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b(aliança\s+catalana|alianza\s+catalana|\bAC\b|aliança\.cat)\b', re.IGNORECASE), "AC"),
    (re.compile(r'\b(junts|jxcat|jxc|convergència|convergencia)\b', re.IGNORECASE), "JxCat"),
    (re.compile(r'\b(ERC|esquerra\s+republicana)\b', re.IGNORECASE), "ERC"),
    (re.compile(r'\b(PSC|PSOE|socialistes?|socialistas?)\b', re.IGNORECASE), "PSC"),
    (re.compile(r'\b(CUP)\b'), "CUP"),
    (re.compile(r'\b(VOX)\b'), "VOX"),
    (re.compile(r'\b(PP|partit\s+popular|partido\s+popular|populars?)\b', re.IGNORECASE), "PP"),
    (re.compile(r'\b(ciutadans|ciudadanos|\bCs\b|C\'s)\b', re.IGNORECASE), "Cs"),
    (re.compile(r'\b(comuns|en\s+comú|\bECP\b|catalunya\s+en\s+comú|ICV)\b', re.IGNORECASE), "Comuns"),
]


def _detect_partido_in_query(text: str) -> str:
    """Devuelve la etiqueta canónica del partido detectado en el texto, o cadena vacía."""
    for pat, label in _PARTY_KEYWORDS:
        if pat.search(text):
            return label
    return ""


def _build_emergency_answer(message: str, tool_results: list[str]) -> str:
    """Respuesta de emergencia si el LLM no contesta. Usa formato estructurado y un
    resumen textual de los datos disponibles sin volcar JSON al usuario."""
    summary_lines: list[str] = []
    total_rows = _count_useful_rows(tool_results)
    partido_q = _detect_partido_in_query(message)
    mode_label = f"**{partido_q}**" if partido_q else "la teva consulta"

    summary_lines.append(f"## Veredicto")
    summary_lines.append(
        f"No he pogut generar l'anàlisi complet perquè el servei d'IA ha fallat temporalment, "
        f"però he trobat **{total_rows} dades** relacionades amb {mode_label}."
    )
    summary_lines.append("")
    summary_lines.append(f"## Punts clau")

    # Extraer hasta 5 items útiles de los tool_results
    extracted = 0
    for tr in tool_results:
        if extracted >= 5:
            break
        try:
            payload = tr.split("]:\n", 1)[1] if "]:\n" in tr else tr
            parsed = json.loads(payload)
            items = parsed if isinstance(parsed, list) else (
                parsed.get("detalle")
                or parsed.get("intervenciones_propias")
                or parsed.get("confrontaciones_directas")
                or parsed.get("menciones_rivales")
                or []
            )
            for item in items[:3]:
                if extracted >= 5 or not isinstance(item, dict):
                    continue
                titulo = item.get("titulo") or item.get("argumento") or item.get("punto_titulo") or ""
                municipio = item.get("municipio") or ""
                fecha = item.get("fecha") or ""
                if titulo and len(titulo) > 150:
                    titulo = titulo[:147] + "…"
                if titulo:
                    summary_lines.append(f"- {titulo} [{municipio} · {fecha}]")
                    extracted += 1
        except Exception:
            continue

    if extracted == 0:
        summary_lines.append("- No he pogut extreure resultats útils dels tools consultats.")

    summary_lines.append("")
    summary_lines.append("## I ara què?")
    summary_lines.append(
        "Torna-ho a intentar en uns segons. Si el problema persisteix, prova una pregunta més específica "
        "(afegeix partit i periode, p. ex. «activitat de **PSC** al març 2026»)."
    )
    return "\n".join(summary_lines)


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


@router.get("/config")
def chat_config():
    """Devuelve la configuración del cliente (partido que usa la herramienta).
    Se usa en el frontend para personalizar UI, preguntas y branding."""
    return {
        "partido": CLIENT_PARTIDO,
        "nombre": CLIENT_NOMBRE,
        "rivales": CLIENT_RIVALES,
    }


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
        r1 = _llm_call(client, retries=2, model=MODEL, messages=router_msgs, temperature=0, max_tokens=700)
        plan = _extract_json(r1.choices[0].message.content)
    except Exception:
        plan = None

    if plan and plan.get("direct_answer"):
        return {"answer": plan["direct_answer"], "sources": [], "follow_ups": [], "intent": "consulta"}

    intent = (plan.get("intent", "consulta") if plan else "consulta") or "consulta"

    # Fallback inteligente: si el router falló pero detectamos un partido en la pregunta,
    # construimos un plan mínimo con monitoring_partido (útil para "qué hablan del PSC")
    if not plan or not plan.get("tools"):
        detected = _detect_partido_in_query(req.message)
        if detected:
            plan = {
                "intent": "monitor",
                "tools": [
                    {"name": "monitoring_partido", "args": {"partido": detected, "dias_atras": 90}},
                    {"name": "narrativas_cruzadas", "args": {"partido_objetivo": detected, "dias_atras": 120}},
                    {"name": "citas_literales", "args": {"partido": detected, "dias_atras": 90, "limit": 10}},
                ],
            }
            intent = "monitor"

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
            r_retry = _llm_call(
                client, retries=1,
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
    intent_hint = {
        "atacar": f"INTENCIÓN DETECTADA: ATACAR. Cliente: {CLIENT_NOMBRE} ({CLIENT_PARTIDO}). Objetivo: munición política contra el rival. La sección '¿Y ahora qué?' DEBE dar una frase atacable lista para tweet/rueda.",
        "defender": f"INTENCIÓN DETECTADA: DEFENDER. Cliente: {CLIENT_NOMBRE} ({CLIENT_PARTIDO}). Objetivo: argumentario defensivo para {CLIENT_PARTIDO}. La sección '¿Y ahora qué?' DEBE dar la respuesta a dar si nos preguntan.",
        "comparar": f"INTENCIÓN DETECTADA: COMPARAR. Cliente: {CLIENT_NOMBRE} ({CLIENT_PARTIDO}). Objetivo: contraste entre partidos. La sección '¿Y ahora qué?' DEBE posicionar {CLIENT_PARTIDO} frente a los rivales con diferencia neta.",
        "monitor": (
            "INTENCIÓN DETECTADA: MONITOR. Objetivo: briefing ejecutivo sobre el partido en el periodo. "
            "ESTRUCTURA OBLIGATORIA de Punts clau (usa estos emojis/labels tal cual):\n"
            "  1) 🗣️ Lo que ELLOS DIJERON (intervenciones_propias) — cita literal con blockquote si hay.\n"
            "  2) 🗳️ Cómo VOTARON (resumen_ejecutivo + votos_por_tema) — cifras % favor/contra/abstención.\n"
            "  3) 👥 Lo que DIJERON DE ELLOS los rivales (menciones_rivales) — OBLIGATORIO incluir al menos 1-2 citas literales textuales con formato `> \"cita\"` — partido y concejal que lo dijo. "
            "Si NO hay menciones_rivales pero SÍ hay menciones_en_puntos, cita esos extractos como 'contexto institucional'.\n"
            "  4) ⚔️ Confrontaciones nominales (narrativas_cruzadas → confrontaciones_directas): si hay, DEDICA un bullet entero a ataques persona-a-persona: "
            "«[Autor del ataque] (**partido**) va acusar [concejal objetivo] de [tesis] a [municipi] [data]» con la cita literal en blockquote. "
            "Si hay narrativas_replicadas (misma tesis en 2+ municipios), señálalo como '🔁 narrativa coordinada: la misma acusación apareix a N municipis'.\n"
            "  5) 📰 Eco en prensa (eco_social) si hay.\n"
            "En '¿Y ahora qué?': `**Temperatura política:** [baja/media/alta]. Lo que merece atención: X. Lo que hay que seguir: Y`. "
            "NUNCA digas 'nadie habla de ellos' sin verificar: el sistema buscó el nombre del partido, sus alias Y los patrones nombre+apellido de sus concejales activos. "
            "Si realmente hay 0 menciones en argumentos Y 0 en resúmenes Y 0 confrontaciones, el patrón es silencio institucional — explícalo como munición política ('X no genera debate' es útil)."
        ),
        "oportunidad": f"INTENCIÓN DETECTADA: OPORTUNIDAD. Cliente: {CLIENT_NOMBRE} ({CLIENT_PARTIDO}). Objetivo: hueco comunicativo para {CLIENT_PARTIDO}. La sección '¿Y ahora qué?' DEBE identificar el espacio concreto a ocupar.",
        "consulta": "INTENCIÓN: CONSULTA. Responde de forma útil e informada.",
    }.get(intent, "")
    msgs = [{"role": "system", "content": ANSWER_PROMPT + "\n\n" + intent_hint}]
    for h in req.history[-6:]:
        msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    msgs.append({"role": "user", "content": f"Dades consultades:\n\n{data[:14000]}\n\nPregunta: {req.message}"})

    answer = ""
    try:
        r2 = _llm_call(client, retries=2, model=MODEL, messages=msgs, temperature=0.3, max_tokens=4000)
        answer = r2.choices[0].message.content or ""
    except Exception:
        answer = _build_emergency_answer(req.message, tool_results)

    # Step 4: Follow-ups (best-effort, no bloquea)
    follow_ups: list[str] = []
    try:
        fu_msgs = [
            {"role": "system", "content": FOLLOWUP_PROMPT},
            {"role": "user", "content": f"Pregunta: {req.message}\n\nResposta: {(answer or '')[:1500]}"},
        ]
        r_fu = _llm_call(
            client, retries=1,
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
            "intent": intent,
            "latency_ms": int((time.time() - t0) * 1000),
        },
        request=request,
    )
    return {
        "answer": answer or "Sense resposta.",
        "sources": sources[:6],
        "follow_ups": follow_ups,
        "intent": intent,
    }
