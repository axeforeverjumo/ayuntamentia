"""Cliente LLM via openai-oauth proxy (puerto 10531).

El proxy reutiliza los tokens OAuth de Codex/OpenClaw.
Acceso directo a GPT-5.4 y GPT-5.4-mini sin intermediarios.
"""

import json
import logging
import random
import re
import time

from openai import OpenAI, RateLimitError, APIStatusError

from ..config import config

logger = logging.getLogger(__name__)

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=config.OPENCLAW_BASE_URL,
            api_key="subscription",
            timeout=120.0,
        )
    return _client


def _call_with_backoff(model, system_prompt, user_message, temperature, max_tokens):
    """Llamada con back-off exponencial ante 429/5xx para no saturar OpenClaw compartido."""
    client = get_client()
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content
        except (RateLimitError, APIStatusError) as e:
            status = getattr(e, "status_code", None)
            if status and status < 500 and not isinstance(e, RateLimitError):
                raise
            if attempt == max_attempts - 1:
                raise
            delay = min(60, 2 ** attempt + random.random())
            logger.warning(f"OpenClaw {type(e).__name__} (status={status}), backoff {delay:.1f}s (attempt {attempt+1}/{max_attempts})")
            time.sleep(delay)


def call_mini(system_prompt: str, user_message: str) -> str:
    """Llama a GPT-5.4-mini para tareas de extracción."""
    return _call_with_backoff(config.OPENCLAW_MODEL_MINI, system_prompt, user_message, 0.1, 8000)


def call_full(system_prompt: str, user_message: str) -> str:
    """Llama a GPT-5.4 para análisis profundo."""
    return _call_with_backoff(config.OPENCLAW_MODEL_FULL, system_prompt, user_message, 0.3, 4000)


def _extract_json(text: str) -> dict:
    """Extrae JSON de una respuesta que puede contener markdown."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {"error": "json_parse_failed", "raw": text[:1000]}


def extract_structured(text: str) -> dict:
    """Extrae datos estructurados de un acta usando GPT-5.4-mini."""
    from .prompts import EXTRACT_ACTA_PROMPT
    result = call_mini(EXTRACT_ACTA_PROMPT, text[:25000] + "\n\nResponde SOLO con JSON válido.")
    return _extract_json(result)


def analyze_coherence(punto_a: dict, punto_b: dict) -> dict:
    """Analiza si dos puntos de pleno son comparables y coherentes."""
    from .prompts import COMPARE_POINTS_PROMPT
    user_msg = json.dumps({"punto_a": punto_a, "punto_b": punto_b}, ensure_ascii=False)
    result = call_full(COMPARE_POINTS_PROMPT, user_msg + "\n\nResponde SOLO con JSON válido.")
    parsed = _extract_json(result)
    if "error" in parsed:
        return {"comparable": False, "error": parsed.get("error")}
    return parsed


def generate_chat_response(query: str, context: list[dict]) -> str:
    """Genera respuesta conversacional con contexto RAG."""
    from .prompts import CHAT_SYSTEM_PROMPT
    context_text = "\n\n---\n\n".join([
        f"Municipio: {c.get('municipio', '?')} | Fecha: {c.get('fecha', '?')} | Tema: {c.get('tema', '?')}\n"
        f"Título: {c.get('titulo', '?')}\nResumen: {c.get('resumen', '?')}\nResultado: {c.get('resultado', '?')}"
        for c in context
    ])
    return call_full(CHAT_SYSTEM_PROMPT, f"Contexto:\n{context_text}\n\nPregunta: {query}")


def generate_weekly_report(data: dict) -> str:
    """Genera el informe semanal automático."""
    from .prompts import WEEKLY_REPORT_PROMPT
    return call_full(WEEKLY_REPORT_PROMPT, json.dumps(data, ensure_ascii=False, default=str))
