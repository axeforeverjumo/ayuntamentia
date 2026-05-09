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
