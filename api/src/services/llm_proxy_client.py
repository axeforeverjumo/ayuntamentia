import logging
import os
from typing import Any

from openai import APITimeoutError, OpenAI

logger = logging.getLogger(__name__)

PROXY_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:10531/v1")
MODEL = os.getenv("OPENCLAW_MODEL_FULL", "gpt-5.4")
DEFAULT_TIMEOUT_SECONDS = float(os.getenv("OPENCLAW_TIMEOUT_SECONDS", "30"))


class LLMProxyTimeoutError(RuntimeError):
    """El proxy local del LLM no respondió dentro del tiempo esperado."""


class LLMProxyRequestError(RuntimeError):
    """El proxy local del LLM devolvió un error controlado."""


class LLMProxyClient:
    def __init__(
        self,
        *,
        base_url: str = PROXY_URL,
        model: str = MODEL,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.base_url = base_url
        self.model = model
        self.timeout_seconds = timeout_seconds
        self._client = OpenAI(
            base_url=self.base_url,
            api_key="subscription",
            timeout=self.timeout_seconds,
        )

    def generate_text(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        timeout_seconds: float | None = None,
    ) -> str:
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                timeout=timeout_seconds or self.timeout_seconds,
            )
        except APITimeoutError as exc:
            logger.warning(
                "llm_proxy.timeout base_url=%s timeout_seconds=%s",
                self.base_url,
                self.timeout_seconds,
            )
            raise LLMProxyTimeoutError("llm_proxy_timeout") from exc
        except Exception as exc:  # pragma: no cover - cobertura via tests con monkeypatch
            logger.exception("llm_proxy.request_failed base_url=%s", self.base_url)
            raise LLMProxyRequestError("llm_proxy_request_failed") from exc

        try:
            return response.choices[0].message.content or ""
        except Exception as exc:  # pragma: no cover - shape defensivo
            logger.exception("llm_proxy.invalid_response_shape")
            raise LLMProxyRequestError("llm_proxy_invalid_response") from exc


llm_proxy_client = LLMProxyClient()
