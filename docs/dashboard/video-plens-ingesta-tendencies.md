# Disseny d'ingesta de vídeos de plens per a tendències

Data: 2026-05-09  
Àrea: dashboard / tendències / intel / pipeline  
Tipus de tasca: exploració

## Objectiu

Definir un flux operatiu perquè els vídeos dels plens municipals passin a ser una nova font analítica reusable dins de Pulse/AjuntamentIA. La finalitat principal és alimentar **temes en tendència** amb més cobertura del que realment s'ha discutit al ple, però també deixar la mateixa font preparada per a capes futures d'**intel·ligència estratègica**, briefing temàtic i detecció d'oportunitats.

Aquest document és el document canònic d'aquesta iteració. No introdueix canvis de producció a backend, pipeline, frontend ni base de dades.

## Context del repositori tingut en compte

Després de revisar el codi i la documentació actuals:

- `api/src/routes/dashboard.py` ja exposa `GET /dashboard/temas` i calcula tendències combinant:
  - mencions internes a `puntos_pleno`,
  - senyals externs a `temas_trend_signals`.
- `api/src/routes/intel.py` exposa `GET /intel/tendencias` consumint `v_tendencias_emergentes`.
- `pipeline/src/workers/tasks.py` ja segueix una lògica per capes d'ingesta, extracció, estructuració i workers; és el lloc natural per afegir una nova font basada en vídeo.
- `pipeline/src/ingesta/parlament_pipeline.py` mostra el patró més pròxim per a una nova font: descoberta/descàrrega, extracció, estructuració i actualització d'estat.
- `docs/ESTRATEGIA_DATOS.md` ja fixa una filosofia de pipeline per capes, artefactes persistents i scores de qualitat; aquest disseny segueix aquest mateix patró.
- El bloc visual d'`intel stream` ja es va eliminar del dashboard segons `specs/dashboard/SPEC.md`; per tant, aquesta nova font **no** ha de reintroduir-lo en aquesta pantalla.

## Decisió de producte

Els vídeos de plens s'han de tractar com una **font complementària** a les actes, no com una substitució.

Motiu:
- les actes continuen sent la font institucional primària i més estable,
- el vídeo aporta matís discursiu, durada real del debat i temes poc visibles a l'acta,
- la transcripció pot contenir errors d'ASR i necessita QA abans d'entrar en analítica automàtica.

---

## Flux proposat extrem a extrem

Es defineixen quatre etapes obligatòries del brief — **captura de vídeo, transcripció, revisió i extracció/assimilació de temes** — desplegades sobre un pipeline operatiu de set fases.

## 0) Descobriment i catàleg del vídeo

### Objectiu
Registrar que existeix un ple amb vídeo associat i conservar metadades mínimes abans de descarregar o transcriure.

### Fonts previstes
- YouTube oficial del municipi o canal del ple.
- Web municipal amb reproductor incrustat.
- Portal de transparència o hemeroteca de plens.
- Fitxer aportat manualment per operacions quan no hi hagi una font automatitzable.

### Metadades mínimes a capturar
- `municipio_id` o codi municipal
- `fecha_pleno`
- `sesion_titulo_original`
- `source_type` (`youtube`, `vimeo`, `web_municipal`, `upload_manual`, `unknown`)
- `source_url`
- `external_video_id`
- `video_published_at`
- `duration_seconds`
- `language_hint` (`ca`, `es`, `mixed`, `unknown`)
- `video_status` inicial (`discovered`)
- `checksum` o identificador equivalent quan existeixi
- `captured_at`
- referència opcional a l'acta o sessió existent si la relació és fiable

### Regles operatives
- Intentar vincular cada vídeo a una sessió concreta per municipi + data + títol.
- Deduplicar per URL canònica + durada + checksum o identificador extern.
- Si hi ha múltiples còpies del mateix ple, escollir-ne una de canònica i marcar la resta com a alternatives.
- Si no es pot vincular el vídeo amb una sessió concreta amb prou confiança, deixar-lo en `needs_linking_review` o equivalent i excloure'l de la resta de fases analítiques.

### Output de la fase
Artefactes persistents:
- registre del vídeo detectat,
- metadades de traçabilitat i estat,
- vincle preliminar amb la sessió/acta si existeix.

## 1) Captura de vídeo i preparació del mitjà

### Objectiu
Detectar, descarregar o estabilitzar l'accés a la peça audiovisual del ple o al seu àudio derivat.

### Modes operatius possibles
1. **Referència remota sense còpia local**
   - útil per PoC o fonts molt estables,
   - menor cost inicial,
   - pitjor resiliència si el vídeo desapareix.

2. **Còpia controlada de l'àudio o vídeo**
   - preferible per producció,
   - permet reintents, auditoria i reprocesat,
   - facilita separar el cost de transcripció del risc de pèrdua de l'enllaç original.

### Decisió recomanada
Persistir com a mínim:
- URL original,
- hash o identificador del recurs capturat,
- ruta interna a l'àudio extret o al vídeo descarregat,
- timestamp de captura.

### Regles operatives
- Prioritzar la captura d'àudio sobre vídeo complet quan l'anàlisi no requereixi imatge.
- Validar accessibilitat i durada abans de processar.
- Per vídeos llargs, segmentar en blocs de 5–15 minuts per reduir errors de transcripció i facilitar retries parcials.

### Estats suggerits
- `discovered`
- `captured` o `downloaded`
- `capture_failed` o `failed_download`
- `needs_access_review`

## 2) Transcripció

### Objectiu
Convertir l'àudio del ple en text segmentat, temporalitzat i utilitzable.

### Enfoc recomanat
Pipeline ASR per segments temporals, preparat per català i contingut mixt català/castellà.

### Sortida mínima exigible
- text complet de transcripció,
- segments temporals (`start`, `end`),
- confiança per segment o global,
- idioma detectat,
- diarització bàsica si el motor la suporta,
- marques d'incidència (`inaudible`, `aplaudiments`, `riures`, `soroll`, etc.) si es poden obtenir.

### Artefacte recomanat
Capa persistent de transcripció associada al vídeo.

Camps mínims proposats:
- `video_source_id`
- `transcript_status` (`pending`, `processing`, `needs_review`, `approved_for_analysis`, `approved_limited`, `rejected`)
- `transcript_text_raw`
- `transcript_text_normalized`
- `transcript_segments_json`
- `asr_provider`
- `asr_model`
- `detected_language`
- `confidence_avg`
- `diarization_available`
- `num_segments`
- `transcribed_at`

### Regles operatives
- Segmentar per blocs manejables per permetre reintents parcials.
- Conservar sempre la transcripció crua original a més de qualsevol versió corregida.
- Si el motor retorna diarització, no assumir que la identitat del speaker és exacta; usar-la com a ajuda.
- No usar una transcripció crua directament en tendències sense QA.

## 3) Revisió i control de qualitat

### Objectiu
Validar que la transcripció té prou qualitat abans d'usar-la en tendències i altres capes analítiques.

### Revisió automàtica
Checks mínims:
- cobertura temporal de l'àudio útil,
- percentatge de segments buits o inintel·ligibles,
- densitat de text per minut,
- confiança mitjana de transcripció,
- coherència bàsica entre durada i volum de text,
- detecció de repeticions absurdes o timestamps trencats.

### Revisió humana assistida
Aplicable quan:
- la confiança cau en franja intermèdia,
- hi ha noms propis/partits mal reconeguts,
- el ple és rellevant políticament,
- hi ha discrepàncies clares entre vídeo i acta,
- el sistema no pot vincular de forma robusta el vídeo a la sessió correcta.

### Tasques de QA editorial
- validar que el vídeo correspon al ple i a la data correcta,
- corregir fragments crítics amb baixa confiança,
- confirmar o ajustar idioma i normalització de noms propis,
- marcar trams no útils,
- decidir cobertura real: complet, quasi complet, parcial o invàlid.

### Estats finals de QA
- `approved_for_analysis`
- `approved_limited`
- `needs_manual_review`
- `rejected_for_analysis`

### Política d'ús
- `approved_for_analysis`: entra a analítica i scoring sense restriccions addicionals.
- `approved_limited`: es pot usar per exploració interna o amb pes reduït.
- `needs_manual_review` i `rejected_for_analysis`: no han d'alimentar tendències ni ranking principal.

## 4) Segmentació analítica

### Objectiu
Dividir la transcripció aprovada en unitats útils per a extracció de temes.

### Unitats suggerides
- bloc temporal fix si no hi ha estructura millor,
- intervenció per parlant si la diarització és acceptable,
- punt de l'ordre del dia si es pot alinear amb acta o agenda,
- episodi temàtic detectat per canvi d'assumpte.

### Recomanació de disseny
Prioritzar una segmentació híbrida:
1. alinear amb ordre del dia quan existeixi,
2. dins de cada punt, segmentar per intervenció o subtema,
3. si no existeix estructura fiable, usar finestres temporals amb resum temàtic.

## 5) Extracció i assimilació de temes

### Objectiu
Convertir la transcripció aprovada en senyals temàtics comparables amb actes, premsa i xarxes.

### Procés recomanat
1. Normalització del text transcrit.
2. Segmentació semàntica per intervenció, bloc temporal o punt de l'ordre del dia.
3. Classificació temàtica amb la mateixa taxonomia usada a `puntos_pleno.tema` sempre que sigui possible.
4. Extracció d'evidències per tema:
   - fragments,
   - timestamps,
   - speaker si existeix,
   - score de confiança.
5. Generació d'un senyal agregat per ple i per tema.

### Sortides esperades
Per cada segment o fragment temàtic:
- `tema_canonico`
- `subtema`
- `keywords`
- `resumen`
- `partidos_mencionados`
- `personas_mencionadas`
- `tono_debate` o intensitat
- `evidencia_textual`
- `timestamp_inicio`
- `timestamp_fin`
- `speaker_label` si existeix
- `confidence_topic_extraction`
- `source_type = pleno_video`

## 6) Publicació interna i assimilació amb dades existents

### Objectiu
Fusionar la nova font amb actes, Parlament, premsa i social sense duplicar artificialment el pes del mateix debat.

### Regles proposades
1. **No substituir l'acta**: vídeo i acta conviuen com a fonts diferenciades.
2. **Linkatge per esdeveniment**: si hi ha `acta_id` del mateix ple, associar el vídeo a aquell esdeveniment.
3. **Deduplicació semàntica**: si un tema ja surt a l'acta del mateix dia/ple, el vídeo no ha de comptar com un nou tema independent, sinó com un reforç de cobertura, intensitat i evidència.
4. **Traçabilitat completa**: cada score o tema ha d'indicar si prové d'acta, vídeo, premsa, social o combinació.

---

## Connexió amb tendències

## Principi general
La senyal de vídeo ha d'entrar com una **nova dimensió interna** del càlcul de tendències, separada de:
- mencions en actes (`puntos_pleno`),
- sessions del Parlament,
- senyals mediàtics externs (`temas_trend_signals`).

No s'ha de barrejar opacament dins del `count`; ha de quedar traçable com a component propi.

## Estat actual observat al codi
A `api/src/routes/dashboard.py`, `GET /dashboard/temas` calcula avui un `trend_score` amb aquests pesos:
- 45% mencions en actes
- 30% premsa
- 20% xarxes
- 5% altres senyals

## Evolució proposada quan existeixi la font vídeo
Proposta conceptual inicial:
- 35% mencions en actes
- 25% vídeo de ple
- 25% premsa
- 10% xarxes
- 5% altres senyals

Aquesta distribució és orientativa i s'hauria de validar quan hi hagi cobertura real de vídeos.

### Raonament
- el vídeo aporta la intensitat real del debat institucional,
- no ha de desplaçar completament les actes perquè la seva fiabilitat documental continua sent superior,
- el pes mediàtic continua sent necessari pel criteri estratègic demanat al brief.

## Senyal de vídeo recomanada
Per cada `tema_canonico`, calcular com a mínim:
- `video_mentions_count`
- `video_minutes_covered`
- `video_source_count`
- `video_quality_weighted_score`
- `video_recency_score`
- `video_municipalities_count`

### Fórmula conceptual suggerida

```text
video_signal = normalized(video_mentions_count,
                          video_minutes_covered,
                          video_source_count)
               * quality_factor
               * recency_factor
```

On:
- `quality_factor` penalitza transcripcions parcials o amb QA limitada,
- `recency_factor` prioritza plens recents.

## Salvaguarda clau: evitar doble recompte
Com que acta i vídeo pertanyen sovint a la mateixa sessió, hi ha risc d'inflar un tema dues vegades.

### Regla proposada
- considerar acta i vídeo com dues vistes d'una mateixa sessió,
- no sumar sense control ambdós comptatges bruts,
- usar el vídeo com a reforç de cobertura, intensitat i evidències, no com a duplicat literal de menció.

### Estratègia pràctica
- agrupar per un identificador comú de sessió (`session_source_group_id` o equivalent futur),
- si existeixen acta i vídeo vinculats al mateix ple:
  - l'acta aporta estructura institucional,
  - el vídeo aporta profunditat, durada, to i omissions detectades.

## Consum a dashboard
- El dashboard pot consumir els temes enriquits per vídeo dins del bloc de tendències.
- **No** s'ha de reintroduir `intel stream` com a bloc separat.
- Si en un futur es mostren evidències, s'haurien de presentar com a “discutit al ple” amb timestamps traçables.

---

## Connexió amb intel

## Estat actual observat al codi
A `api/src/routes/intel.py`, `GET /intel/tendencias` llegeix avui `v_tendencias_emergentes`.

## Paper de la nova font
Intel ha de consumir la font `pleno_video` com a material analític de suport per a:
- detectar narratives emergents,
- recuperar fragments del ple amb timestamps,
- contrastar el discurs institucional de l'acta amb el discurs oral del vídeo,
- identificar temes amb alt potencial de seguiment.

## Artefactes reutilitzables per intel
- segments amb tema i resum,
- evidències textuals amb timestamps,
- noms d'actors mencionats,
- intensitat o conflicte del debat,
- diferències entre vídeo i acta si existeixen.

## Separació de responsabilitats
- **Tendències**: ranking i senyal agregada.
- **Intel**: exploració, context, clipping narratiu i seguiment qualitatiu.

La mateixa font alimenta ambdós casos, però amb sortides diferents.

---

## Criteris mínims de qualitat per usar transcripcions en anàlisi

Una transcripció només ha d'entrar en anàlisi si compleix un mínim operatiu. No cal perfecció, però sí fiabilitat suficient.

## Umbrals mínims recomanats

### 1. Cobertura temporal
- Ha de cobrir com a mínim el **80% de la durada útil** del ple.
- Si falta el bloc central on es discuteixen els temes substantis, no s'aprova.

### 2. Intel·ligibilitat general
- S'ha de poder entendre el tema principal de la majoria de segments rellevants.
- Si el text acumula massa buits, repeticions o soroll i no permet identificar assumptes, s'ha de rebutjar.

### 3. Confiança del motor
- Ha d'existir una confiança mitjana mínima per transcripció o per segment.
- Recomanació inicial:
  - aprovació automàtica només si `confidence_avg >= 0.75`,
  - revisió obligatòria si cau en franja intermèdia,
  - rebuig si queda per sota del llindar crític definit operativament.

### 4. Noms propis i entitats polítiques
- Partits, càrrecs i conceptes institucionals clau no poden aparèixer sistemàticament corromputs.
- Si sigles com `PSC`, `ERC`, `AC` o noms d'alcaldia/concejalia es trenquen sovint, no s'ha d'usar automàticament per a temes sensibles.

### 5. Alineació sessió ↔ vídeo
- La data, municipi i sessió han de ser coherents amb el vídeo processat.
- Si no es pot vincular amb seguretat raonable al ple correcte, no passa a tendències.

### 6. Traçabilitat
- Tot tema extret ha de poder remuntar-se a:
  - vídeo origen,
  - tram temporal,
  - segment textual concret.

### 7. Estat editorial final
Només usar transcripcions amb estat final:
- `approved_for_analysis`, o
- `approved_limited` limitat a usos compatibles i amb pes reduït.

## Criteris de rebuig o ús limitat
- Àudio molt deficient o amb eco/música constants.
- ASR amb noms propis destruïts de manera sistemàtica.
- Ple incomplet o vídeo tallat.
- Desfase clar entre metadades i contingut real.
- Detecció temàtica sense cites suport.

## Política de degradació
Quan no s'assoleixi qualitat plena:
- permetre `approved_limited` només per exploració interna,
- reduir el pes a un màxim del 25% de la senyal vídeo normal,
- excloure del ranking principal si falten timestamps o revisió.

---

## Model de dades orientatiu per a una futura implementació

Sense fixar encara la migració SQL final, la següent iteració hauria d'incorporar entitats equivalents a:
- `pleno_video_sources`
- `pleno_video_assets`
- `pleno_video_transcripts`
- `pleno_video_review_tasks`
- `pleno_video_segments`
- `pleno_video_topics`
- `tema_video_signals`

## Encaix amb l'arquitectura existent

### Pipeline
L'encaix natural és a `pipeline/`:
- `pipeline/src/ingesta/`: descobriment i captura de fonts de vídeo,
- mòdul de preparació d'àudio: extracció i normalització,
- `pipeline/src/llm/` o capa específica: classificació temàtica i assimilació,
- `pipeline/src/workers/`: cues, reintents i priorització.

### API
- `api/src/routes/dashboard.py`: lectura futura del score enriquit per vídeo.
- `api/src/routes/intel.py`: lectura o consulta de segments i senyals derivats per anàlisi.

### Base de dades
La integració recomanada és via taules/vistes agregades intermèdies, no connectant transcripció crua directament als endpoints finals.

---

## Ordre recomanat d'implementació futura

### Fase 1 — Base operativa mínima
- registrar fonts de vídeo,
- descarregar àudio,
- generar transcripció crua,
- guardar mètriques de qualitat,
- habilitar una revisió bàsica.

### Fase 2 — QA i aprovació
- flux `needs_review / approved / rejected`,
- correccions lleugeres de noms propis,
- mostreig humà per segments.

### Fase 3 — Temes i scoring
- classificar temes amb taxonomia comuna,
- crear agregats per tema,
- afegir la senyal vídeo al ranking de tendències.

### Fase 4 — Explotació analítica
- cerca per timestamps,
- comparació acta vs vídeo,
- resums i insights per intel.

---

## Riscos i mitigacions

### Risc 1 — ASR insuficient en català local o àudio deficient
Mitigació:
- usar un proveïdor ASR fort en multilingüe,
- revisar mostres,
- condicionar el pes a la qualitat.

### Risc 2 — Cost de vídeos llargs
Mitigació:
- processar àudio comprimit,
- segmentar per lots,
- prioritzar municipis i sessions estratègiques.

### Risc 3 — Desalineació entre taxonomia de vídeo i taxonomia d'actes
Mitigació:
- reutilitzar `puntos_pleno.tema` com a base,
- mantenir un mapatge d'equivalències per a nous temes.

### Risc 4 — Duplicats del mateix ple
Mitigació:
- deduplicació per metadades canòniques + checksum,
- una sola font primària per sessió.

---

## Traçabilitat amb la checklist del brief

### 1) Definir etapes: captura de vídeo, transcripción, revisión y extracción de temas
Cobert a:
- `## 1) Captura de vídeo i preparació del mitjà`
- `## 2) Transcripció`
- `## 3) Revisió i control de qualitat`
- `## 5) Extracció i assimilació de temes`

### 2) Especificar cómo se conectará esta fuente con tendencias e intel
Cobert a:
- `## Connexió amb tendències`
- `## Connexió amb intel`
- `## Encaix amb l'arquitectura existent`

### 3) Documentar criterios mínimos de calidad para usar transcripciones en análisis
Cobert a:
- `## Criteris mínims de qualitat per usar transcripcions en anàlisi`

---

## Preguntes obertes per a implementació futura

- Quin proveïdor ASR es prioritzarà finalment per català institucional?
- La diarització serà part del MVP o millora posterior?
- La revisió humana viurà en una UI pròpia o en una operativa externa?
- Quin pes exacte tindrà la senyal vídeo dins del scoring final quan hi hagi dades reals?
- La persistència de la senyal per tema serà una vista materialitzada, una taula append-only o càlcul sota demanda?

## Resum executiu

Disseny tancat a nivell conceptual:
- etapes definides: captura, transcripció, revisió i extracció/assimilació,
- integració definida amb tendències i intel,
- criteris mínims de qualitat definits,
- restricció de producte explícita: la nova font no reintrodueix `intel stream` al dashboard.
