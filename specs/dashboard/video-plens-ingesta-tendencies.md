# Disseny d'ingesta de vídeos de plens per a tendències

Data: 2026-05-09  
Àrea: dashboard / tendències / intel / pipeline  
Tipus de tasca: exploració

## Objectiu

Definir un flux operatiu per incorporar els vídeos de plens municipals com a nova font analítica dins la plataforma, amb tres finalitats:

1. detectar temes discutits que poden quedar infrarepresentats a les actes,
2. enriquir el càlcul de temes en tendència amb una nova font institucional,
3. proveir material reutilitzable per a capes analítiques com intel i seguiment qualitatiu.

Aquest document és de disseny. No introdueix canvis de producció a backend, frontend, pipeline ni base de dades.

## Context del repositori revisat

S'ha verificat al repositori actual:

- `api/src/routes/dashboard.py` exposa `GET /temas` per al dashboard i calcula tendències a partir de mencions en `puntos_pleno` combinades amb senyals externs de `temas_trend_signals`.
- `api/src/routes/intel.py` exposa `GET /tendencias` llegint de la vista `v_tendencias_emergentes`.
- `pipeline/src/workers/tasks.py` mostra el patró actual del pipeline amb etapes encadenades per a noves fonts (`download -> extract -> structure -> post-process` o processos equivalents segons la font).
- `specs/dashboard/SPEC.md` ja documenta que el bloc visual d'`intel stream` s'ha eliminat del dashboard; aquesta nova font no l'ha de reintroduir com a bloc separat.

## Principis de disseny

1. **Vídeo com a font complementària, no substitutiva**.
   - L'acta continua sent la font institucional principal.
   - El vídeo aporta discurs oral, intensitat, matís i fragments literalment traçables.

2. **No usar transcripcions crues directament en scoring**.
   - La font vídeo ha de passar per transcripció + QA abans d'entrar a tendències.

3. **Evitar doble recompte amb l'acta**.
   - Acta i vídeo del mateix ple no s'han de sumar de forma cega com si fossin dos esdeveniments independents.

4. **Traçabilitat obligatòria**.
   - Tot tema extret d'un vídeo ha de poder remuntar-se a vídeo, tram temporal i text de suport.

5. **Sense reintroduir `intel stream` al dashboard**.
   - La font pot alimentar tendències i intel, però no ha de tornar com una secció separada al dashboard.

---

## Flux proposat extrem a extrem

El flux es divideix en quatre etapes nuclears demanades al brief — **captura de vídeo, transcripció, revisió i extracció de temes** — desenvolupades en fases operatives concretes.

## 1) Captura de vídeo

### Objectiu
Localitzar i registrar vídeos de plens susceptibles de ser processats.

### Fonts candidates
- canals oficials de YouTube del municipi,
- web municipal amb reproductor incrustat,
- portal de transparència o hemeroteca,
- càrrega manual per operacions quan la font no sigui automatitzable.

### Metadades mínimes a registrar
- municipi
- data del ple
- títol original de la sessió
- URL origen
- tipus de font (`youtube`, `web_municipal`, `upload_manual`, etc.)
- identificador extern si existeix
- durada estimada o declarada
- idioma orientatiu (`ca`, `es`, `mixed`, `unknown`)
- estat inicial de processament
- data de captura/descobriment
- vincle probable amb la sessió o acta existent, si es pot inferir

### Regles mínimes
- deduplicar per URL canònica i/o identificador extern,
- intentar vincular el vídeo amb la sessió correcta per municipi + data + títol,
- si la vinculació no és prou fiable, marcar-lo per revisió manual i no deixar-lo avançar a scoring.

### Output de la fase
Un registre de font de vídeo amb traçabilitat suficient per iniciar la transcripció.

## 2) Transcripció

### Objectiu
Convertir l'àudio del ple en text segmentat i temporalitzat.

### Requisits mínims de la sortida
- transcripció completa crua,
- segments amb `start` / `end`,
- confiança mitjana i, si és possible, per segment,
- idioma detectat,
- marca d'incidències si el motor ho permet (`inaudible`, `soroll`, etc.),
- diarització opcional quan la tecnologia usada la suporti.

### Recomanacions operatives
- segmentar vídeos llargs en blocs per facilitar reintents,
- conservar sempre la transcripció crua original,
- guardar també una versió normalitzada/corregida si hi ha revisió posterior,
- no assumir que diarització equival a identificació fiable de persones.

### Estat de sortida suggerit
- `pending`
- `processing`
- `needs_review`
- `approved_for_analysis`
- `approved_limited`
- `rejected`

## 3) Revisió i control de qualitat

### Objectiu
Decidir si la transcripció és prou fiable per usar-la en anàlisi.

### Revisió automàtica mínima
Comprovar:
- cobertura temporal,
- percentatge de segments buits o inintel·ligibles,
- coherència entre durada i volum de text,
- confiança mitjana,
- timestamps vàlids,
- absència de repeticions absurdes o corrupció clara.

### Revisió humana assistida
Obligatòria o recomanable quan:
- la confiança és intermèdia,
- hi ha molts noms propis o sigles polítiques,
- el ple és estratègic,
- hi ha dubtes sobre l'alineació vídeo ↔ sessió,
- s'observen diferències rellevants respecte de l'acta.

### Resultat editorial possible
- `approved_for_analysis`
- `approved_limited`
- `needs_manual_review`
- `rejected_for_analysis`

### Política d'ús
- `approved_for_analysis`: apte per alimentar scoring i analítica.
- `approved_limited`: ús restringit, amb pes reduït o només exploratori.
- `needs_manual_review` / `rejected_for_analysis`: fora de tendències i fora del ranking principal.

## 4) Extracció i assimilació de temes

### Objectiu
Transformar una transcripció aprovada en senyals temàtics comparables amb actes, premsa i social.

### Procés proposat
1. normalitzar text,
2. dividir en unitats analítiques,
3. classificar temes segons una taxonomia comuna,
4. extreure evidències per tema,
5. agregar senyals per sessió i per tema.

### Unitats analítiques possibles
- blocs temporals,
- intervencions per parlant quan la diarització sigui prou útil,
- punts de l'ordre del dia si es poden alinear,
- episodis temàtics detectats per canvi de context.

### Sortides mínimes per tema/fragment
- tema canònic,
- subtema o keywords,
- resum curt,
- evidència textual,
- timestamp inici / fi,
- speaker label si existeix,
- confiança d'extracció,
- `source_type = pleno_video`.

---

## Connexió amb tendències

### Estat actual verificat
`api/src/routes/dashboard.py` calcula avui els temes del dashboard combinant:
- volum de mencions a `puntos_pleno`,
- senyal mediàtica externa des de `temas_trend_signals`.

La lògica actual ja respon a la necessitat del brief de no basar-se només en actes, perquè incorpora premsa, xarxes i altres senyals externs.

### Com s'hi connectaria la nova font vídeo
La font vídeo s'hauria d'afegir com un **component explícit i traçable** del càlcul, no amagada dins del comptador principal.

### Principi d'integració
- actes = estructura institucional i menció formal,
- vídeo = intensitat i discussió oral del mateix esdeveniment,
- premsa/xarxes = pes mediàtic extern.

### Regla clau
Si hi ha acta i vídeo del mateix ple:
- no sumar dues vegades el mateix debat com si fossin dos plens diferents,
- usar el vídeo com a reforç de cobertura, intensitat i evidència,
- mantenir traçabilitat per font.

### Senyals recomanades de vídeo
Quan s'implementi, el component vídeo hauria d'exposar com a mínim:
- `video_mentions_count`
- `video_minutes_covered`
- `video_source_count`
- `video_quality_weighted_score`
- `video_recency_score`

### Presentació al dashboard
- la informació enriquida per vídeo ha d'aparèixer dins del bloc de tendències existent o en metadades del tema,
- **no** s'ha de recrear un bloc separat d'`intel stream`.

---

## Connexió amb intel

### Estat actual verificat
`api/src/routes/intel.py` exposa `/tendencias` llegint de `v_tendencias_emergentes`.

### Paper de la font vídeo a intel
Intel hauria d'aprofitar aquesta font per a:
- recuperar fragments amb timestamps,
- detectar narratives emergents en discurs oral,
- comparar el que diu l'acta amb el que realment s'ha discutit al vídeo,
- aportar context qualitatiu als temes detectats.

### Separació de rols
- **Tendències**: score agregat i priorització.
- **Intel**: exploració, context, cites i seguiment narratiu.

La mateixa font pot alimentar ambdós espais, però amb sortides diferents.

---

## Criteris mínims de qualitat per usar transcripcions en anàlisi

Una transcripció només hauria d'entrar a anàlisi si compleix un mínim operatiu.

### 1. Cobertura temporal mínima
- cobrir com a mínim el 80% de la durada útil del ple,
- si falten trams centrals del debat, no és apta per scoring principal.

### 2. Intel·ligibilitat
- els segments rellevants han de permetre entendre els assumptes tractats,
- si predominen buits, soroll o repeticions incoherents, s'ha de rebutjar.

### 3. Confiança del motor
Llindars inicials recomanats:
- aprovació automàtica només amb confiança alta,
- revisió obligatòria en franja intermèdia,
- rebuig si la confiança és clarament insuficient.

Com a punt de partida operatiu, es pot usar un llindar orientatiu de `confidence_avg >= 0.75` per a aprovació automàtica, a validar amb dades reals.

### 4. Noms propis i entitats polítiques
- partits, càrrecs i noms institucionals no poden quedar sistemàticament corromputs,
- si això passa, la transcripció no ha d'entrar automàticament en temes sensibles.

### 5. Alineació amb la sessió correcta
- municipi, data i sessió han de ser coherents amb el vídeo processat,
- si no es pot vincular amb seguretat raonable, no ha d'alimentar tendències.

### 6. Traçabilitat
Tot tema extret ha de poder remuntar-se a:
- vídeo origen,
- tram temporal,
- fragment textual concret.

### 7. Estat editorial final
Només s'han d'usar transcripcions amb estat final:
- `approved_for_analysis`, o
- `approved_limited` si el consum admet pes reduït.

### Criteris de rebuig o ús limitat
- àudio molt deficient,
- vídeo incomplet,
- timestamps no fiables,
- errors greus amb noms propis,
- desalineació entre metadades i contingut,
- extracció temàtica sense evidència textual suficient.

---

## Encaix amb l'arquitectura existent

### Pipeline
L'encaix natural és `pipeline/`, seguint el patró que ja usa el repositori per altres fonts:
- descobriment / captura,
- preparació d'àudio,
- transcripció,
- QA,
- extracció temàtica,
- publicació d'agregats.

### API
- `api/src/routes/dashboard.py`: consum futur del senyal agregat de vídeo dins del càlcul de tendències.
- `api/src/routes/intel.py`: consum futur de segments, evidències o agregats per exploració.

### Base de dades
És recomanable persistir la font vídeo en capes separades de:
- fonts de vídeo,
- transcripcions,
- revisions,
- segments,
- temes extrets,
- agregats per tema.

No és recomanable connectar transcripció crua directament als endpoints finals.

---

## Disseny operatiu detallat per etapa

### Orquestració suggerida
Per encaixar amb el patró vist a `pipeline/src/workers/tasks.py`, el flux futur pot modelar-se com una cadena de tasques amb checkpoints persistits:

1. `discover_pleno_videos`
2. `download_or_link_pleno_video`
3. `extract_audio_track`
4. `transcribe_pleno_video`
5. `qa_transcription`
6. `extract_video_topics`
7. `aggregate_video_trend_signals`
8. `publish_video_intel_evidence`

Cada etapa hauria de ser **idempotent**, reprendre per estat i escriure un `status` clar per evitar processaments duplicats.

### Model conceptual mínim de dades
Sense proposar encara una migració concreta, el disseny necessita almenys aquestes entitats lògiques:

- **video_source**
  - identificació del vídeo i metadades d'origen.
- **video_transcription_job**
  - execució tècnica de transcripció, motor, timings i confiança.
- **video_transcription_segment**
  - fragments temporalitzats amb text, confiança i incidències.
- **video_review**
  - decisió editorial/QA sobre aptitud analítica.
- **video_topic_evidence**
  - tema detectat + suport textual + timestamps.
- **video_topic_aggregate**
  - senyal agregada explotable per dashboard i intel.

### Estratègia per evitar doble recompte amb actes
La vinculació acta ↔ vídeo del mateix ple és un requisit central del disseny.

#### Clau de correspondència suggerida
Prioritzar una correspondència amb proves acumulatives:
1. municipi,
2. data del ple,
3. coincidència semàntica del títol,
4. durada o ordre del dia si existeix,
5. confirmació manual quan la confiança de match sigui intermèdia.

#### Política analítica
- Si el vídeo està vinculat amb alta confiança a una acta existent, el seu senyal entra com **reforç** del mateix esdeveniment.
- Si no existeix acta però el vídeo és fiable, pot generar senyal pròpia marcada com a `institutional_video_only`.
- Si la correspondència és dubtosa, el vídeo no participa en el score principal.

### Pes analític recomanat de la font vídeo
Com que encara no hi ha calibratge real, el disseny proposa una adopció conservadora:

- `approved_for_analysis`: pes complet del component vídeo definit en calibratge futur.
- `approved_limited`: pes reduït (per exemple 25%–50% del pes normal).
- qualitat baixa o match dubtós: exclusió del ranking principal.

L'objectiu és que el vídeo **enriqueixi** el model actual però no distorsioni tendències per errors d'ASR o de vinculació.

### Consum per dashboard
La capa dashboard hauria d'usar només el resultat agregat, no la transcripció crua.

#### Camps recomanats per resposta analítica futura
A nivell de tema, seria útil exposar:
- `trend_score`
- `actas_mentions_count`
- `media_prensa_norm`
- `media_redes_norm`
- `media_otras_norm`
- `video_quality_weighted_score`
- `video_evidence_count`
- `video_last_session_date`

Això permetria debug i transparència sense reintroduir cap bloc d'`intel stream`.

### Consum per intel
Intel pot consumir un nivell més ric de detall:
- fragments destacats amb timestamps,
- resum del debat oral,
- divergències entre acta i vídeo,
- intensitat del tema dins el ple,
- cites o evidències recuperables.

Aquest consum ha de continuar sent una capa d'exploració i context, no el lloc on es defineix el ranking principal del dashboard.

### Casos límit previstos
- **Vídeo sense àudio usable**: es conserva com a font descoberta però queda rebutjat per anàlisi.
- **Vídeo parcial**: només ús limitat si el tram disponible cobreix una part clarament útil del debat.
- **Barreja forta català/castellà**: revisió addicional si el motor baixa rendiment en noms propis.
- **Ple extraordinari molt curt**: flexibilitzar cobertura percentual si la durada és baixa però el contingut és complet.
- **Directes o URLs inestables**: emmagatzemar metadades canòniques i, si cal, una còpia d'àudio derivada per garantir reproductibilitat del procés.

---

## Ordre recomanat d'implementació futura

### Fase 1 — Ingesta base
- registrar fonts de vídeo,
- descarregar o estabilitzar accés a l'àudio,
- generar transcripció crua,
- guardar mètriques mínimes de qualitat.

### Fase 2 — QA
- flux de revisió,
- correccions lleugeres,
- aprovació/rebuig per anàlisi.

### Fase 3 — Temes
- classificació amb taxonomia comuna,
- evidències amb timestamps,
- agregats per tema.

### Fase 4 — Integració analítica
- incorporació del senyal vídeo a tendències,
- explotació de fragments i context a intel.

---

## Decisions tancades d'aquesta iteració

- Les etapes requerides pel brief queden definides: captura, transcripció, revisió i extracció de temes.
- La connexió amb tendències i intel queda especificada conceptualment.
- Els criteris mínims de qualitat per usar transcripcions en anàlisi queden documentats.
- Es manté la decisió de producte de no reintroduir `intel stream` al dashboard.
- Es defineix una proposta d'orquestració i de model conceptual mínim per facilitar implementació futura sense tocar encara codi ni esquema.

## Arxius revisats per a aquest disseny

- `api/src/routes/dashboard.py`
- `api/src/routes/intel.py`
- `pipeline/src/workers/tasks.py`
- `specs/dashboard/SPEC.md`

## Preguntes obertes per a implementació futura

- Quin proveïdor ASR es prioritzarà per català/castellà mixt?
- El MVP inclourà diarització o només timestamps?
- La revisió humana tindrà UI pròpia o operativa externa?
- Quin pes exacte tindrà la font vídeo dins del scoring final un cop hi hagi dades reals?
- Com s'identificarà tècnicament la unió acta ↔ vídeo del mateix ple per evitar doble recompte?

---

## Correcció de la iteració actual

Aquesta iteració deixa el disseny correctament **aterrat al repositori real** i preparat per review:

- es documenta explícitament que la tasca és d'**exploració** i que no s'han fet canvis de producció;
- es connecta la proposta amb els punts reals del codi revisats al repositori (`dashboard.py`, `intel.py`, `tasks.py`);
- es fixa de manera explícita que la nova font **alimenta tendències i intel** però **no** reobre cap bloc d'`intel stream` al dashboard;
- es concreten criteris mínims d'acceptació de transcripcions perquè la font no entri al scoring principal sense QA;
- es deixa clar l'encaix futur via `pipeline/` i via agregats analítics consumits per API/dashboard.

## Fitxer i abast d'aquesta entrega

Aquest document és l'artefacte principal de la tasca i cobreix literalment el checklist del brief:

- **Definir etapes**: captura de vídeo, transcripció, revisió i extracció de temes.
- **Especificar connexió amb tendències i intel**: seccions dedicades amb integració proposada i separació de rols.
- **Documentar criteris mínims de qualitat**: secció específica amb cobertura, confiança, traçabilitat i estats editorials.

No s'han creat models, rutes ni migracions en aquesta iteració perquè el brief demana disseny i documentació, no implementació de la font.
