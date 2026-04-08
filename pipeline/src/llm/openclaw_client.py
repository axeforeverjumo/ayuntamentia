"""Cliente OpenAI SDK compatible para OpenClaw HTTP Bridge.

El bridge de OpenClaw (puerto 4200) acepta formato OpenAI pero:
- El campo "model" es el ID del agente OpenClaw (ej: "main"), no un modelo real
- No soporta response_format ni max_tokens
- Puede tardar minutos (ejecuta CLI subprocess)
"""

import json
import logging
import re

import httpx

from ..config import config

logger = logging.getLogger(__name__)

BRIDGE_URL = config.OPENCLAW_BASE_URL.replace("/v1", "")
BRIDGE_TIMEOUT = 600


def _call_bridge(agent: str, message: str) -> str:
    """Llama al HTTP bridge de OpenClaw directamente con httpx."""
    url = f"{BRIDGE_URL}/v1/chat/completions"
    payload = {
        "model": agent,
        "messages": [{"role": "user", "content": message}],
    }
    try:
        resp = httpx.post(url, json=payload, timeout=BRIDGE_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except httpx.TimeoutException:
        logger.error(f"OpenClaw bridge timeout after {BRIDGE_TIMEOUT}s")
        raise
    except Exception as e:
        logger.error(f"OpenClaw bridge error: {e}")
        raise


def _extract_json(text: str) -> dict:
    """Extrae JSON de una respuesta que puede contener markdown o texto extra."""
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from ```json ... ``` block
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding first { ... } block
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return {"error": "json_parse_failed", "raw": text[:1000]}


def extract_structured(text: str) -> dict:
    """Extrae datos estructurados de un acta usando OpenClaw."""
    from .prompts import EXTRACT_ACTA_PROMPT
    prompt = f"{EXTRACT_ACTA_PROMPT}\n\n---\n\nTexto del acta:\n\n{text[:25000]}\n\nResponde SOLO con JSON válido, sin texto adicional."
    result = _call_bridge("main", prompt)
    return _extract_json(result)


def analyze_coherence(punto_a: dict, punto_b: dict) -> dict:
    """Analiza si dos puntos de pleno son comparables y coherentes."""
    from .prompts import COMPARE_POINTS_PROMPT
    user_msg = json.dumps({"punto_a": punto_a, "punto_b": punto_b}, ensure_ascii=False)
    prompt = f"{COMPARE_POINTS_PROMPT}\n\n---\n\n{user_msg}\n\nResponde SOLO con JSON válido."
    result = _call_bridge("main", prompt)
    parsed = _extract_json(result)
    if "error" in parsed:
        return {"comparable": False, "error": parsed.get("error")}
    return parsed


def generate_chat_response(query: str, context: list[dict]) -> str:
    """Genera respuesta conversacional con contexto RAG."""
    from .prompts import CHAT_SYSTEM_PROMPT
    context_text = "\n\n---\n\n".join([
        f"Municipio: {c.get('municipio', '?')} | Fecha: {c.get('fecha', '?')} | Tema: {c.get('tema', '?')}\n"
        f"Título: {c.get('titulo', '?')}\n"
        f"Resumen: {c.get('resumen', '?')}\n"
        f"Resultado: {c.get('resultado', '?')}\n"
        f"Votaciones: {c.get('votaciones', '?')}"
        for c in context
    ])
    prompt = f"{CHAT_SYSTEM_PROMPT}\n\nContexto:\n{context_text}\n\nPregunta: {query}"
    return _call_bridge("main", prompt)


def generate_weekly_report(data: dict) -> str:
    """Genera el informe semanal automático."""
    from .prompts import WEEKLY_REPORT_PROMPT
    user_msg = json.dumps(data, ensure_ascii=False, default=str)
    prompt = f"{WEEKLY_REPORT_PROMPT}\n\n---\n\nDatos:\n{user_msg}"
    return _call_bridge("main", prompt)
