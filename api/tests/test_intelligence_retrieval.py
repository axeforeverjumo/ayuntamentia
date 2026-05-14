import asyncio
import os
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")

from api.src.main import app
from api.src.routes import intel as intel_route
from api.src.services.intelligence_retrieval_service import (
    IntelligenceRetrievalService,
    RetrievalContext,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_dual_retrieval_returns_separated_contexts_and_recency_reranks(monkeypatch):
    service = IntelligenceRetrievalService()

    async def fake_plens(query, context):
        await asyncio.sleep(0.05)
        return [
            {
                "id": 1,
                "title": "Debat de seguretat ciutadana",
                "summary": "Mesures sobre seguretat a Ripoll",
                "topic": "seguretat",
                "municipio": "Ripoll",
                "comarca": "Ripollès",
                "date": "2024-01-10T00:00:00+00:00",
            },
            {
                "id": 2,
                "title": "Seguretat i convivència",
                "summary": "Nova ordenança de convivència",
                "topic": "seguretat",
                "municipio": "Ripoll",
                "comarca": "Ripollès",
                "date": "2024-12-01T00:00:00+00:00",
            },
        ]

    async def fake_premsa(query, context):
        await asyncio.sleep(0.05)
        return [
            {
                "id": 10,
                "title": "Ripoll posa la seguretat al centre del debat",
                "summary": "Article recent sobre seguretat i AC",
                "municipio": "Ripoll",
                "comarca": "Ripollès",
                "partits": ["AC"],
                "temes": ["seguretat"],
                "date": "2025-01-15T00:00:00+00:00",
            },
            {
                "id": 11,
                "title": "Anàlisi antic sobre seguretat",
                "summary": "Peça antiga també rellevant",
                "municipio": "Ripoll",
                "comarca": "Ripollès",
                "partits": ["AC"],
                "temes": ["seguretat"],
                "date": "2023-01-15T00:00:00+00:00",
            },
        ]

    monkeypatch.setattr(service, "_fetch_plens_candidates", fake_plens)
    monkeypatch.setattr(service, "_fetch_premsa_candidates", fake_premsa)

    started = time.perf_counter()
    result = asyncio.run(
        service.retrieve(
            "seguretat ripoll",
            RetrievalContext(municipio="Ripoll", comarca="Ripollès", partido="AC", limit_per_source=2),
        )
    )
    elapsed = time.perf_counter() - started

    assert elapsed < 0.095
    assert result["degraded"] is False
    assert len(result["plens_context"]) == 2
    assert len(result["premsa_context"]) == 2
    assert result["plens_context"][0]["id"] == 2
    assert result["premsa_context"][0]["id"] == 10
    assert result["meta"]["sources"]["plens"]["candidates"] == 2
    assert result["meta"]["sources"]["premsa"]["candidates"] == 2
    assert result["plens_context"][0]["score_breakdown"]["recency_bonus"] >= result["plens_context"][1]["score_breakdown"]["recency_bonus"]


def test_dual_retrieval_gracefully_degrades_when_premsa_fails(monkeypatch):
    service = IntelligenceRetrievalService()

    async def fake_plens(query, context):
        return [
            {
                "id": 1,
                "title": "Ple municipal sobre habitatge",
                "summary": "Debat local",
                "topic": "habitatge",
                "municipio": "Manresa",
                "comarca": "Bages",
                "date": "2025-02-01T00:00:00+00:00",
            }
        ]

    async def fake_premsa(query, context):
        raise TimeoutError("premsa timeout")

    monkeypatch.setattr(service, "_fetch_plens_candidates", fake_plens)
    monkeypatch.setattr(service, "_fetch_premsa_candidates", fake_premsa)

    result = asyncio.run(service.retrieve("habitatge manresa", RetrievalContext(municipio="Manresa")))

    assert result["degraded"] is True
    assert result["degradation_reasons"] == ["premsa_unavailable"]
    assert len(result["plens_context"]) == 1
    assert result["premsa_context"] == []
    assert result["meta"]["sources"]["premsa"]["candidates"] == 0


def test_dual_retrieval_raises_when_plens_fail_even_if_premsa_succeeds(monkeypatch):
    service = IntelligenceRetrievalService()

    async def fake_plens(query, context):
        raise RuntimeError("plens unavailable")

    async def fake_premsa(query, context):
        return [
            {
                "id": 10,
                "title": "Notícia disponible",
                "summary": "Però sense plens no es pot servir el retrieval base",
                "municipio": "Ripoll",
                "comarca": "Ripollès",
                "partits": ["AC"],
                "temes": ["seguretat"],
                "date": "2025-01-15T00:00:00+00:00",
            }
        ]

    monkeypatch.setattr(service, "_fetch_plens_candidates", fake_plens)
    monkeypatch.setattr(service, "_fetch_premsa_candidates", fake_premsa)

    with pytest.raises(RuntimeError, match="plens unavailable"):
        asyncio.run(service.retrieve("seguretat ripoll", RetrievalContext(municipio="Ripoll")))


def test_dual_retrieval_raises_when_both_sources_fail(monkeypatch):
    service = IntelligenceRetrievalService()

    async def fake_plens(query, context):
        raise RuntimeError("plens down")

    async def fake_premsa(query, context):
        raise TimeoutError("premsa down")

    monkeypatch.setattr(service, "_fetch_plens_candidates", fake_plens)
    monkeypatch.setattr(service, "_fetch_premsa_candidates", fake_premsa)

    with pytest.raises(RuntimeError, match="plens down"):
        await service.retrieve("seguretat ripoll", RetrievalContext(municipio="Ripoll"))


def test_intel_retrieval_endpoint_returns_service_payload(client, monkeypatch):
    async def fake_retrieve(query, context):
        return {
            "query": query,
            "context": {
                "tenant": context.tenant,
                "municipio": context.municipio,
                "comarca": context.comarca,
                "partido": context.partido,
            },
            "plens_context": [{"id": 1, "title": "Ple"}],
            "premsa_context": [{"id": 2, "title": "Premsa"}],
            "degraded": False,
            "degradation_reasons": [],
            "meta": {
                "latency_ms": 12.3,
                "sources": {
                    "plens": {"latency_ms": 5, "candidates": 1, "final": 1},
                    "premsa": {"latency_ms": 6, "candidates": 1, "final": 1},
                },
                "reranking_formula": "score = relevance + recency_bonus + context_bonus",
            },
        }

    monkeypatch.setattr(intel_route.intelligence_retrieval_service, "retrieve", fake_retrieve)

    response = client.post(
        "/api/intel/retrieval",
        json={
            "query": "seguretat ripoll",
            "municipio": "Ripoll",
            "comarca": "Ripollès",
            "partido": "AC",
            "limit_per_source": 3,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "seguretat ripoll"
    assert payload["plens_context"][0]["title"] == "Ple"
    assert payload["premsa_context"][0]["title"] == "Premsa"
    assert payload["degraded"] is False


def test_intel_retrieval_endpoint_returns_503_when_service_fails(client, monkeypatch):
    async def fake_retrieve(query, context):
        raise RuntimeError("plens unavailable")

    monkeypatch.setattr(intel_route.intelligence_retrieval_service, "retrieve", fake_retrieve)

    response = client.post(
        "/api/intel/retrieval",
        json={"query": "seguretat ripoll", "municipio": "Ripoll"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "intel_retrieval_unavailable"
