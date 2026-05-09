# SPEC — Regidors

## 2026-05-09 — Patró de divergència per vot en regidors

### Context i objectiu
Aquesta especificació defineix la lògica base per detectar **divergències de regidors** en el mòdul de regidors a `https://politica.factoriaia.com/regidors`, centrant-se en dos eixos:
1. **Vots contraris al grup o a les seves premisses**.
2. **Comentaris i argumentaris contraris o diferents** del que marca la regla d'autoritat carregada al sistema.

La tasca es tracta com a **EXPLORACIÓ/DISSENY**: no s'han introduït canvis a codi de producció ni a l'esquema de base de dades. L'objectiu és deixar una base operativa i traçable per a una implementació posterior.

---

### Fonts reals auditades al repositori

#### Esquema i dades disponibles
1. `supabase/migrations/001_schema.sql`
   - `cargos_electos`: catàleg de regidors/càrrecs electes.
   - `puntos_pleno`: punts del ple amb `tema`, `subtema`, `resultado`, `resumen`, `fecha`.
   - `votaciones`: sentit del vot (`a_favor`, `en_contra`, `abstencion`) amb `cargo_electo_id`, `partido`, `nombre_raw`.
   - `argumentos`: argumentari associat al punt amb `partido`, `posicion`, `argumento`.
   - `linea_partido`: base actual de “regla d'autoritat”/línia oficial per tema i subtema amb `posicion`, `descripcion`, `keywords`, vigència temporal.
   - `alertas`: taula objectiu natural per futures deteccions.
   - vista `coherencia_concejales`: indicador agregat de coherència existent.

2. `supabase/migrations/009_ranking_concejales_party_match.sql`
   - Documenta una limitació crítica: **actualment moltes actes registren el sentit del vot a nivell de partit, no necessàriament per regidor nominal**.
   - La migració explicita que mentre no hi hagi vot nominal fiable, la divergència individual queda infrarepresentada.

#### Rutes i comportament observats
3. `api/src/routes/dashboard.py`
   - Usa la vista `coherencia_concejales` com a resum agregat.
   - Confirma que la coherència actual està pensada sobretot com a lectura de votacions i alertes.

4. `api/src/routes/alertas.py`
   - Mostra que el detall d'una alerta pot carregar `votaciones` i `argumentos` d'un `punto_id`.
   - Confirma que una detecció futura hauria d'acabar, previsiblement, en `alertas` amb context navegable.

5. `docs/ESTRATEGIA_DATOS.md`
   - Defineix el model conceptual de coherència: comparar votacions, buscar línia oficial i contextualitzar amb arguments.
   - També anticipa que la comparabilitat no és binària i que el context importa.

---

## 1) Fonts que s'usaran per inferir la posició del grup

Per identificar si un regidor divergeix, cal construir abans la **posició esperada del grup**. La inferència es farà amb una jerarquia de fonts, de més autoritativa a menys.

### 1.1 Font A — `linea_partido` (autoritat explícita)
És la font principal i amb més pes. S'utilitza quan hi ha una regla vigent aplicable al `tema`/`subtema` del punt.

**Camp base:**
- `tema`
- `subtema`
- `posicion`
- `descripcion`
- `keywords`
- `vigente_desde`
- `vigente_hasta`

**Interpretació:**
- Si existeix una entrada vigent i específica per `tema + subtema`, aquesta és la postura canònica del grup.
- Si no existeix per `subtema` però sí per `tema`, s'aplica la de `tema` com a regla general.
- Si la `posicion = 'libre'`, no es pot marcar divergència automàtica per vot; només es podria marcar desalineació argumental forta si el discurs contradiu una premissa explícita de `descripcion` o `keywords`.

### 1.2 Font B — Vot majoritari del partit en el mateix punt (`votaciones`)
Quan `linea_partido` no existeix o no és concloent, s'infereix la posició del grup a partir del **sentit majoritari del mateix partit en aquell `punto_id`**.

**Ús previst:**
- Casos amb vot nominal de diversos regidors del mateix partit.
- Casos on el sistema disposa del `cargo_electo_id` individual i hi ha diferència observable.

**Regla:**
- Si el mateix partit té una majoria clara en un sentit (`a_favor`, `en_contra`, `abstencion`) i un regidor vota diferent, això és divergència respecte del grup local en aquell punt.
- Si només hi ha una línia agregada per partit i no per regidor, **no es pot inferir divergència individual**.

### 1.3 Font C — Patró històric del partit en punts comparables
Si no hi ha regla explícita ni vot majoritari suficient en el mateix punt, es pot usar un patró històric del partit en punts comparables.

**Inputs disponibles avui:**
- `puntos_pleno.tema`
- `puntos_pleno.subtema`
- `argumentos.posicion`
- `votaciones.sentido`
- `puntos_pleno.fecha`

**Regla:**
- Es consideren comparables punts del mateix `tema` i, idealment, `subtema`, dins una finestra temporal limitada.
- Aquesta font només serveix com a **evidència auxiliar**, no com a regla absoluta, perquè `docs/ESTRATEGIA_DATOS.md` ja adverteix que dos punts del mateix tema poden tenir contextos polítics diferents.

### 1.4 Font D — Argumentari del partit al mateix punt (`argumentos`)
Els `argumentos` no defineixen per si sols la línia oficial, però sí serveixen per:
- reforçar la postura inferida,
- detectar contradicció discursiva,
- o reduir confiança si el discurs disponible és ambigu.

**Jerarquia final recomanada**
1. `linea_partido` vigent i específica.
2. Vot majoritari del partit en el mateix `punto_id`.
3. Patró històric comparable del partit.
4. Argumentari com a reforç/contradicció contextual, no com a font única de postura oficial.

---

## 2) Regles per detectar vot contrari o inconsistent

### 2.1 Precondició: determinar si el cas és avaluable
Abans de marcar divergència, el sistema ha de classificar cada cas en una de tres categories:
- **Avaluable**: hi ha postura esperada suficientment clara.
- **Ambigu**: hi ha senyals però no prou concloents.
- **No avaluable**: falten dades o el cas està fora de regla.

Només els casos **avaluables** poden generar divergència automàtica d'alta confiança.

### 2.2 Normalització base del sentit del vot
Per a la primera versió, el domini de comparació és exactament el que existeix a `votaciones.sentido`:
- `a_favor`
- `en_contra`
- `abstencion`

No s'ha d'inventar cap quarta categoria si encara no existeix al model actual.

### 2.3 Regla R1 — Vot contrari a la línia oficial explícita
**Condició:**
- Existeix `linea_partido` vigent aplicable.
- La línia fixa una `posicion` concreta diferent de `libre`.
- Existeix vot individual fiable del regidor (`votaciones.cargo_electo_id` o correspondència nominal fiable).
- El `sentido` del regidor és diferent de la `posicion` oficial.

**Resultat:**
- Marcar com `divergencia_voto_linea_oficial`.
- Severitat base: **alta**.

**Exemples:**
- Línia oficial: `tema=hacienda`, `subtema=modificacio_pressupostaria`, `posicion='en_contra'`.
- Regidor vota `a_favor` → divergència alta.

### 2.4 Regla R2 — Abstenció inconsistent respecte a una línia forta
**Condició:**
- Existeix `linea_partido` vigent amb `posicion` forta (`a_favor` o `en_contra`).
- El regidor vota `abstencion`.

**Resultat:**
- Marcar com `divergencia_voto_abstencion`.
- Severitat base: **mitjana**, escalable a **alta** si la `descripcion` o les `keywords` indiquen que el tema és estratègic/no lliure.

**Racional:**
L'abstenció no és simètrica amb un vot oposat, però sí pot ser una desalineació política rellevant.

### 2.5 Regla R3 — Vot contrari al grup local en el mateix punt
**Condició:**
- No hi ha línia oficial concloent.
- Hi ha votacions nominals de més d'un representant del mateix partit al mateix `punto_id`.
- Hi ha majoria clara d'un sentit i un regidor vota diferent.

**Resultat:**
- Marcar com `divergencia_voto_grupo_local`.
- Severitat base: **mitjana**.

**Exemple:**
- 3 regidors del partit: 2 voten `en_contra`, 1 vota `a_favor`.
- El vot `a_favor` divergeix del grup local.

### 2.6 Regla R4 — Vot inconsistent amb el patró històric, però sense autoritat explícita
**Condició:**
- No hi ha `linea_partido` aplicable.
- No hi ha majoria local suficient.
- El vot del regidor és contrari a un patró històric fort del partit en punts comparables.

**Resultat:**
- **No** marcar com a divergència confirmada automàtica.
- Marcar com `senal_revision_inconsistencia_historica` o alerta de revisió humana.
- Severitat base: **baixa** o `review_required`.

**Racional:**
Aquesta regla és útil per a descobriment, però no hauria de condemnar automàticament un cas sense suport autoritatiu o contextual suficient.

### 2.7 Regla R5 — Inconsistència entre vot i argumentari del mateix regidor o partit
**Condició:**
- Hi ha `argumentos` associats al punt.
- L'argumentari atribuït al partit/regidor defensa una postura que no correspon al sentit del vot registrat.

**Resultat:**
- Marcar com `inconsistencia_voto_argumentario`.
- Severitat base: **mitjana**.

**Exemples:**
- Argument: “ens oposem a la pujada de despesa per manca de transparència”.
- Vot registrat: `a_favor`.
- Això indica o bé divergència real, o bé problema d'extracció/atribució, i per tant necessita revisió.

---

## 3) Regles per detectar comentaris o argumentaris contraris a la regla d'autoritat

Aquesta capa no compara només el `sentido` del vot, sinó el **discurs** registrat a `argumentos.argumento` i la seva `posicion`.

### 3.1 Font discursiva mínima disponible avui
L'única font estructurada observable al model actual és `argumentos`:
- `partido`
- `posicion`
- `argumento`

No s'observen encara taules específiques d'intervencions nominals llargues de regidors; per tant, la primera definició ha de partir d'aquesta estructura.

### 3.2 Regla A1 — Argumentari amb posició explícitament oposada a `linea_partido`
**Condició:**
- Existeix `linea_partido` vigent.
- Existeix `argumentos.posicion` del mateix partit/regidor.
- `argumentos.posicion` és l'oposada a la `linea_partido.posicion`.

**Resultat:**
- Marcar com `divergencia_argumental_posicion`.
- Severitat base: **alta** si l'atribució és fiable; **mitjana** si l'argument només està agregat a nivell de partit.

### 3.3 Regla A2 — Argumentari no oposat, però contrari a les premisses de la línia
**Condició:**
- La `posicion` pot coincidir formalment amb la línia.
- Però el text de `argumento` nega, desautoritza o desplaça una premissa central de `linea_partido.descripcion` o de `linea_partido.keywords`.

**Exemple conceptual:**
- Línia oficial: votar `en_contra` perquè “falta seguretat jurídica i incrementa pressió fiscal”.
- Argumentari extret: votar `en_contra` “només per tacticisme de negociació” o perquè “la mesura és massa moderada”.

**Resultat:**
- Marcar com `divergencia_argumental_premisas`.
- Severitat base: **mitjana**.
- Sempre recomanable revisió humana, perquè aquesta regla requereix interpretació semàntica.

### 3.4 Regla A3 — Comentari diferent però compatible
**Condició:**
- L'argumentari no replica literalment la línia oficial, però tampoc la contradiu.
- Aporta matís local, ordre diferent de prioritats o justificació complementària.

**Resultat:**
- **No** marcar divergència.
- Opcionalment etiquetar com `variacion_argumental_compatible` per analytics, però no com a alerta negativa.

### 3.5 Regla A4 — Absència d'argumentari
**Condició:**
- No hi ha `argumentos` al punt o no se n'ha pogut atribuir cap al partit/regidor.

**Resultat:**
- No es pot avaluar divergència discursiva.
- Classificar com `no_evaluable_argumental`.

---

## 4) Casos ambigus i tractament d'excepcions

### 4.1 Limitació estructural actual: vot a nivell de partit, no de regidor
La migració `009_ranking_concejales_party_match.sql` ja adverteix que moltes actes només registren el sentit del vot del partit.

**Tractament:**
- Si el vot no és nominal, **no marcar divergència individual de regidor**.
- Sí es pot marcar, en futur, una desviació del grup/partit a nivell agregat, però no atribuir-la a un càrrec concret.

### 4.2 `linea_partido.posicion = 'libre'`
Quan el partit ha declarat llibertat de vot:
- No hi ha divergència automàtica de vot per discrepància de sentit.
- Només es podria registrar observació discursiva si un argumentari ataca frontalment una premissa doctrinal carregada al sistema, i això hauria de quedar com a revisió humana.

### 4.3 Absència de línia oficial i absència de majoria local
Si no hi ha ni línia ni grup comparable en el punt:
- No fer inferència forta.
- Com a màxim, generar senyal feble basada en històric comparable.

### 4.4 Empat dins del grup local
Si dos o més regidors del mateix partit es reparteixen en sentits diferents sense majoria clara:
- No marcar “contrari al grup” automàtic.
- Marcar `grupo_local_dividido` com a cas especial.
- Prioritzar revisió humana i context.

### 4.5 Canvi de línia per vigència temporal
La `linea_partido` té `vigente_desde` i `vigente_hasta`.

**Tractament:**
- La comparació s'ha de fer amb la línia vigent a la data del `puntos_pleno.fecha`.
- Un vot contrari a la línia actual no és divergència si en la data del ple la regla vigent era una altra.

### 4.6 Errors d'extracció o atribució de noms
Com que existeixen `nombre_raw` a `votaciones` i `cargo_electo_id` opcional:
- Si la correspondència amb el càrrec és feble o absent, no generar alerta individual d'alta confiança.
- El cas ha de quedar en cua de reconciliació o revisió.

### 4.7 Abstenció tècnica o absència física
El model actual només reflecteix `abstencion`; no diferencia:
- abstenció política,
- abstenció tècnica,
- absència,
- incompatibilitat/conflicte d'interès.

**Tractament:**
- No assumir sempre que l'abstenció és dissidència forta.
- Per defecte, severitat mitjana o baixa, mai alta sense context addicional.

### 4.8 Punts de procediment o baixa càrrega política
`docs/ESTRATEGIA_DATOS.md` i `dashboard.py` ja aïllen sovint els casos de `procedimiento`.

**Tractament:**
- Els punts purament procedimentals o de tràmit no haurien de tenir el mateix pes que un punt substantiu.
- Recomanació: excloure'ls de divergència alta excepte si hi ha una `linea_partido` explícita sobre aquell cas.

---

## 5) Model de decisió recomanat per a futura implementació

### 5.1 Sortida mínima per cada cas analitzat
Per cada vot/argument avaluat, la detecció hauria de produir com a mínim:
- `evaluation_status`: `evaluable` | `ambiguo` | `no_evaluable`
- `expected_source`: `linea_partido` | `grupo_local` | `historico` | `none`
- `expected_position`
- `observed_vote`
- `observed_argument_position`
- `divergence_type`
- `severity`
- `confidence`
- `needs_human_review`
- `evidence_refs` (ids de `linea_partido`, `punto_id`, `votaciones.id`, `argumentos.id`)

### 5.2 Escala de confiança recomanada
- **Alta**: línia oficial vigent + vot nominal fiable.
- **Mitjana**: grup local clar + atribució raonable + context consistent.
- **Baixa**: patró històric o contradicció semàntica sense suficient suport estructurat.

### 5.3 Tipus de divergència suggerits
- `divergencia_voto_linea_oficial`
- `divergencia_voto_abstencion`
- `divergencia_voto_grupo_local`
- `inconsistencia_voto_argumentario`
- `divergencia_argumental_posicion`
- `divergencia_argumental_premisas`
- `grupo_local_dividido`
- `senal_revision_inconsistencia_historica`
- `no_evaluable_argumental`

---

## 6) Criteris d'acceptació per a la futura implementació

La implementació podrà considerar-se alineada amb aquesta spec si compleix:
1. Determina la postura esperada amb jerarquia explícita de fonts.
2. No atribueix divergència individual quan només existeix vot agregat per partit.
3. Distingeix entre vot contrari, abstenció inconsistent i senyal històrica feble.
4. Diferencia divergència de vot i divergència argumental.
5. Respecta vigència temporal de `linea_partido`.
6. Marca casos ambigus/no avaluables en lloc de forçar classificacions.
7. Deixa traçabilitat d'evidències per revisar cada alerta.

---

### Arxius modificats
- `specs/regidors/SPEC.md` (nou): definició del patró de divergència per vot i argumentari en regidors.

### Decisions tècniques
- Tasca resolta com a **exploració** per coherència amb el brief (“definir”, “dissenyar”, “revisar patró”).
- No s'han tocat `api/`, `web/`, `pipeline/` ni `supabase/migrations/` perquè el lliurable demanat és una definició lògica base, no una implementació runtime.
- La spec assumeix el model real existent i documenta explícitament la principal limitació actual: la manca generalitzada de vot nominal fiable per regidor.
- La detecció de “premisses contràries” queda definida com a capa semàntica de revisió assistida, no com a regla 100% deterministicament resolta amb l'esquema actual.

---

## 2026-05-09 — Patró de divergència per comentaris i argumentaris

### Context i objectiu
Aquesta ampliació de la spec defineix **com detectar comentaris, intervencions breus o argumentaris contraris o diferents** respecte de la **regla d'autoritat** carregada al sistema. El focus no és el vot en si, sinó la **desalineació semàntica** entre el discurs observat i la posició oficial/premisses del partit.

La tasca continua sent **EXPLORACIÓ/DISSENY**. No s'han modificat rutes, models, pipelines ni migracions; només s'ha formalitzat el patró de detecció i els seus umbrals explicables perquè una implementació futura pugui ser auditable.

---

### Fonts reals auditades per a aquesta definició

#### Esquema disponible
1. `supabase/migrations/001_schema.sql`
   - `linea_partido`: font de veritat explícita amb `tema`, `subtema`, `posicion`, `descripcion`, `keywords`, `vigente_desde`, `vigente_hasta`.
   - `argumentos`: text observable avui amb `partido`, `posicion`, `argumento` per `punto_id`.
   - `puntos_pleno`: context del punt (`tema`, `subtema`, `titulo`, `resumen`, `fecha`).
   - `alertas`: destí natural per a una futura detecció persistent i explicable.

#### Comportament del producte i context operatiu
2. `api/src/routes/alertas.py`
   - El detall d'una alerta ja retorna `votaciones` i `argumentos` del `punto_id`.
   - Això implica que qualsevol futura detecció argumental hauria d'arribar amb evidència suficient per explicar **quin text** ha divergit i **contra quina regla**.

3. `docs/ESTRATEGIA_DATOS.md`
   - Ja apunta a comparacions de coherència no binàries i a l'ús de similitud de context.
   - També separa l'argumentari del sentit formal del vot, cosa coherent amb aquesta definició de divergència semàntica.

#### Limitació observada
4. No s'han trobat al model actual taules específiques de transcripció llarga nominal per regidor.
   - Per tant, aquesta spec assumeix que la primera iteració operarà sobretot sobre `argumentos.argumento` i, si més endavant hi ha comentaris nominals o corpus RAG estructurat, el mateix patró es podrà ampliar sense canviar la lògica central.

---

## 1) Representació de la regla d'autoritat com a font de veritat

La detecció semàntica només és fiable si la postura oficial no es tracta com un bloc de text difús, sinó com una **unitat canònica comparable**.

### 1.1 Unitat canònica: `authority_rule`
Cada entrada de `linea_partido` s'ha de projectar lògicament a una unitat semàntica estructurada:
- `rule_id`
- `tema`
- `subtema`
- `posicion_oficial`
- `premisa_central`
- `premisas_secundarias[]`
- `keywords[]`
- `scope_temporal`
- `priority`

Aquesta projecció no exigeix una migració nova immediata: és una **representació lògica** que es pot construir en runtime a partir dels camps existents.

### 1.2 Com derivar `premisa_central` i `premisas_secundarias`
Atès que avui `linea_partido` només té `descripcion` i `keywords`, la representació inicial ha de seguir aquest criteri:
- `premisa_central`: la frase principal de `descripcion` que justifica la `posicion`.
- `premisas_secundarias`: altres motius explícits dins de `descripcion` o expansions derivades de `keywords`.
- `keywords`: marcadors lèxics, no prova concloent per si sols.

**Exemple lògic:**
- `posicion='en_contra'`
- `descripcion='Ens oposem perquè augmenta la pressió fiscal i no garanteix seguretat jurídica.'`
- `premisa_central='La proposta augmenta la pressió fiscal sense garanties suficients.'`
- `premisas_secundarias=['Falta seguretat jurídica', 'La mesura no està prou justificada']`

### 1.3 Nivell d'autoritat i prioritat
Quan hi ha diverses regles potencialment aplicables, la comparació semàntica ha d'usar **una sola regla dominant** segons aquest ordre:
1. `tema + subtema` vigent a la data del punt.
2. `tema` vigent a la data del punt.
3. Si no existeix, no hi ha font autoritativa suficient i el cas queda com `no_evaluable_authority_rule`.

### 1.4 Cas especial: posició `libre`
Si `linea_partido.posicion = 'libre'`:
- no s'ha de marcar divergència formal per diferència de postura;
- només es pot marcar **fricció argumental** si el comentari contradiu una premissa doctrinal explícita carregada al sistema;
- aquesta detecció sempre ha de sortir amb `needs_human_review = true`.

---

## 2) Representació del comentari o argumentari observat

Per poder comparar, el text observat també s'ha d'estructurar en una unitat analítica mínima: `observed_statement`.

### 2.1 Unitat `observed_statement`
Per cada `argumentos.argumento` —o futur comentari/intervenció— es recomana derivar:
- `source_type`: `argumento_partido` | `comentario_regidor` | `intervencion` | `otra_fuente`
- `source_id`
- `punto_id`
- `partido`
- `speaker_id` (si existeix)
- `observed_position`
- `claim_segments[]`
- `tema` / `subtema`
- `statement_date`

### 2.2 Segmentació del text en claims comparables
La comparació no s'ha de fer només sobre el text complet, sinó sobre fragments amb càrrega semàntica pròpia:
- una afirmació causal;
- una justificació normativa;
- una crítica explícita;
- una prioritat política declarada.

**Exemple:**
`"Hi votem en contra perquè és massa tou amb l'ocupació i perquè arriba tard."`

Claims derivats:
1. `La proposta és massa tova amb l'ocupació.`
2. `La proposta arriba tard.`
3. `El motiu del vot és insuficiència de duresa/rapidesa.`

### 2.3 Direcció del claim
Cada claim ha d'intentar etiquetar-se amb una direcció mínima:
- `supporting`
- `opposing`
- `mixed`
- `unclear`

Això permet distingir entre un comentari crític però alineat amb la línia i un comentari realment contrari.

---

## 3) Pipeline recomanat de comparació semàntica

La detecció de divergència argumental ha de ser multietapa. No n'hi ha prou amb embeddings sols ni amb coincidència de keywords.

### 3.1 Etapa 0 — Gate de comparabilitat
Abans de comparar semànticament:
1. validar que hi ha `authority_rule` vigent;
2. validar que el comentari pertany al mateix `tema`/`subtema` o al mateix `punto_id`;
3. descartar casos sense text suficient o sense atribució mínima.

Si alguna d'aquestes condicions falla, el resultat és `no_evaluable`.

### 3.2 Etapa 1 — Recuperació de premisses candidates
Per a cada `claim_segment`, recuperar les premisses de la regla més properes semànticament:
- `premisa_central`
- 0..n `premisas_secundarias`
- `keywords` només com a suport explicatiu

Mètode recomanat:
- embeddings per trobar proximitat temàtica;
- top-k petit (1-3 premisses);
- exclusió de matches febles fora de context.

### 3.3 Etapa 2 — Classificador de relació semàntica
Per a cada parell `(claim_segment, premisa_rule)` cal classificar la relació en una d'aquestes etiquetes:
- `entails` — el comentari reforça o replica la premissa oficial.
- `compatible` — no la replica literalment, però hi és coherent.
- `matizado` — introdueix matís sense negar la premissa.
- `drift` — canvia la justificació principal cap a un marc diferent.
- `contradicts` — nega o gira en sentit contrari la premissa oficial.
- `irrelevant` — sembla del mateix punt, però no parla realment de la premissa.
- `uncertain` — senyal insuficient o text ambigu.

### 3.4 Etapa 3 — Agregació per statement
Un comentari complet pot contenir claims compatibles i claims contradictoris alhora. Cal una agregació final amb pes:
- pes alt per contradicció de `premisa_central`;
- pes mitjà per contradicció de `premisas_secundarias`;
- pes baix per diferència només retòrica o de priorització.

### 3.5 Etapa 4 — Decisió final i explicabilitat
La sortida no ha de ser un score opac, sinó una classificació amb justificació:
- etiqueta final;
- claims conflictius;
- premisses afectades;
- intensitat de la divergència;
- confiança;
- si necessita revisió humana.

---

## 4) Taxonomia de resultats: què és contradicció i què és desviació

Per evitar falsos positius, la spec separa clarament diversos nivells de discrepància.

### 4.1 `alineado`
El comentari:
- defensa la mateixa posició;
- manté les mateixes premisses centrals;
- o bé introdueix reformulacions compatibles.

**No genera alerta.**

### 4.2 `matizado`
El comentari:
- manté la posició oficial;
- afegeix context local o subratlla una prioritat diferent;
- però no desautoritza la premissa central.

**No genera alerta negativa.**
Pot registrar-se com a variant compatible per analítica.

### 4.3 `ambiguous`
El text:
- és curt, el·líptic o ambigu;
- combina senyals compatibles i contradictoris sense predomini clar;
- o no permet saber si parla de la mateixa premissa.

**No genera alerta automàtica.**
Pot anar a revisió si el cas és sensible.

### 4.4 `divergente`
El comentari:
- manté potser la mateixa posició de vot formal,
- però canvia la justificació principal cap a un marc incompatible amb la regla d'autoritat,
- o desplaça la premissa central per una de diferent que altera el missatge polític.

**Exemple:**
La línia oficial rebutja una mesura per manca de control pressupostari, però l'argumentari observat la rebutja per ser massa moderada ideològicament. No és contradicció frontal de sentit, però sí desviació material del marc autoritzat.

### 4.5 `contradictorio`
El comentari:
- nega explícitament una premissa central de la regla;
- defensa una justificació oposada;
- o sosté una posició argumental incompatible amb `posicion_oficial`.

**Això sí és divergència forta** i és la categoria principal per alertes altes.

---

## 5) Umbrals inicials i senyals explicables

Els umbrals han de ser prou clars per poder explicar al reviewer o a l'usuari per què un cas ha estat marcat.

### 5.1 Senyals base per claim
Per cada claim comparat amb la premissa millor match:
- `semantic_similarity` (0-1)
- `relation_label` (`entails`, `compatible`, `matizado`, `drift`, `contradicts`, `irrelevant`, `uncertain`)
- `direction_conflict` (`true/false`)
- `premise_priority` (`central`/`secondary`)
- `position_conflict` (`true/false`) entre `observed_position` i `posicion_oficial`

### 5.2 Regla d'etiquetatge inicial per claim
**Claim contradictori fort** si es compleix una de les següents:
- `relation_label = contradicts` i `semantic_similarity >= 0.70`
- `position_conflict = true` i el claim justifica explícitament la posició oposada

**Claim divergent per drift** si:
- `relation_label = drift` i `semantic_similarity >= 0.65`
- no hi ha contradicció frontal, però el marc justificatiu principal és diferent

**Claim compatible/matitzat** si:
- `relation_label in (compatible, matizado, entails)`
- i no hi ha `direction_conflict`

### 5.3 Regla d'agregació per statement complet
**Etiqueta final `contradictorio`** si:
- hi ha almenys 1 claim contradictori contra `premisa_central`, o
- hi ha 2+ claims contradictoris contra premisses secundàries, o
- `observed_position` és oposada a `posicion_oficial` i el text la justifica explícitament.

**Etiqueta final `divergente`** si:
- no arriba a contradicció forta,
- però la major part del pes argumental està en claims `drift`, o
- el comentari substitueix la justificació autoritzada per una altra materialment diferent.

**Etiqueta final `matizado`** si:
- hi ha compatibilitat global,
- amb diferències de to, prioritat o detall local.

**Etiqueta final `ambiguous`** si:
- el resultat depèn d'un únic claim feble,
- la similitud és baixa,
- o hi ha senyals en conflicte sense predomini.

### 5.4 Confiança recomanada
- **Alta**: regla específica `tema+subtema`, text suficient, claim contradictori clar, atribució fiable.
- **Mitjana**: regla de `tema`, semàntica consistent però amb menys context o atribució agregada.
- **Baixa**: text curt, match semàntic fronterer, o manca d'atribució nominal.

### 5.5 Condició automàtica de revisió humana
Forçar `needs_human_review = true` quan:
- `linea_partido.posicion = 'libre'`
- només hi ha atribució agregada per partit i no per regidor
- el text conté ironia, dobles negacions o baixa claredat
- hi ha contradicció semàntica però `semantic_similarity < 0.70`
- la decisió final és `divergente` i no `contradictorio`

---

## 6) Exemples operatius

### Cas E1 — Alineat
**Regla d'autoritat**
- `posicion_oficial='en_contra'`
- `premisa_central='La proposta incrementa la pressió fiscal sense garanties.'`

**Argument observat**
- `"Hi votem en contra perquè puja impostos i no aporta garanties de control."`

**Resultat**
- `alineado`
- confiança alta
- sense alerta

### Cas E2 — Matisat però compatible
**Regla d'autoritat**
- `en_contra` per manca de transparència i impacte fiscal

**Argument observat**
- `"Hi votem en contra perquè el govern arriba tard i tampoc explica bé el cost real."`

**Resultat**
- `matizado`
- manté marc crític compatible
- sense alerta negativa

### Cas E3 — Divergent per canvi de marc
**Regla d'autoritat**
- `en_contra` per impacte fiscal i falta de garanties jurídiques

**Argument observat**
- `"Hi votem en contra perquè la proposta és massa tèbia i hauria de ser molt més dura."`

**Resultat**
- `divergente`
- no nega necessàriament el vot, però canvia materialment el marc autoritzat
- revisió humana recomanada

### Cas E4 — Contradictori fort
**Regla d'autoritat**
- `en_contra` perquè la mesura incrementa impostos i perjudica famílies

**Argument observat**
- `"En realitat aquesta pujada fiscal és positiva i necessària per reforçar serveis."`

**Resultat**
- `contradictorio`
- claim oposat a la premissa central
- alerta alta si l'atribució és fiable

### Cas E5 — Ambigu
**Argument observat**
- `"El tema és complex i caldrà seguir parlant-ne."`

**Resultat**
- `ambiguous`
- sense base suficient per a divergència
- no alerta automàtica

---

## 7) Sortida mínima recomanada per a una futura implementació

Per cada comentari o argument analitzat:
- `evaluation_status`: `evaluable` | `ambiguo` | `no_evaluable`
- `authority_rule_id`
- `authority_scope`: `tema_subtema` | `tema` | `none`
- `observed_source_type`
- `observed_source_id`
- `observed_position`
- `final_label`: `alineado` | `matizado` | `ambiguous` | `divergente` | `contradictorio`
- `confidence`: `alta` | `media` | `baja`
- `needs_human_review`
- `conflicting_claims[]`
- `matched_premises[]`
- `explanation`
- `evidence_refs` (`punto_id`, `argumentos.id`, `linea_partido.id`)

Aquesta estructura és coherent amb el patró existent d'`alertas`, perquè permetria persistir `tipo`, `severidad`, `descripcion` i `contexto` sense perdre traçabilitat.

---

## 8) Decisions tècniques d'aquesta ampliació

- La regla d'autoritat s'ha definit com a **font de veritat semàntica estructurable** a partir de `linea_partido`, sense exigir de moment canvis d'esquema.
- La comparació s'ha definit com un pipeline de **segmentació → retrieval de premisses → classificació de relació → agregació explicable**.
- S'han separat explícitament `matizado`, `divergente` i `contradictorio` per evitar que qualsevol diferència retòrica generi una alerta falsa.
- Els embeddings o la similitud semàntica s'han considerat necessaris però **insuficients** si no van acompanyats d'una etiqueta relacional tipus NLI.
- La manca actual de comentaris nominals llargs al model obliga a començar per `argumentos.argumento`, però la definició ja és compatible amb futures fonts de comentari/regidor.

### Arxius modificats
- `specs/regidors/SPEC.md`: afegida una nova secció amb el patró de divergència semàntica per comentaris i argumentaris, incloent representació de la regla d'autoritat, mètrica de contradicció/desviació, umbrals i senyals explicables.
