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
