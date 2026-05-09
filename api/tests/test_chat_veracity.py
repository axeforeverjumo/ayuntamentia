import json
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
from api.src.routes import chat as chat_route


@pytest.fixture
def client():
    return TestClient(app)


def test_assess_veracity_rejects_argumentario_without_documentary_support():
    plan = {"intent": "atacar", "tools": [{"name": "buscar_argumentos", "args": {"query": "immigració"}}]}
    tool_results = ["[buscar_argumentos({\"query\": \"immigració\"})]:\n[]"]

    assessment = chat_route._assess_veracity(
        "Prepara un argumentario contra ERC sobre inmigración",
        plan,
        tool_results,
        [],
    )

    assert assessment.status == "reject"
    assert assessment.documentary_support_required is True
    assert assessment.evidence_count == 0
    assert any("argumentari" in reason.lower() or "base documental" in reason.lower() or "cites" in reason.lower() for reason in assessment.missing_support_reasons)


def test_assess_veracity_allows_grounded_argumentario_with_quotes_and_votes():
    plan = {
        "intent": "atacar",
        "tools": [
            {"name": "citas_literales", "args": {"partido": "ERC"}},
            {"name": "buscar_votaciones", "args": {"partido": "ERC"}},
        ],
    }
    citas = [
        {
            "partido": "ERC",
            "argumento": "Cal reforçar l'acollida amb més recursos municipals.",
            "titulo": "Debat sobre immigració",
            "tema": "immigració",
            "fecha": "2026-03-10",
            "municipio": "Vic",
        },
        {
            "partido": "ERC",
            "argumento": "No compartim el discurs alarmista sobre seguretat.",
            "titulo": "Moció de seguretat",
            "tema": "seguretat",
            "fecha": "2026-03-18",
            "municipio": "Manresa",
        },
    ]
    votaciones = {
        "detalle": [
            {
                "partido": "ERC",
                "sentido": "a_favor",
                "titulo": "Pla d'acollida",
                "tema": "immigració",
                "resultado": "aprovada",
                "fecha": "2026-03-10",
                "municipio": "Vic",
                "resumen": "Aprovació del pla.",
            },
            {
                "partido": "ERC",
                "sentido": "en_contra",
                "titulo": "Moció de reforç policial",
                "tema": "seguretat",
                "resultado": "rechazada",
                "fecha": "2026-03-18",
                "municipio": "Manresa",
                "resumen": "Vot contrari al reforç policial.",
            },
            {
                "partido": "ERC",
                "sentido": "a_favor",
                "titulo": "Ajuts socials extraordinaris",
                "tema": "serveis socials",
                "resultado": "aprovada",
                "fecha": "2026-03-21",
                "municipio": "Olot",
                "resumen": "Suport als ajuts.",
            },
            {
                "partido": "ERC",
                "sentido": "abstencion",
                "titulo": "Ordenança de convivència",
                "tema": "civisme",
                "resultado": "aprovada",
                "fecha": "2026-03-24",
                "municipio": "Figueres",
                "resumen": "Abstenció en l'ordenança.",
            },
        ],
        "total": 4,
    }
    tool_results = [
        f"[citas_literales({json.dumps({'partido': 'ERC'}, ensure_ascii=False)})]:\n{json.dumps(citas, ensure_ascii=False)}",
        f"[buscar_votaciones({json.dumps({'partido': 'ERC'}, ensure_ascii=False)})]:\n{json.dumps(votaciones, ensure_ascii=False)}",
    ]

    assessment = chat_route._assess_veracity(
        "Prepara un argumentari contra ERC sobre immigració",
        plan,
        tool_results,
        [],
    )

    assert assessment.status == "grounded"
    assert assessment.confidence == "alta"
    assert assessment.evidence_count >= 6
    assert any("cita" in item.lower() for item in assessment.citation_requirements)


def test_emergency_answer_blocks_output_when_veracity_rejects():
    veracity = chat_route.VeracityAssessment(
        status="reject",
        confidence="baixa",
        evidence_count=0,
        documentary_support_required=True,
        missing_support_reasons=["La consulta demana argumentari però no hi ha cites verificables."],
        conflicting_support_reasons=[],
        allowed_claim_types=["explicar manca de suport"],
        recommended_actions=["demanar més dades"],
        citation_requirements=["calen cites"],
        sources_summary=[],
    )

    answer = chat_route._build_emergency_answer("Fes-me un argumentari contra PSC", [], veracity)

    assert "No puc construir un argumentari verificable" in answer
    assert "La consulta demana argumentari però no hi ha cites verificables." in answer


def test_chat_endpoint_returns_veracity_and_blocks_when_llm_hallucinates_without_support(client, monkeypatch):
    monkeypatch.setattr(chat_route, "log_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_route, "tool_buscar_actas", lambda query: "[]")

    def fake_execute_plan(plan, tool_results, sources, tools_used):
        tools_used.append("buscar_argumentos")
        tool_results.append('[buscar_argumentos({"query":"immigració"})]:\n[]')

    monkeypatch.setattr(chat_route, "_execute_plan", fake_execute_plan)

    responses = iter([
        {"choices": [{"message": {"content": json.dumps({"intent": "atacar", "tools": [{"name": "buscar_argumentos", "args": {"query": "immigració"}}]})}}]},
        {"choices": [{"message": {"content": "## Veredicto\nInventat"}}]},
        {"choices": [{"message": {"content": json.dumps({"followups": ["Quines fonts falten?", "En quin municipi?", "Quin període? "]})}}]},
    ])

    class FakeResponse:
        def __init__(self, payload):
            self.choices = [type("Choice", (), {"message": type("Msg", (), {"content": payload["choices"][0]["message"]["content"]})()})()]

    def fake_llm_call(client, **kwargs):
        return FakeResponse(next(responses))

    monkeypatch.setattr(chat_route, "_llm_call", fake_llm_call)

    response = client.post("/api/chat/", json={"message": "Prepara un argumentario contra ERC sobre inmigración", "history": []})
    assert response.status_code == 200
    payload = response.json()

    assert payload["veracity"]["status"] == "reject"
    assert payload["intent"] == "atacar"
    assert "No puc construir un argumentari verificable" in payload["answer"]
    assert payload["veracity"]["documentary_support_required"] is True
