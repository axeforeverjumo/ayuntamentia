import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")

from api.src.main import app
from api.src.routes import intel as intel_route
from api.src.services.llm_proxy_client import LLMProxyTimeoutError


@pytest.fixture
def client():
    return TestClient(app)


def test_sala_prompt_includes_dual_sources_and_returns_structured_sources(client, monkeypatch):
    captured = {}

    async def fake_dual_retrieve(query, context):
        return {
            "query": query,
            "plens_context": [
                {
                    "id": 1,
                    "title": "Pressupost 2025",
                    "summary": "Debat oficial del pressupost",
                    "date": "2025-01-10",
                    "municipio": "Ripoll",
                    "comarca": "Ripollès",
                    "url": "https://example.com/ple-1",
                }
            ],
            "premsa_context": [
                {
                    "id": 2,
                    "title": "La premsa destaca el debat",
                    "summary": "Crònica mediàtica",
                    "date": "2025-01-11",
                    "municipio": "Ripoll",
                    "comarca": "Ripollès",
                    "url": "https://example.com/premsa-1",
                }
            ],
            "degraded": False,
            "degradation_reasons": [],
            "meta": {"sources": {}},
        }

    def fake_generate_text(messages, temperature=0.2, timeout_seconds=None):
        captured["messages"] = messages
        captured["timeout_seconds"] = timeout_seconds
        return "Resposta en català amb 📄 Ple Pressupost 2025 | 2025-01-10 i 📰 Premsa La premsa destaca el debat | 2025-01-11"

    monkeypatch.setattr(intel_route.intelligence_retrieval_service, "dual_retrieve", fake_dual_retrieve)
    monkeypatch.setattr(intel_route.llm_proxy_client, "generate_text", fake_generate_text)

    response = client.post(
        "/api/intel/sala-intelligencia",
        json={"query": "Què ha passat amb el pressupost a Ripoll?", "municipio": "Ripoll"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "Respon sempre en català" in captured["messages"][0]["content"]
    assert "📄 Ple Pressupost 2025 | 2025-01-10" in captured["messages"][1]["content"]
    assert "📰 Premsa La premsa destaca el debat | 2025-01-11" in captured["messages"][1]["content"]
    assert payload["text"].startswith("Resposta en català")
    assert payload["answer"] == payload["text"]
    assert payload["sources"]["plens"][0]["label"] == "📄 Ple Pressupost 2025 | 2025-01-10"
    assert payload["sources"]["premsa"][0]["label"] == "📰 Premsa La premsa destaca el debat | 2025-01-11"
    assert payload["meta"]["llm"]["provider"] == "local_proxy"


def test_sala_degrades_to_plens_only_when_premsa_fails(client, monkeypatch):
    async def fake_dual_retrieve(query, context):
        return {
            "query": query,
            "plens_context": [
                {
                    "id": 7,
                    "title": "Ple resilient",
                    "summary": "Només hi ha context oficial",
                    "date": "2025-02-01",
                    "municipio": "Manresa",
                    "comarca": "Bages",
                    "url": "https://example.com/ple-7",
                }
            ],
            "premsa_context": [],
            "degraded": True,
            "degradation_reasons": ["premsa_unavailable"],
            "meta": {"sources": {}},
        }

    def fake_generate_text(messages, temperature=0.2, timeout_seconds=None):
        assert "Context mediàtic recuperat (premsa):\n[]" in messages[1]["content"]
        return "Resposta només amb fonts de plens: 📄 Ple Ple resilient | 2025-02-01"

    monkeypatch.setattr(intel_route.intelligence_retrieval_service, "dual_retrieve", fake_dual_retrieve)
    monkeypatch.setattr(intel_route.llm_proxy_client, "generate_text", fake_generate_text)

    response = client.post(
        "/api/intel/sala-intelligencia",
        json={"query": "Resumeix el ple de Manresa", "municipio": "Manresa"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded"] is True
    assert payload["degradation_reasons"] == ["premsa_unavailable"]
    assert payload["sources"]["premsa"] == []
    assert payload["sources"]["plens"][0]["label"] == "📄 Ple Ple resilient | 2025-02-01"


def test_sala_returns_controlled_timeout_when_proxy_times_out(client, monkeypatch):
    async def fake_dual_retrieve(query, context):
        return {
            "query": query,
            "plens_context": [{"id": 1, "title": "Ple", "date": "2025-01-01"}],
            "premsa_context": [],
            "degraded": False,
            "degradation_reasons": [],
            "meta": {"sources": {}},
        }

    def fake_generate_text(messages, temperature=0.2, timeout_seconds=None):
        raise LLMProxyTimeoutError("llm_proxy_timeout")

    monkeypatch.setattr(intel_route.intelligence_retrieval_service, "dual_retrieve", fake_dual_retrieve)
    monkeypatch.setattr(intel_route.llm_proxy_client, "generate_text", fake_generate_text)

    response = client.post(
        "/api/intel/sala-intelligencia",
        json={"query": "Dona'm un resum del ple"},
    )

    assert response.status_code == 504
    assert response.json()["detail"] == "llm_proxy_timeout"
