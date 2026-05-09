# SPEC — Intel

## 2025-02-14 — Ajuste de tiempos y condiciones del loader en `/intel`

### Cambios realizados
- Se ajustó la lógica del loader de `/intel` para retrasar su aparición y evitar parpadeos en respuestas rápidas.
- Se garantizó un tiempo mínimo de visibilidad una vez mostrado, para que el estado de carga sea perceptible cuando la espera es real.
- Se eliminó la dependencia del efecto respecto a `showLoader` usando una referencia (`showLoaderRef`), evitando re-ejecuciones innecesarias del ciclo de carga.
- Se reforzó la accesibilidad del estado de carga añadiendo `aria-atomic="true"`, manteniendo `role="status"`, `aria-live="polite"` y `aria-busy`.
- Se añadió una línea descriptiva secundaria al loader para comunicar mejor qué datos se están recuperando.

### Archivos modificados
- `web/src/app/intel/page.tsx`
- `specs/intel/SPEC.md`

### Decisiones técnicas
- `LOADER_DELAY_MS = 350`: permite suprimir el loader en respuestas casi instantáneas sin dejar la pantalla vacía demasiado tiempo.
- `LOADER_MIN_VISIBLE_MS = 900`: asegura que, si el loader aparece, permanezca visible el tiempo suficiente para evitar un destello molesto.
- Se usó `showLoaderRef` para leer el estado actual del loader dentro de `finally()` sin introducir dependencias reactivas adicionales en el `useEffect`.
- La mejora de accesibilidad se mantuvo básica y no invasiva, alineada con el alcance del brief.

### Condiciones exactas implementadas
1. Al arrancar la carga de `/intel`, el loader no se pinta inmediatamente.
2. Solo aparece si la carga sigue activa tras `350ms`.
3. Si la respuesta llega antes de `350ms`, el loader no llega a mostrarse y se evita el parpadeo.
4. Si el loader sí llega a mostrarse, se conserva visible al menos `900ms` desde el momento en que aparece.
5. Al finalizar la carga, si ese mínimo ya se cumplió, el loader desaparece inmediatamente; si no, espera el tiempo restante.
6. El estado expone `role="status"`, `aria-live="polite"`, `aria-busy` y `aria-atomic="true"`.

### Validación / handoff
- Se eliminó el import no usado de `Link` en `web/src/app/intel/page.tsx`.
- Validación manual/handoff preparado: para comprobarlo en navegador, abrir `/intel`, simular red rápida y red lenta, y verificar que:
  - en red rápida no aparece el loader,
  - en red lenta aparece tras ~350ms,
  - una vez visible no desaparece antes de ~900ms,
  - el texto accesible del estado sigue presente mientras `aria-busy` está activo.

## 2026-05-09 — Validación funcional final de `/intel`

### Cambios realizados
- No fue necesario modificar de nuevo la UI de `/intel`; se validó el estado actual como cierre funcional de la incidencia.
- Se documentó evidencia técnica y funcional conjunta con `/reputacio` en `docs/qa-validacion-reputacio-intel-2026-05-09.md`.

### Archivos modificados
- `docs/qa-validacion-reputacio-intel-2026-05-09.md`
- `specs/intel/SPEC.md`

### Decisiones técnicas
- Se mantuvo la implementación existente del loader porque ya cumple el objetivo del brief: feedback visible, animado y accesible durante cargas perceptibles.
- No se amplió alcance a refactors del resto de la pantalla, pese a existir avisos de lint en otros puntos del archivo.

### Evidencia
- `web/src/app/intel/page.tsx` conserva `LOADER_DELAY_MS = 350` y `LOADER_MIN_VISIBLE_MS = 900`.
- El loader usa `role="status"`, `aria-live="polite"`, `aria-atomic="true"` y `aria-busy`.
- `npm --prefix web run build` completó correctamente e incluyó la ruta `/intel` en la salida generada.

## 2026-05-10 — Profundización del modelo funcional del módulo intel (exploración)

### Objetivo
Redefinir `intel` como el **cerebro analítico y fuente de outputs globales de la plataforma**, alimentado por señales del resto de áreas para detectar patrones, priorizar focos y producir sugerencias ejecutables para dirección, portavoces, concejales y equipos de comunicación.

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación.
- **Sin cambios de código de producción**.
- Se cubre el checklist del brief:
  - definir responsabilidades concretas del módulo intel
  - especificar tipos de outputs globales y sugerencias
  - documentar métricas de utilidad y profundidad

---

## 1) Contexto revisado en el repositorio

Archivos auditados para esta definición:
- `README.md`
- `docs/ESPECIFICACION_FUNCIONAL.md`
- `docs/VISION_PROYECTO.md`
- `api/src/routes/intel.py`
- `specs/intel/SPEC.md`

Conclusiones del estado actual:
- El producto ya trata `/intel` como superficie visible de inteligencia, pero hoy su alcance funcional documentado es todavía estrecho: ranking de concejales, tendencias emergentes y promesas incumplidas.
- El backend expone tres endpoints base en `api/src/routes/intel.py`, lo que confirma una primera capa de explotación analítica ya separada del chat, reputación y dashboard.
- El resto del sistema ya contiene señales útiles que `intel` debería orquestar: plenos y votaciones, argumentos, alertas, recepción social, parlament, informes, suscripciones y uso por territorio/tema.
- Falta una definición explícita de `intel` como **capa de síntesis, priorización y sugerencia cross-módulo**, no solo como página con widgets analíticos.

---

## 2) Redefinición de `intel` dentro de la plataforma

### 2.1 Definición funcional

`intel` es el módulo encargado de:
- absorber datos estructurados y señales derivadas del resto de áreas
- convertir ese volumen en **lectura estratégica accionable**
- detectar qué importa ahora, por qué importa y a quién le afecta
- proponer acciones, preguntas, riesgos, oportunidades y seguimientos
- actuar como **fuente común de outputs globales** para pantalla, chat, alertas, informes y operativas de comunicación

### 2.2 Rol sistémico

Si el chat es la interfaz conversacional y reputación es la capa de señal externa, `intel` debe funcionar como:
- **memoria analítica operativa** del sistema
- **motor de priorización** de focos políticos
- **sintetizador transversal** entre territorio, voto, discurso, rivalidad, reputación y agenda
- **generador de sugerencias** para decisión humana

### 2.3 Resultado esperado

`intel` no debe limitarse a mostrar datos históricos.
Debe responder continuamente a cinco preguntas:
1. **qué está pasando**
2. **por qué importa**
3. **a quién afecta**
4. **qué debería vigilarse o hacerse ahora**
5. **qué salida reutilizable puede consumir el resto de la plataforma**

---

## 3) Responsabilidades concretas del módulo intel

### 3.1 Responsabilidades primarias

1. **Síntesis transversal de información**
   - unificar señales procedentes de plenos, votaciones, discurso, parlament, recepción social, reputación, alertas e informes.

2. **Detección de patrones relevantes**
   - identificar tendencias, anomalías, contradicciones, focos territoriales, ventanas narrativas y cambios de intensidad.

3. **Priorización estratégica**
   - ordenar temas, municipios, actores y rivales según urgencia, oportunidad, impacto reputacional o valor electoral.

4. **Generación de sugerencias accionables**
   - transformar hallazgos en recomendaciones concretas: investigar, responder, amplificar, preparar argumentario, vigilar, escalar o explotar políticamente.

5. **Producción de outputs globales reutilizables**
   - servir resúmenes, rankings, briefs, alertas explicadas, comparativas y listas priorizadas para UI, chat, Telegram e informes.

6. **Trazabilidad analítica**
   - permitir entender de qué señales nace una sugerencia, con qué confianza y qué módulos la alimentaron.

### 3.2 Responsabilidades secundarias

- detectar lagunas de cobertura por territorio, tema o fuente
- marcar conflictos entre señal interna y externa
- proponer preguntas siguientes para exploración humana o vía chat
- dar contexto comparativo temporal: antes/ahora, municipio/comarca, propio/rival
- mantener una memoria de focos abiertos y focos resueltos

### 3.3 Límites del módulo

`intel` no debe:
- sustituir el criterio político final humano
- emitir verdad absoluta cuando la evidencia sea débil
- convertirse en un simple duplicado del dashboard
- responder en bruto como el chat sin capa de priorización
- activar difusión o respuesta reputacional sin dejar nivel de confianza y justificación

---

## 4) Inputs que debe absorber desde el resto de áreas

## 4.1 Entradas estructurales

1. **Plenos y puntos del orden del día**
   - temas, resultados, frecuencia, municipios afectados, ventanas temporales.

2. **Votaciones y coherencia interna**
   - votos individuales, alineación de partido, divergencias, patrones territoriales, repeticiones por tema.

3. **Argumentos y mapa de discurso**
   - posiciones defendidas, frames utilizados, contradicciones argumentales, lenguaje replicable o problemático.

4. **Parlament**
   - iniciativas, debates, promesas, posicionamientos oficiales y cruces con comportamiento municipal.

5. **Recepción social y reputación**
   - sentimiento, intensidad, crisis, oportunidades favorables, validaciones externas y ruido ya filtrado.

6. **Alertas del sistema**
   - incoherencias, tendencias emergentes, saltos geográficos, reacción social y otros detectores automáticos.

### 4.2 Entradas de contexto operativo

1. **Municipios y territorio**
   - comarca, tamaño, prioridad electoral, presencia propia, historial político.

2. **Usuarios, roles y consumo interno**
   - qué mira dirección, qué consulta un delegado, qué temas se repiten, qué municipios generan más necesidad analítica.

3. **Informes y suscripciones**
   - temas recurrentes, periodicidad de consumo, focos persistentes, asuntos que merecen brief automático.

4. **Chat y búsquedas**
   - preguntas frecuentes, vacíos de información, temas donde el usuario necesita guía o síntesis adicional.

### 4.3 Metadatos mínimos que `intel` debería heredar o consolidar

Cada señal relevante debería poder normalizarse, al menos, con:
- `source_module`
- `signal_type`
- `territory_scope`
- `topic`
- `actor`
- `time_window`
- `impact_score`
- `confidence_score`
- `explainability_notes`
- `recommended_next_step`

---

## 5) Modelo funcional profundo de `intel`

### 5.1 Capas funcionales propuestas

#### Capa 1 — Ingesta de señales derivadas
Recibe hechos y métricas ya estructuradas desde otros módulos.
No reextrae PDFs ni sustituye ingestión primaria; trabaja sobre señal ya procesada.

#### Capa 2 — Normalización analítica
Homologa temas, territorios, actores, temporalidad y tipo de señal para poder comparar:
- pleno vs prensa
- municipio vs comarca
- propio vs rival
- discurso vs voto
- oportunidad vs riesgo

#### Capa 3 — Detección de patrones
Busca automáticamente:
- recurrencias
- cambios bruscos
- contradicciones
- huecos de cobertura
- convergencia de señales entre módulos
- oportunidades que aparecen simultáneamente en varios planos

#### Capa 4 — Priorización
Ordena hallazgos por combinaciones de:
- urgencia
- impacto
- confianza
- relevancia electoral
- capacidad de acción
- novedad
- persistencia

#### Capa 5 — Sugerencia y output
Convierte el patrón priorizado en una salida utilizable:
- alerta explicada
- hipótesis estratégica
- recomendación operativa
- ranking
- briefing ejecutivo
- pregunta sugerida al chat

### 5.2 Principio rector

`intel` debe puntuar mejor la **convergencia útil** que el volumen aislado.
Una señal moderada pero coincidente entre plenos, reputación y discurso puede valer más que un pico único de ruido o una métrica suelta.

---

## 6) Tipos de outputs globales que debe producir

### 6.1 Outputs de lectura ejecutiva

1. **Resumen ejecutivo diario/semanal**
   - qué temas suben
   - qué territorios preocupan
   - qué rivales exponen incoherencias
   - qué oportunidades merecen acción

2. **Radar de prioridades**
   - lista ordenada de los focos que más importan ahora, con explicación corta y nivel de confianza.

3. **Mapa de focos territoriales**
   - municipios/comarcas calientes por tema, riesgo, oportunidad o intensidad.

4. **Top cambios detectados**
   - lo nuevo respecto a la ventana previa: tema emergente, municipio anómalo, portavoz expuesto, oportunidad abierta.

### 6.2 Outputs analíticos comparativos

1. **Rankings cruzados**
   - concejales más divergentes
   - municipios con más tensión temática
   - rivales más incoherentes
   - temas con mayor crecimiento o desgaste

2. **Comparativas multi-eje**
   - partido propio vs rival
   - parlament vs municipal
   - discurso vs voto
   - cobertura mediática vs realidad plenaria

3. **Fichas de tema/territorio**
   - vista condensada de un tema o municipio con síntesis, señal principal y próximos pasos.

### 6.3 Outputs de decisión operativa

1. **Sugerencias accionables priorizadas**
   - investigar
   - preparar argumentario
   - activar reputación
   - amplificar difusión
   - hacer seguimiento
   - ignorar por baja señal

2. **Hipótesis estratégicas**
   - interpretaciones no concluyentes pero útiles para exploración humana.
   - Ejemplo: “la subida de seguridad en tres comarcas parece asociarse a debate vecinal y puede abrir oportunidad para mensaje de firmeza”.

3. **Preguntas sugeridas para el chat**
   - prompts guiados para profundizar donde `intel` detecta valor.

4. **Briefs listos para exportar**
   - piezas compactas para dirección, concejal local, prensa o portavoz.

### 6.4 Outputs de vigilancia

1. **Watchlist de temas**
2. **Watchlist de municipios**
3. **Watchlist de actores y rivales**
4. **Casos abiertos con condiciones de escalado o cierre**

---

## 7) Tipos de sugerencias que `intel` debe generar

### 7.1 Sugerencias de investigación

Se activan cuando hay señal prometedora pero evidencia incompleta.
Ejemplos:
- profundizar en un municipio con salto temático anómalo
- revisar si una incoherencia de voto es caso aislado o patrón
- contrastar una narrativa reputacional con el acta original

### 7.2 Sugerencias de comunicación

Se activan cuando existe una oportunidad o necesidad de framing.
Ejemplos:
- preparar argumentario corto para portavoz local
- convertir una contradicción rival en nota, clip o mensaje de campaña
- reforzar un logro local validado por terceros

### 7.3 Sugerencias de disciplina interna

Se activan cuando el sistema detecta desalineación propia.
Ejemplos:
- revisar posición de partido en un tema concreto
- formar a concejales en marco argumental común
- priorizar municipios con divergencia recurrente

### 7.4 Sugerencias de agenda y oportunidad

Se activan cuando un tema sube y todavía no está saturado.
Ejemplos:
- entrar antes que el rival en un debate local
- ligar una iniciativa parlamentaria a sensibilidad municipal emergente
- aprovechar ventana favorable en prensa local

### 7.5 Sugerencias de seguimiento o no-acción

El módulo también debe sugerir:
- monitorizar sin actuar
- esperar confirmación adicional
- no amplificar ruido insuficiente
- cerrar un caso cuya intensidad ya cayó

---

## 8) Casos de uso nucleares de `intel`

### 8.1 Dirección del partido
Necesita:
- panorama general
- prioridades de la semana
- riesgos transversales
- ventanas de crecimiento
- contradicciones explotables de rivales

Output ideal:
- resumen ejecutivo + top 5 acciones sugeridas + watchlist territorial.

### 8.2 Responsable de comunicación/prensa
Necesita:
- qué mensaje empujar
- dónde responder
- qué oportunidad amplificar
- qué actor o medio conviene activar

Output ideal:
- oportunidad o riesgo priorizado + ángulo recomendado + canal + evidencia base.

### 8.3 Delegado temático o territorial
Necesita:
- qué temas se están moviendo en su área
- qué municipios requieren atención
- qué señales merecen visita, llamada o seguimiento

Output ideal:
- radar temático/territorial con prioridad y next steps.

### 8.4 Concejal o portavoz local
Necesita:
- contexto rápido
- comparativas útiles
- mensajes concretos
- alertas sobre incoherencias propias o ataques esperables

Output ideal:
- ficha local con resumen, riesgos, oportunidades y 3-5 bullets accionables.

---

## 9) Lógica de priorización y sugerencia

### 9.1 Variables de priorización recomendadas

Cada hallazgo en `intel` debería ponderarse con una combinación de:
- **impacto**: cuánto afecta a imagen, agenda o voto
- **urgencia**: cuánto pierde valor si no se atiende pronto
- **confianza**: calidad y convergencia de la evidencia
- **relevancia territorial**: peso político del municipio/comarca
- **capacidad de acción**: si existe una respuesta o explotación plausible
- **novedad**: si aporta algo no visto en la ventana anterior
- **persistencia**: si es un patrón repetido y no un pico aislado

### 9.2 Heurísticas operativas

1. **Convergencia > volumen**
   - varias señales medianas alineadas pesan más que un único pico sin contexto.

2. **Local validado > viral genérico**
   - para política municipal, una señal local fiable tiene más valor que ruido masivo desterritorializado.

3. **Sugerencia accionable > insight decorativo**
   - un hallazgo sin next step claro debe bajar de prioridad ejecutiva.

4. **Riesgo con baja confianza = verificar antes de actuar**
5. **Oportunidad con alta confianza y ventana corta = activar rápido**
6. **Repetición de patrón propio = elevar disciplina interna**

### 9.3 Niveles de salida sugeridos

- `P1` — actuar ahora
- `P2` — preparar respuesta o explotación hoy
- `P3` — investigar / seguir de cerca
- `P4` — monitorizar
- `P5` — archivar o ignorar

---

## 10) Métricas de utilidad del módulo

### 10.1 KPIs de utilidad directa

1. **Tasa de sugerencias accionadas**
   - porcentaje de sugerencias de `intel` que terminan convertidas en acción humana o automática asistida.

2. **Tiempo hasta insight útil**
   - cuánto tarda un usuario en encontrar una línea de acción relevante desde que entra en `intel`.

3. **Ahorro de exploración manual**
   - reducción del número de búsquedas o pasos necesarios para detectar un foco importante.

4. **Cobertura de focos relevantes**
   - porcentaje de incidentes, oportunidades o patrones relevantes que `intel` logra capturar en su radar.

5. **Precisión percibida de prioridades**
   - valoración humana de si el top de focos realmente coincidía con lo importante.

### 10.2 KPIs de adopción

- frecuencia de uso de `intel` por rol
- ratio de retorno semanal
- porcentaje de sesiones que acaban en export, chat, alerta o brief
- uso de sugerencias por dirección vs comunicación vs territorial

### 10.3 KPIs de calidad analítica

- tasa de falsos positivos en prioridades altas
- tasa de hallazgos sin evidencia suficiente
- porcentaje de sugerencias con trazabilidad clara
- ratio de outputs que combinan más de un módulo fuente
- tiempo de actualización de señales relevantes

---

## 11) Métricas de profundidad del módulo

### 11.1 Qué significa “profundidad” en `intel`

La profundidad no equivale a mostrar más widgets.
Significa que el módulo:
- integra más planos de información
- interpreta relaciones entre señales
- produce salidas más contextualizadas
- reduce ambigüedad para la decisión humana

### 11.2 Indicadores de profundidad recomendados

1. **Densidad de cruce entre módulos**
   - cuántos outputs relevantes combinan al menos dos o tres fuentes distintas.

2. **Nivel de contextualización de cada output**
   - si incluye tema, territorio, actor, comparación temporal, confianza y next step.

3. **Capacidad de explicar por qué importa**
   - cada output debería justificar su prioridad, no solo listar datos.

4. **Capacidad de proponer acción diferenciada por rol**
   - dirección, prensa y territorio no deben recibir exactamente la misma sugerencia.

5. **Continuidad analítica**
   - capacidad de recordar focos previos, evolución y estado abierto/cerrado.

6. **Nivel de convertibilidad a output ejecutable**
   - facilidad con la que el insight se transforma en brief, mensaje, alerta o pregunta de seguimiento.

### 11.3 Escala orientativa de madurez

#### Nivel 1 — Descriptivo
`intel` solo lista métricas o rankings.

#### Nivel 2 — Diagnóstico
`intel` explica qué cambió y dónde.

#### Nivel 3 — Priorización
`intel` ordena focos según importancia y confianza.

#### Nivel 4 — Sugerencia
`intel` propone acciones concretas por rol.

#### Nivel 5 — Orquestación
`intel` se convierte en fuente global de outputs y alimenta de forma coordinada chat, alertas, informes y reputación.

Objetivo funcional de producto:
- mover `intel` desde un nivel **2-3** actual hacia un **4-5**.

---

## 12) Outputs globales que deberían alimentar otras superficies

### 12.1 Hacia el chat
- preguntas sugeridas según foco detectado
- contexto ejecutivo precargado
- hipótesis o comparativas que el usuario pueda desarrollar

### 12.2 Hacia alertas
- explicación contextual de por qué una alerta sube o baja de prioridad
- relación entre alertas aisladas y patrón mayor

### 12.3 Hacia reputación
- detección de focos a contener o ventanas a amplificar
- priorización por territorio y valor político

### 12.4 Hacia informes y suscripciones
- resúmenes ejecutivos automáticos
- top cambios por tema/territorio
- watchlists persistentes

### 12.5 Hacia dashboard y vistas ejecutivas
- KPIs priorizados en vez de solo métricas de inventario
- bloques de “qué mirar ahora” y “qué hacer después”

---

## 13) Recomendaciones de implementación futura

Sin tocar producción en esta tarea, una implementación posterior debería contemplar:

1. **Modelo unificado de señal analítica**
   - normalizar inputs de alertas, reputación, pleno, discurso y parlament.

2. **Scoring transversal de prioridades**
   - score común para riesgo, oportunidad, novedad y acción sugerida.

3. **Objeto `intel_output` o equivalente**
   - con `summary`, `why_it_matters`, `confidence`, `priority`, `recommended_action`, `target_role`, `source_modules`.

4. **Persistencia de watchlists y focos abiertos**
   - para continuidad entre sesiones.

5. **Conexión explícita con chat e informes**
   - reutilizar sugerencias de `intel` como prompts guiados y bloques exportables.

6. **Panel de explicabilidad**
   - mostrar qué señales y módulos sustentan cada recomendación.

7. **Segmentación por rol**
   - misma señal, distinta sugerencia según dirección, prensa o territorio.

---

## 14) Decisiones técnicas y funcionales tomadas

1. `intel` se redefine como **capa de cerebro analítico**, no como simple página de reporting.
2. Su valor diferencial es la **síntesis transversal + priorización + sugerencia**, no solo la visualización.
3. La unidad útil del módulo no es el dato aislado, sino el **foco priorizado con explicación y next step**.
4. Los outputs globales deben poder alimentar otras superficies del producto, especialmente chat, alertas, reputación e informes.
5. La métrica central de éxito no es cuántos datos muestra `intel`, sino cuántas decisiones útiles acelera con buena trazabilidad.
6. La profundidad del módulo debe medirse por capacidad de cruce, contexto, explicabilidad y accionabilidad.

---

## 15) Archivos modificados

- `specs/intel/SPEC.md`

### Cambios realizados en esta iteración
- se añadió una nueva sección de redefinición funcional profunda del módulo `intel`
- se definieron responsabilidades concretas y límites del módulo
- se documentaron inputs cross-módulo desde el resto de áreas del producto
- se especificaron tipos de outputs globales y familias de sugerencias accionables
- se propuso una lógica de priorización con heurísticas operativas
- se documentaron métricas de utilidad y profundidad del módulo
- se dejaron recomendaciones de implementación futura sin tocar código de producción

---

## 16) Límites de esta iteración

No se implementa en esta tarea:
- endpoints nuevos en `api/src/routes/intel.py`
- cambios de frontend en `/intel`
- persistencia de nuevos modelos o tablas
- scoring automático en backend
- integración real con chat, alertas, reputación o informes

Se entrega únicamente la especificación funcional solicitada.

## 2026-05-10 — Diseño de integración de datos de otros módulos hacia `intel` (exploración)

### Objetivo
Especificar cómo `intel` debe alimentarse de información procedente de `dashboard`, `chat`, `buscar/search`, `reputació`, `regidors` y el resto de áreas relevantes para poder **extraer datos consolidados, detectar patrones y generar sugerencias coherentes**. Esta iteración convierte la redefinición funcional previa de `intel` en un **contrato operativo de integración cross-módulo**.

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación.
- **Sin cambios de código de producción**.
- Se cubre el checklist literal del brief:
  - listar módulos fuente y datos que `intel` debe consumir
  - definir esquema de intercambio o consolidación de señales
  - documentar frecuencia de actualización y dependencias

---

## 1) Contexto auditado en el repositorio

Archivos revisados para esta definición:
- `README.md`
- `api/src/routes/intel.py`
- `specs/intel/SPEC.md`
- `specs/dashboard/SPEC.md`
- `specs/reputacio/SPEC.md`
- `specs/regidors/SPEC.md`
- `specs/chat/SPEC.md`

Conclusiones relevantes:
- El backend real de `intel` sigue siendo hoy una primera capa analítica con endpoints de ranking, tendencias y promesas incumplidas en `api/src/routes/intel.py`.
- La documentación reciente del repo ya define con más detalle varios módulos adyacentes (`dashboard`, `reputació`, `regidors`, `chat`), lo que permite diseñar ahora **qué señales deben converger en `intel`** aunque todavía no exista una implementación runtime unificada.
- `intel` ya fue redefinido en este mismo SPEC como cerebro analítico y fuente de outputs globales; faltaba aterrizar **de dónde salen esas señales, con qué contrato mínimo y con qué cadencia**.
- El rol de `intel` no es reingestar documentos primarios ni duplicar toda la lógica de los demás módulos, sino **consumir señal ya estructurada, normalizarla, priorizarla y transformarla en sugerencias accionables**.

---

## 2) Principio de integración: `intel` como capa de síntesis, no como silo paralelo

### 2.1 Función exacta de la integración
`intel` debe situarse por encima de los módulos operativos del sistema y actuar como:
- **recolector de señales derivadas**
- **normalizador cross-módulo**
- **consolidador de evidencia**
- **motor de priorización**
- **generador de sugerencias y outputs reutilizables**

Esto implica una separación clara:
- cada módulo fuente sigue siendo dueño de su captura, validación y lógica específica;
- `intel` consume una versión utilizable de esa señal para responder preguntas globales como:
  1. qué está cambiando,
  2. dónde converge el riesgo o la oportunidad,
  3. qué foco merece atención inmediata,
  4. qué acción tiene más sentido según rol, territorio y contexto.

### 2.2 Qué no debe hacer `intel`
`intel` no debe:
- reparsear PDFs o fuentes crudas ya tratadas por pipeline
- sustituir los módulos especializados (`reputació`, `regidors`, `chat`, `dashboard`)
- actuar sobre ruido no filtrado
- producir sugerencias sin trazabilidad hacia señales fuente
- mezclar señales incompatibles sin conservar conflicto, frescura y confianza

---

## 3) Inventario de módulos fuente y datos que `intel` debe consumir

A continuación se define el mapa mínimo de módulos fuente. El objetivo no es exigir que todos tengan hoy el mismo nivel de madurez, sino fijar **qué familias de datos deben converger** en la capa `intel`.

### 3.1 `dashboard`

#### Valor para `intel`
Aporta la **lectura agregada y comparativa** del sistema: qué temas, actores y territorios parecen importantes por volumen, evolución y anomalía.

#### Señales que `intel` debe consumir
- rankings y agregados de actividad política
- tendencias emergentes por tema/territorio
- cambios respecto a ventana temporal previa
- indicadores de coherencia/alineación ya expuestos en vistas agregadas
- focos territoriales calientes
- comparativas de intensidad por municipio/comarca
- métricas de cobertura y densidad temática

#### Utilidad analítica en `intel`
- detectar dónde mirar primero
- convertir un agregado descriptivo en hipótesis priorizada
- cruzar tendencia cuantitativa con reputación, chat y regidores para ver si el cambio es relevante o decorativo

### 3.2 `chat`

#### Valor para `intel`
Aporta la **demanda interpretativa de los usuarios** y la memoria de qué preguntas estratégicas aparecen de forma recurrente.

#### Señales que `intel` debe consumir
- consultas frecuentes por tema, actor, rival, municipio o ventana temporal
- intención dominante de consulta (`monitor`, `atacar`, `defensar`, `comparar`, `oportunitat`)
- prompts sugeridos o reutilizados con alta frecuencia
- preguntas sin respuesta suficiente o con baja cobertura
- temas donde el usuario necesita contexto adicional
- patrones de consumo por rol o perfil operativo si existen

#### Utilidad analítica en `intel`
- identificar vacíos de información o ángulos no bien cubiertos por el sistema
- priorizar outputs que respondan a demanda real, no solo a señal observada
- generar sugerencias alineadas con necesidades recurrentes de dirección, prensa o territorio

### 3.3 `buscar` / `search`

#### Valor para `intel`
Aporta la **huella de exploración explícita**: qué intenta encontrar el usuario aunque todavía no llegue a una conversación larga en chat.

#### Señales que `intel` debe consumir
- términos de búsqueda más repetidos
- combinaciones recurrentes de tema + territorio + actor
- búsquedas vacías o de baja confianza
- sugerencias simplificadas usadas por usuarios cuando el sistema no devuelve buen resultado
- estacionalidad de consultas por tema

#### Utilidad analítica en `intel`
- detectar interés emergente antes de que exista suficiente cobertura analítica
- marcar lagunas de indexación, tagging o cobertura temática
- sugerir briefs preventivos sobre asuntos que se están buscando mucho pero aún no están bien sintetizados

### 3.4 `reputació`

#### Valor para `intel`
Aporta la **señal externa filtrada** sobre cómo evoluciona la percepción pública, qué crisis aparecen y qué oportunidades de amplificación son verosímiles.

#### Señales que `intel` debe consumir
- incidentes reputacionales agrupados
- severidad, prioridad y confianza factual de cada incidente
- clasificación del incidente (`crítica legítima`, `error propio`, `narrativa adversa`, `rumor`, `ataque coordinado`, `crisis real`)
- oportunidades favorables (`altaveu`) con `opportunity_score`
- fuentes dominantes que legitiman o escalan un foco
- tema, territorio, actor afectado y etapa del incidente/oportunidad
- estado recomendado (`monitor`, `verify_first`, `respond_full`, `activate_local`, etc.)

#### Utilidad analítica en `intel`
- elevar riesgos y oportunidades reputacionales al radar estratégico global
- cruzar una crisis externa con comportamiento interno, voto, discurso y agenda territorial
- modular sugerencias: contener, esperar, contrastar, amplificar, preparar argumentario, escalar humano

### 3.5 `regidors`

#### Valor para `intel`
Aporta la **disciplina interna y coherencia político-discursiva** a nivel de representantes.

#### Señales que `intel` debe consumir
- divergencias de voto respecto a línea oficial
- abstenciones inconsistentes
- desalineación respecto al grupo local
- divergencias argumentales (`alineado`, `matizado`, `divergente`, `contradictorio`)
- confianza de la detección y necesidad de revisión humana
- recurrencia por tema, municipio, partido o actor
- casos no evaluables por falta de voto nominal o de regla suficiente

#### Utilidad analítica en `intel`
- detectar problemas de disciplina antes de que escalen en reputación o narrativa rival
- priorizar municipios o portavoces donde hace falta refuerzo argumental
- conectar incoherencia interna con oportunidad/riesgo externo

### 3.6 `dashboard` legislativo / plenos / parlament / actas

#### Valor para `intel`
Son la **base factual institucional** de actividad política: qué se debatió, quién votó, qué propuestas aparecieron, qué promesas chocan entre escalas.

#### Señales que `intel` debe consumir
- puntos de pleno y su clasificación temática
- resultados de votación
- actividad parlamentaria relacionada con temas municipales
- promesas incumplidas o contradicciones entre nivel parlamentario y municipal
- frecuencia de aparición de temas
- nuevos puntos con sensibilidad alta o especial capacidad de conflicto

#### Utilidad analítica en `intel`
- sostener explicabilidad factual de insights y sugerencias
- conectar el relato con la realidad de plenos y decisiones
- discriminar entre ruido reputacional y cambio político material

### 3.7 `alertas`

#### Valor para `intel`
Aporta la **capa de detección automática temprana** del sistema.

#### Señales que `intel` debe consumir
- alertas abiertas por incoherencia, tendencia o anomalía
- severidad y estado de revisión
- contexto del `punto_id` o entidad relacionada
- repeticiones de un mismo patrón
- alertas resueltas vs persistentes

#### Utilidad analítica en `intel`
- acelerar la priorización de focos
- no depender solo de agregados históricos
- transformar alertas aisladas en narrativas o hipótesis más amplias

### 3.8 `informes` y `subscripciones`

#### Valor para `intel`
Aportan la **memoria de consumo estructurado** del sistema y los focos que merecen seguimiento periódico.

#### Señales que `intel` debe consumir
- temas recurrentes en informes exportados
- watchlists activas por usuario/rol/territorio
- periodicidad de seguimiento solicitada
- focos que reaparecen en resúmenes periódicos
- asuntos que ya pasaron el filtro de relevancia humana

#### Utilidad analítica en `intel`
- distinguir entre curiosidad puntual y foco persistente
- mantener continuidad entre sesiones y entre equipos
- sugerir seguimiento, cierre o reactivación de casos

### 3.9 `municipios`, contexto territorial y catálogos maestros

#### Valor para `intel`
Aportan el **marco territorial y electoral** sin el cual la señal no puede priorizarse bien.

#### Señales que `intel` debe consumir
- municipio, comarca y jerarquía territorial
- peso o prioridad política del territorio
- presencia propia / rival relevante
- histórico mínimo del territorio
- cobertura disponible y lagunas de datos

#### Utilidad analítica en `intel`
- evitar priorización ciega por volumen
- distinguir señal importante en municipio clave de señal vistosa pero periférica
- adaptar sugerencias por escala territorial

---

## 4) Contrato de señal: esquema mínimo de intercambio o consolidación

Para que `intel` pueda absorber datos heterogéneos sin perder comparabilidad, cada módulo fuente debería exponer o proyectar sus hallazgos a una **unidad común de señal analítica**.

### 4.1 Objeto lógico recomendado: `intel_signal`

Campos mínimos recomendados:
- `signal_id`
- `source_module`
- `source_entity_type`
- `source_entity_id`
- `signal_family`
- `signal_type`
- `headline`
- `summary`
- `territory_scope`
- `municipio`
- `comarca`
- `topic_primary`
- `topic_secondary[]`
- `actor_primary`
- `actor_secondary[]`
- `party_related`
- `event_date`
- `detected_at`
- `time_window`
- `status`
- `severity_score`
- `opportunity_score`
- `impact_score`
- `confidence_score`
- `freshness_score`
- `actionability_score`
- `needs_human_review`
- `recommended_action`
- `recommended_role_targets[]`
- `evidence_refs[]`
- `explainability_notes`
- `dedupe_key`
- `supersedes_signal_id`

### 4.2 Qué resuelve este contrato
Este esquema no obliga a que todos los módulos generen exactamente los mismos scores, pero sí obliga a que cualquier señal consumible por `intel` conserve:
- origen
- territorio
- tema
- actor
- tiempo
- confianza
- prioridad o severidad/oportunidad
- trazabilidad a evidencias
- sugerencia o estado operativo si el módulo fuente ya la conoce

### 4.3 Mapeo mínimo por módulo

#### Desde `dashboard`
- `signal_family`: `aggregate_trend`
- `signal_type`: `trend`, `ranking_shift`, `territorial_hotspot`
- scores clave: `impact_score`, `freshness_score`

#### Desde `chat`
- `signal_family`: `user_demand`
- `signal_type`: `frequent_query`, `coverage_gap`, `intent_cluster`
- scores clave: `actionability_score`, `freshness_score`

#### Desde `search`
- `signal_family`: `search_demand`
- `signal_type`: `popular_query`, `empty_result_pattern`, `query_surge`
- scores clave: `freshness_score`, `impact_score`

#### Desde `reputació`
- `signal_family`: `external_perception`
- `signal_type`: `reputation_incident`, `amplification_opportunity`
- scores clave: `severity_score` u `opportunity_score`, `confidence_score`

#### Desde `regidors`
- `signal_family`: `internal_alignment`
- `signal_type`: `vote_divergence`, `argument_divergence`, `group_split`
- scores clave: `severity_score`, `confidence_score`, `needs_human_review`

#### Desde plenos / parlament / alertas
- `signal_family`: `institutional_activity`
- `signal_type`: `vote_result`, `promise_conflict`, `emergent_alert`, `high-sensitivity_point`
- scores clave: `impact_score`, `freshness_score`, `confidence_score`

---

## 5) Normalización y consolidación de señales en `intel`

### 5.1 Fases de consolidación

#### Fase 1 — Ingesta derivada por módulo
Cada módulo publica o hace accesibles sus señales ya depuradas, sin que `intel` tenga que reinterpretar desde cero la fuente original.

#### Fase 2 — Normalización común
`intel` homogeniza:
- taxonomía temática
- taxonomía territorial
- tipos de actor
- ventanas temporales
- escalas de confianza y prioridad

#### Fase 3 — Enlace y deduplicación
Se unen señales que hablan del mismo foco usando combinaciones de:
- territorio
- tema
- actor
- fecha/ventana
- entidad fuente (`punto_id`, `incident_id`, etc.)
- `dedupe_key`

#### Fase 4 — Consolidación de foco
Se agrupan señales convergentes en una entidad lógica superior, por ejemplo `intel_focus`, que represente un caso, tema o ventana a vigilar.

#### Fase 5 — Prioridad y sugerencia
Sobre cada foco consolidado, `intel` calcula:
- prioridad global
- lectura explicada
- acción recomendada por rol
- preguntas sugeridas y outputs exportables

### 5.2 Regla de convergencia
La prioridad final debe valorar más:
- señales de distintos módulos que coinciden sobre mismo tema/territorio/actor,
que:
- repeticiones del mismo tipo de señal dentro de un único módulo.

Ejemplo:
- una subida temática en `dashboard`
- más búsquedas relacionadas en `search`
- una consulta recurrente en `chat`
- y una oportunidad o crisis en `reputació`

deben producir un foco `intel` mucho más alto que cualquiera de esas señales por separado.

### 5.3 Tratamiento de conflicto entre señales
Cuando dos módulos no cuentan la misma historia, `intel` no debe ocultarlo.
Debe conservar explícitamente:
- conflicto factual
- conflicto de interpretación
- desfase temporal
- diferencia de confianza

Casos típicos:
- `reputació` marca crisis, pero plenos/actas no sostienen el hecho principal
- `dashboard` muestra tendencia al alza, pero `chat` no refleja interés real de usuarios
- `regidors` detecta divergencia de baja confianza, mientras `reputació` ya está escalando una narrativa fuerte

En estos casos, `intel` debe producir salidas tipo:
- verificar antes de actuar
- oportunidad/riesgo no confirmado
- divergencia interna con evidencia incompleta

---

## 6) Frecuencia de actualización por módulo y cadencia recomendada

La integración no debe asumir una única latencia para todo. Cada señal tiene un comportamiento distinto.

### 6.1 Realtime o cuasi realtime
Aplica a señales que pueden alterar la prioridad táctica en minutos u horas.

#### Módulos
- `chat` (demanda de usuario)
- `search`
- `reputació` cuando detecta incidentes u oportunidades nuevas
- `alertas`

#### Cadencia recomendada
- ingestión o refresco cada pocos minutos
- recomputación de focos `intel` al menos en micro-lotes frecuentes

#### Motivo
Permite que `intel` responda rápido a:
- crisis reputacionales emergentes
- cambios bruscos de interés
- vacíos de cobertura detectados por usuarios

### 6.2 Batch frecuente intradía
Aplica a señales estructuradas que no necesitan segundos, pero sí actualización útil durante la jornada.

#### Módulos
- `dashboard` y sus agregados analíticos
- rankings y hotspots territoriales
- consolidación de actividad plenaria reciente
- métricas de tendencia derivadas

#### Cadencia recomendada
- cada hora o varias veces al día según coste

#### Motivo
Las tendencias y rankings cambian con menos volatilidad que una crisis social puntual, pero deben mantenerse suficientemente frescos para sostener la lectura estratégica.

### 6.3 Batch diario o por evento
Aplica a señales que dependen de cierres de ingestión, revisión humana o ventanas temporales más largas.

#### Módulos
- `regidors` si requiere reconciliación de votos y revisión
- cruces parlament-municipal
- informes y subscripciones
- recomputación de watchlists persistentes

#### Cadencia recomendada
- diario, nocturno o disparado por nuevo lote de datos

#### Motivo
Son señales de más peso estructural y menor volatilidad, donde prima más la calidad y la trazabilidad que el milisegundo.

### 6.4 Actualización bajo demanda
Además de las cadencias anteriores, `intel` debería poder forzar o acelerar recomputaciones cuando:
- un usuario entra a `/intel`
- se abre un territorio/tema concreto
- un incidente crítico cambia de estado
- aparece una señal P1/P2 en reputación o alertas

---

## 7) Dependencias funcionales y orden lógico de madurez

### 7.1 Dependencias aguas arriba
Para que `intel` funcione bien, necesita que los módulos fuente resuelvan antes ciertos mínimos:

#### `reputació`
- incidente/oportunidad agrupado
- severidad/oportunidad y confianza mínimas
- filtro de ruido y reality check aplicados

#### `regidors`
- postura esperada derivable
- divergencia etiquetable
- confianza y revisión humana explícitas

#### `chat` y `search`
- telemetría de intención, frecuencia y gap de cobertura
- trazabilidad de consultas sin guardar más contexto del necesario

#### `dashboard`
- agregados temporales y territoriales estables
- definición consistente de tendencia/hotspot/ranking shift

#### plenos / parlament / alertas
- clasificación temática mínima
- entidades enlazables (`punto_id`, actor, partido, territorio)

### 7.2 Dependencias internas de `intel`
Una implementación posterior debería contemplar, como mínimo:
1. taxonomía común de temas
2. taxonomía territorial común
3. resolución de actores/partidos
4. normalización de scores
5. modelo de deduplicación y foco consolidado
6. trazabilidad de evidencia por output

### 7.3 Orden de madurez recomendado

#### Nivel 1 — Consumo pasivo
`intel` lee señales ya existentes y las muestra juntas.

#### Nivel 2 — Normalización y priorización
`intel` empieza a ordenar focos con score transversal.

#### Nivel 3 — Consolidación de focos
`intel` agrupa señales convergentes y evita duplicidades.

#### Nivel 4 — Sugerencias por rol
`intel` emite next steps diferenciados para dirección, prensa, territorial o portavoz.

#### Nivel 5 — Fuente global de outputs
`intel` alimenta de vuelta a chat, alertas, informes, dashboard y operativa reputacional.

---

## 8) Reglas funcionales para extracción de datos y generación de sugerencias coherentes

### 8.1 Regla 1 — No sugerir sobre señal aislada sin contexto
Una única señal débil no debe generar recomendación fuerte salvo que:
- tenga severidad crítica,
- provenga de fuente de alta confianza,
- o afecte a territorio/actor extremadamente sensible.

### 8.2 Regla 2 — Premiar convergencia multi-módulo
Una sugerencia gana prioridad cuando el foco aparece de forma alineada en varios módulos, por ejemplo:
- `dashboard` detecta subida temática
- `search` muestra incremento de búsquedas
- `chat` refleja preguntas recurrentes
- `reputació` encuentra validación externa o tensión creciente

### 8.3 Regla 3 — Mantener separación entre hecho y recomendación
Cada output de `intel` debe separar:
- hechos o señales observadas
- interpretación analítica
- recomendación sugerida
- nivel de confianza

### 8.4 Regla 4 — Modular la acción según rol
El mismo foco no debe producir la misma recomendación para todos.

Ejemplo:
- dirección: decidir prioridad política
- prensa: preparar framing o no responder
- territorial: visitar, llamar o reforzar narrativa local
- portavoz: argumentario corto y riesgos de mensaje

### 8.5 Regla 5 — Incorporar freshness y vigencia
Una señal antigua o ya cerrada no debe competir igual que una ventana recién abierta, salvo que su persistencia sea precisamente parte del insight.

### 8.6 Regla 6 — Trazabilidad obligatoria
Toda sugerencia relevante debe poder responder:
- qué módulos la alimentan
- qué hechos concretos la sostienen
- qué parte sigue incierta
- qué acción se propone y por qué

---

## 9) Outputs integrados que esta arquitectura debe habilitar en `intel`

Con este diseño de integración, `intel` debería poder producir de forma consistente:

1. **Focos priorizados cross-módulo**
   - tema + territorio + actor + por qué importa

2. **Sugerencias accionables por rol**
   - investigar, preparar argumentario, activar altavoz, contener crisis, monitorizar, escalar

3. **Watchlists vivas**
   - temas, municipios, rivales, casos abiertos

4. **Briefs ejecutivos con evidencia**
   - resumen, contexto, convergencia de señales, acción recomendada

5. **Preguntas sugeridas para el chat**
   - profundización automática sobre focos detectados

6. **Explicación de conflictos**
   - por qué un caso aún no es concluyente o necesita revisión humana

7. **Memoria analítica de casos**
   - evolución del foco, subida, contención, cierre o reaparición

---

## 10) Decisiones técnicas y funcionales tomadas

1. `intel` debe alimentarse principalmente de **señal derivada y estructurada**, no de fuentes crudas.
2. Los módulos fuente mínimos a integrar son: `dashboard`, `chat`, `search`, `reputació`, `regidors`, `alertas`, plenos/parlament y contexto territorial.
3. La unidad de intercambio recomendada es una señal común tipo `intel_signal` con trazabilidad, scores, territorio, tema y acción sugerida.
4. La consolidación debe organizarse por **focos** y no por listas infinitas de eventos sueltos.
5. La prioridad estratégica debe ponderar más la **convergencia entre módulos** que el volumen aislado dentro de un único módulo.
6. La frecuencia de actualización debe ser heterogénea: realtime para demanda/alerta/crisis y batch para agregados estructurales.
7. `intel` debe preservar conflicto, confianza y freshness; no solo fusionar datos en una media opaca.
8. El objetivo final no es mostrar más datos, sino producir **sugerencias coherentes, trazables y operativamente útiles**.

---

## 11) Archivos modificados

- `specs/intel/SPEC.md`

### Cambios realizados en esta iteración
- se añade una nueva sección de diseño de integración cross-módulo hacia `intel`
- se lista el inventario de módulos fuente y las señales/datos que `intel` debe consumir
- se define un contrato lógico de intercambio/consolidación (`intel_signal`)
- se documentan fases de normalización, deduplicación y consolidación de focos
- se especifican frecuencias de actualización por familia de módulos
- se detallan dependencias funcionales y reglas para generación de sugerencias coherentes

---

## 12) Límites de esta iteración

No se implementa en esta tarea:
- nuevos endpoints FastAPI en `api/src/routes/intel.py`
- persistencia de `intel_signal` o `intel_focus`
- cambios de frontend en `/intel`
- telemetría real de `chat` o `search`
- jobs batch/realtime de consolidación
- integración runtime con `reputació`, `dashboard`, `regidors` o `alertas`

Se entrega únicamente la especificación de integración solicitada.
