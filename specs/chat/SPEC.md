# SPEC — Chat

## 2026-05-09 — Blindatge de veracitat i anti-al·lucinació per argumentaris

### Canvis realitzats
- S'ha reforçat `api/src/routes/chat.py` amb un protocol explícit de veracitat dins del prompt de resposta: cites i suport documental obligatoris per a argumentaris, comparatives factuals i propostes d'acció.
- S'ha implementat el model `VeracityAssessment` i la funció `_assess_veracity(...)` per classificar cada resposta en `grounded`, `caution` o `reject` segons volum d'evidència, presència de cites i conflictes entre fonts.
- El endpoint `POST /api/chat/` ara injecta l'`Avaluació de veracitat` al prompt final, exposa el bloc `veracity` a la resposta JSON i registra metadades de veracitat a l'audit log.
- S'ha establert un bloqueig dur: si la veracitat és `reject`, el chat no retorna argumentari ni frase atacable, sinó una resposta de rebuig/cautela explicant la manca de base documental verificable.
- S'ha reforçat la resposta d'emergència perquè respecti el mateix guardrail de rebuig quan el LLM falla.
- S'han afegit proves automàtiques a `api/tests/test_chat_veracity.py` per validar el contracte anti-al·lucinació tant a nivell unitari com d'endpoint.
- S'ha actualitzat `api/requirements.txt` per incloure `pytest` com a dependència de verificació local.

### Arxius modificats
- `api/src/routes/chat.py`
- `api/tests/test_chat_veracity.py`
- `api/requirements.txt`
- `specs/chat/SPEC.md`

### Decisions tècniques
- S'ha tractat la tasca com a implementació mínima però efectiva sobre el backend existent, perquè el brief exigia garanties operatives i no només documentació.
- La validació de veracitat és post-tool i pre-resposta: es calcula a partir dels resultats reals retornats pels tools, no només de la intenció detectada al prompt.
- El contracte de resposta obliga a vincular fets a municipi/data i a no mostrar cites literals sense autor/partit i context documental quan consti.
- El mode `reject` prioritza seguretat sobre utilitat: en absència de suport suficient, la sortida substitueix completament l'argumentari potencialment al·lucinatori.
- Els tests monkeypatchegen el LLM i l'execució de tools per provar els guardrails sense dependre de serveis externs ni de la base de dades.

### Cobertura funcional dels guardrails
- **Citació / evidència obligatòria**: `_ANSWER_PROMPT_TMPL` incorpora regles explícites de cites, municipi/data i prohibició d'inventar fets.
- **Bloqueig quan no hi ha suport suficient**: `_assess_veracity(...)` marca `reject` si una consulta d'argumentari no té cites o evidència aprofitable; el endpoint substitueix la resposta per un rebuig segur.
- **Contracte de resposta verificable**: el prompt exigeix format, cites contextualitzades i declaració explícita de conflictes o absència de dades.
- **Validació anti-al·lucinació**: l'avaluació compta evidències, cites, fets estructurats i senyals de contradicció per limitar conclusions massa fortes.

### Evidència esperada en runtime
- `response.veracity.status = grounded` només si hi ha cobertura documental suficient.
- `response.veracity.status = caution` quan hi ha base parcial però insuficient per fer afirmacions agressives.
- `response.veracity.status = reject` quan no hi ha suport verificable per construir un argumentari o proposta pública segura.

## 2026-05-09 — Verificació de l'estat actual després de la iteració prèvia

### Canvis realitzats
- S'ha revisat l'estat real del repositori per confirmar que el blindatge de veracitat del xat ja estava implementat a backend i cobert amb proves.
- S'ha verificat que `api/src/routes/chat.py` ja incorpora el protocol de cites obligatòries, l'avaluació `_assess_veracity(...)`, el bloqueig de respostes `reject` i la inclusió del bloc `veracity` a la resposta API.
- S'ha verificat que `api/tests/test_chat_veracity.py` cobreix els casos crítics: rebuig sense suport documental, cas grounded amb cites + votacions, resposta d'emergència segura i bloqueig de sortides al·lucinatòries a l'endpoint.
- En aquesta iteració només s'ha actualitzat aquesta especificació per deixar constància de la validació executada i de l'absència de treball pendent immediat.

### Arxius modificats
- `specs/chat/SPEC.md`

### Decisions tècniques
- Com que la tasca venia d'una iteració anterior i el codi ja existia, s'ha limitat l'abast a validar l'estat actual i a actualitzar la spec amb evidència documental, evitant canvis innecessaris de producció.
- Es considera que el backend actual ja compleix el checklist funcional del brief: cites obligatòries per argumentaris, polítiques de cautela/rebuig i validació post-tool abans de respondre.

### Verificacions executades
- `python3 -m pytest api/tests/test_chat_veracity.py -q` → `4 passed`
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"` → sense output, exit 0
