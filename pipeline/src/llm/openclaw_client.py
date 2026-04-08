"""Cliente OpenAI SDK compatible para OpenClaw HTTP Bridge."""

import json
import logging

from openai import OpenAI

from ..config import config

logger = logging.getLogger(__name__)

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=config.OPENCLAW_BASE_URL,
            api_key="openclaw-local",
        )
    return _client


def call_mini(system_prompt: str, user_message: str, json_mode: bool = True) -> str:
    """Llama a GPT-5.4-mini via OpenClaw para tareas de extracción."""
    client = get_client()
    kwargs = {
        "model": config.OPENCLAW_MODEL_MINI,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.1,
        "max_tokens": 8000,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def call_full(system_prompt: str, user_message: str, json_mode: bool = False) -> str:
    """Llama a GPT-5.4 via OpenClaw para análisis profundo."""
    client = get_client()
    kwargs = {
        "model": config.OPENCLAW_MODEL_FULL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.3,
        "max_tokens": 4000,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def extract_structured(text: str) -> dict:
    """Extrae datos estructurados de un acta usando GPT-5.4-mini."""
    from .prompts import EXTRACT_ACTA_PROMPT
    result = call_mini(EXTRACT_ACTA_PROMPT, text[:30000])  # Limit context
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse LLM JSON response: {result[:200]}")
        return {"error": "json_parse_failed", "raw": result[:1000]}


def analyze_coherence(punto_a: dict, punto_b: dict) -> dict:
    """Analiza si dos puntos de pleno son comparables y coherentes."""
    from .prompts import COMPARE_POINTS_PROMPT
    user_msg = json.dumps({"punto_a": punto_a, "punto_b": punto_b}, ensure_ascii=False)
    result = call_full(COMPARE_POINTS_PROMPT, user_msg, json_mode=True)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"comparable": False, "error": "json_parse_failed"}


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
    user_msg = f"Contexto de actas relevantes:\n\n{context_text}\n\nPregunta del usuario: {query}"
    return call_full(CHAT_SYSTEM_PROMPT, user_msg)


def generate_weekly_report(data: dict) -> str:
    """Genera el informe semanal automático."""
    from .prompts import WEEKLY_REPORT_PROMPT
    user_msg = json.dumps(data, ensure_ascii=False, default=str)
    return call_full(WEEKLY_REPORT_PROMPT, user_msg)
