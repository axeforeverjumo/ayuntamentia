# Diseño de ingesta de vídeos de plenos para tendencias

## Objetivo

Definir un flujo operativo y técnico para incorporar los vídeos de plenos como nueva fuente analítica en Pulse / Politica, de forma que sirvan para:

1. detectar temas discutidos aunque no queden bien reflejados en las actas,
2. enriquecer el cálculo estratégico de temas en tendencia,
3. alimentar capas analíticas relacionadas con intel, reputación y seguimiento político,
4. mantener trazabilidad y control de calidad antes de usar transcripciones en análisis automatizado.

## Alcance

Este documento es de diseño. No introduce todavía cambios en backend, pipeline, frontend ni base de datos.

Cubre:
- captura y registro de vídeos de plenos,
- transcripción automática,
- revisión humana y control de calidad,
- extracción y asimilación de temas,
- conexión con tendencias e intel,
- criterios mínimos para aceptar una transcripción.

No cubre todavía:
- implementación concreta de conectores por proveedor,
- UI de revisión editorial,
- tablas finales de producción,
- scoring exacto en SQL más allá del acoplamiento conceptual.

## Contexto funcional

El dashboard ya pondera tendencias de forma estratégica con señales internas y externas. El siguiente paso lógico es añadir la capa audiovisual de los plenos porque:

- hay debates que aparecen de forma incompleta en el acta,
- algunas intervenciones relevantes solo se entienden por tono, duración o secuencia oral,
- el vídeo permite detectar temas emergentes antes de que aparezcan en prensa o cuando el acta está retrasada,
- ofrece más materia prima para intel y análisis narrativo.

Además, esta fuente debe convivir con la decisión ya tomada de no mostrar `intel stream` dentro del dashboard. La integración con intel debe ser de datos reutilizables, no de UI duplicada en dashboard.

---

## Flujo propuesto extremo a extremo

## Etapa 0 — Descubrimiento y catálogo del vídeo

### Objetivo
Registrar que existe un pleno con vídeo asociado y conservar metadatos mínimos antes de descargar o transcribir.

### Entradas esperadas
- Web municipal del ayuntamiento
- YouTube / Vimeo / proveedor embebido municipal
- Portal de transparencia o hemeroteca de plenos
- Identificador del pleno ya existente en actas / sesiones si existe relación previa

### Metadatos mínimos a guardar
- `municipio_id` o código municipal
- `sesion_fecha`
- `sesion_titulo_original`
- `video_source_type` (`youtube`, `vimeo`, `municipal_web`, `uploaded_file`, `unknown`)
- `video_source_url`
- `video_published_at`
- `video_duration_seconds`
- `video_language_hint` (`ca`, `es`, `mixed`, `unknown`)
- `video_status` inicial (`discovered`)
- relación con acta/sesión existente si se puede resolver

### Reglas de negocio
- El vídeo es una fuente complementaria a la sesión/pleno, no una entidad aislada sin contexto.
- Debe intentarse vincular cada vídeo a una sesión concreta por municipio + fecha + título.
- Si no hay match confiable con un pleno ya catalogado, queda en cola de revisión con estado `needs_linking_review`.

---

## Etapa 1 — Captura / acceso al activo audiovisual

### Objetivo
Asegurar acceso reproducible al audio/vídeo que se va a transcribir.

### Modos posibles
1. **Referencia remota sin copia local**
   - útil para PoC o fuentes estables,
   - menor coste inicial,
   - peor resiliencia si el vídeo desaparece.

2. **Copia controlada del audio o vídeo**
   - preferible para producción,
   - permite reintentos, auditoría y reprocesado,
   - facilita separar el coste de transcripción del riesgo de desaparición del enlace original.

### Recomendación
Persistir al menos:
- URL original,
- hash o identificador del activo capturado,
- ruta interna al audio extraído o al vídeo descargado,
- timestamp de captura.

### Estados sugeridos
- `discovered`
- `captured`
- `capture_failed`
- `needs_access_review`

### Observaciones operativas
- Si el proveedor bloquea descarga directa, puede capturarse solo el audio por vía permitida o mantenerse procesamiento on-demand.
- Debe registrarse la licencia/legitimidad de uso del vídeo si la fuente no es claramente institucional.

---

## Etapa 2 — Preparación de audio

### Objetivo
Normalizar el material para transcripción.

### Subpasos
- extraer pista de audio,
- convertir a formato uniforme,
- detectar duración real,
- trocear por bloques temporales si supera el umbral del transcriptor,
- identificar silencios prolongados o cortes.

### Artefactos esperados
- audio maestro normalizado,
- segmentos temporales (`chunk_001`, `chunk_002`, ...),
- metadatos técnicos por segmento.

### Señales útiles
- duración de cada chunk,
- nivel de ruido estimado,
- ratio de voz detectada,
- presencia de múltiples interlocutores.

---

## Etapa 3 — Transcripción automática

### Objetivo
Convertir el audio en texto con timestamps y, cuando sea posible, diarización básica.

### Salida mínima exigible
- transcripción por segmentos temporales,
- texto bruto,
- timestamps de inicio/fin,
- confianza media por segmento o equivalente,
- idioma detectado,
- indicación de solapamientos o zonas dudosas.

### Enfoque recomendado
Hacer la transcripción en dos niveles:

1. **Nivel base**
   - transcript literal por tiempo,
   - suficiente para búsqueda y revisión.

2. **Nivel enriquecido**
   - diarización aproximada,
   - normalización de nombres si se pueden inferir,
   - marcas de incidencias (`inaudible`, `aplaudiments`, `riures`, `talls`, `canvi de parlant`).

### Estados sugeridos
- `transcribed_raw`
- `transcription_low_confidence`
- `transcription_failed`
- `needs_human_review`

### Principios clave
- Nunca usar una transcripción cruda directamente en tendencias sin pasar por control de calidad.
- Conservar siempre el texto bruto original del motor para poder re-evaluar mejoras de prompts o modelos.

---

## Etapa 4 — Revisión humana / QA editorial

### Objetivo
Validar que la transcripción sirve para análisis político sin exigir corrección total palabra por palabra.

### Qué debe revisar una persona
- que el vídeo corresponde realmente al pleno esperado,
- que la cobertura temporal es suficiente,
- que no haya chunks vacíos o corruptos en momentos clave,
- que los temas principales del debate se entienden,
- que nombres de partidos, concejales y conceptos sensibles no estén gravemente deformados,
- que el idioma mixto catalán/castellano no haya roto la inteligibilidad.

### Resultado de revisión
- `approved_for_analysis`
- `approved_with_warnings`
- `rework_required`
- `rejected_for_analysis`

### Motivos típicos de rechazo
- audio casi ininteligible,
- faltan bloques centrales del debate,
- desfase grave entre timestamps y contenido,
- demasiados errores en nombres propios / siglas / conceptos políticos,
- vídeo mal vinculado a otra sesión.

### Importante
La revisión no busca una edición periodística perfecta. Busca decidir si el material es suficientemente fiable para extraer temas y pesos narrativos sin contaminar el sistema.

---

## Etapa 5 — Segmentación analítica del pleno

### Objetivo
Dividir la transcripción aprobada en unidades útiles para extracción de temas.

### Unidades sugeridas
- bloque temporal fijo si no hay estructura mejor,
- intervención por hablante si la diarización es aceptable,
- punto del orden del día si puede alinearse con acta/agenda,
- episodio temático detectado por cambio de asunto.

### Recomendación de diseño
Priorizar una segmentación híbrida:
1. alinear con orden del día cuando exista acta o agenda,
2. dentro de cada punto, segmentar por intervención o subtema,
3. si no existe estructura fiable, usar ventanas temporales con resumen temático.

Esto evita que una transcripción larga acabe como un solo bloque opaco e inutilizable.

---

## Etapa 6 — Extracción de temas, señales y evidencias

### Objetivo
Transformar el texto revisado en señales comparables con las demás fuentes del sistema.

### Salidas analíticas esperadas
Por cada segmento o intervención:
- `tema_canonico`
- `subtema`
- `keywords`
- `resumen`
- `partidos_mencionados`
- `personas_mencionadas`
- `tono_debate` o intensidad
- `evidencia_textual`
- `timestamp_inicio` / `timestamp_fin`
- `source_type = pleno_video`
- `confidence_topic_extraction`

### Señales adicionales útiles para tendencias
- tiempo total dedicado a un tema,
- número de intervenciones por tema,
- presencia transversal de un tema en varios partidos,
- si el tema es reactivo, conflictivo o programático,
- si coincide o contradice lo que recoge el acta estructurada.

### Regla de oro
El vídeo no debe reemplazar al acta; debe complementar y corregir sus zonas ciegas.

---

## Etapa 7 — Asimilación y publicación interna

### Objetivo
Convertir la extracción en una fuente estable para consultas y scoring.

### Qué se publica al sistema
1. **Fuente primaria trazable**
   - vídeo,
   - transcripción revisada,
   - segmentos,
   - evidencias con timestamps.

2. **Fuente derivada para analítica**
   - temas agregados por sesión,
   - métricas por municipio y periodo,
   - señales para tendencias,
   - contexto reutilizable para intel y reputación.

### Regla de publicación
Solo pasan a cálculos estratégicos los vídeos con estado:
- `approved_for_analysis`, o
- `approved_with_warnings` si las advertencias no afectan al tema concreto usado.

---

## Cómo conectar esta fuente con tendencias

## 1. Papel dentro del modelo de tendencias

La fuente `pleno_video` debe entrar como una señal interna adicional, distinta de:
- actas estructuradas,
- prensa,
- redes sociales,
- otras fuentes ya usadas para score estratégico.

No se trata de contar solo menciones, sino de capturar mejor:
- intensidad real del debate,
- tiempo dedicado a un asunto,
- conflicto entre grupos,
- temas que aún no han llegado a medios pero ya dominan el pleno.

## 2. Señales concretas que aporta

### Señales de volumen
- número de segmentos asociados al tema,
- minutos dedicados al tema,
- número de intervenciones vinculadas.

### Señales de prominencia
- si el tema aparece en apertura/cierre,
- si lo trata alcaldía, oposición o varios grupos,
- si genera réplica o debate prolongado.

### Señales de calidad política
- presencia de acusaciones, defensa, conflicto o negociación,
- alineación con agenda mediática externa,
- aparición repetida en distintos municipios en ventana corta.

## 3. Integración conceptual con el score estratégico

Propuesta de tratamiento:
- mantener el score estratégico actual como base,
- añadir un componente normalizado de `pleno_video_signal`,
- limitar su peso inicial para evitar sobreajuste mientras la cobertura es parcial.

Ejemplo conceptual:

```text
strategic_trend_score
  = w1 * internal_actas_signal
  + w2 * media_signal
  + w3 * social_signal
  + w4 * pleno_video_signal
  + ajustes de recencia / expansión territorial / intensidad de conflicto
```

### Recomendación de arranque
- peso inicial moderado,
- solo usar vídeos aprobados,
- calcular también métricas auxiliares visibles para debug:
  - `video_mentions_count`
  - `video_minutes_total`
  - `video_municipalities_count`
  - `video_confidence_avg`

## 4. Prevención de doble conteo

Como acta y vídeo pertenecen a la misma sesión, hay riesgo de inflar un tema dos veces.

### Regla propuesta
- considerar `acta` y `video` como dos vistas de una misma sesión,
- no sumar sin control ambos conteos brutos,
- usar el vídeo como refuerzo de cobertura, intensidad y evidencias, no como simple duplicado de mención.

### Estrategia práctica
- agrupar por `session_source_group_id`,
- si existe acta y vídeo vinculados al mismo pleno:
  - el acta aporta estructura institucional,
  - el vídeo aporta profundidad, duración, tono y omisiones detectadas.

## 5. Uso en dashboard

- El dashboard puede consumir los temas enriquecidos por vídeo dentro del bloque de tendencias.
- No debe reintroducir `intel stream` como bloque separado.
- Si se muestran evidencias, deben presentarse como “discutit al ple” o equivalente, con timestamps trazables.

---

## Cómo conectar esta fuente con intel

## 1. Rol en intel

Intel debe consumir la fuente `pleno_video` como material analítico de soporte para:
- detectar narrativas emergentes,
- localizar clips o citas con timestamp,
- contrastar lo que dice un partido en medios frente a lo que defendió en pleno,
- identificar temas con alto potencial de seguimiento.

## 2. Qué artefactos debería reutilizar intel
- segmentos con tema y resumen,
- evidencias textuales con timestamps,
- nombres de actores mencionados,
- intensidad/conflicto del debate,
- diferencias entre vídeo y acta si existen.

## 3. Casos de uso concretos
- “¿Qué temas está tensando más la oposición en los plenos de las últimas dos semanas?”
- “Enséñame intervenciones sobre seguridad con citas trazables.”
- “Detecta asuntos recurrentes en plenos que todavía tienen poca cobertura mediática.”

## 4. Separación de responsabilidades
- **Tendencias**: ranking y señal agregada.
- **Intel**: exploración, contexto, clipping narrativo, seguimiento cualitativo.

La misma fuente alimenta ambos, pero con salidas distintas.

---

## Criterios mínimos de calidad para usar transcripciones en análisis

Una transcripción solo debe entrar en análisis si cumple un mínimo operativo. No hace falta perfección, pero sí fiabilidad suficiente.

## Umbrales mínimos recomendados

### 1. Cobertura temporal
- Debe cubrir al menos el **80% de la duración relevante** del pleno.
- Si falta el bloque central donde se discuten los temas sustantivos, no se aprueba.

### 2. Inteligibilidad general
- Debe poder entenderse el tema principal de la mayoría de segmentos relevantes.
- Si el texto contiene demasiados huecos (`inaudible`, basura, repeticiones) y no permite identificar asuntos, se rechaza.

### 3. Confianza del motor
- Debe existir una confianza media mínima por transcripción o por segmento.
- Recomendación inicial:
  - aprobar automáticamente solo si la confianza media supera un umbral interno conservador,
  - mandar a revisión obligatoria si cae en franja media,
  - rechazar si cae por debajo del umbral crítico.

## 4. Nombres propios y entidades políticas
- Partidos, cargos y conceptos institucionales clave no deben presentar errores masivos.
- Si “PSC”, “ERC”, “AC”, nombres de alcaldía o concejales aparecen sistemáticamente corrompidos, no usar para extracción automática de temas sensibles.

## 5. Alineación sesión ↔ vídeo
- La fecha, municipio y sesión deben ser coherentes con el vídeo procesado.
- Si no se puede vincular con seguridad razonable al pleno correcto, no pasa a tendencias.

## 6. Trazabilidad
- Todo tema extraído debe poder remontarse a:
  - vídeo origen,
  - tramo temporal,
  - segmento textual concreto.

Sin trazabilidad no debe alimentar capas analíticas de confianza alta.

## 7. Estado editorial final
Solo usar transcripciones con estado final:
- `approved_for_analysis`, o
- `approved_with_warnings` limitado a usos compatibles.

---

## Modelo operativo de revisión

## Prioridades de revisión
1. Plenos de municipios estratégicos.
2. Vídeos donde aparecen temas de alto impacto mediático.
3. Casos en los que vídeo y acta divergen de forma significativa.
4. Plenos detectados como semilla de nuevas tendencias.

## SLA recomendado
- transcripción automática: lo antes posible tras detectar el vídeo,
- revisión humana: dentro de una ventana corta si el tema es sensible o reciente,
- publicación a tendencias: solo tras validación.

## Muestreo de QA continuo
Aunque se aprueben automáticamente algunos casos buenos, conviene:
- re-auditar una muestra semanal,
- medir falsos positivos de tema,
- medir errores por idioma mixto y por nombres propios,
- recalibrar pesos si la cobertura audiovisual aún es desigual entre municipios.

---

## Propuesta de entidades/estados a futuro

Sin fijar aún el esquema definitivo, el diseño apunta a entidades equivalentes a:
- `pleno_videos`
- `pleno_video_assets`
- `pleno_video_transcriptions`
- `pleno_video_review_tasks`
- `pleno_video_segments`
- `pleno_video_topics`

Y estados de ciclo de vida como:
- `discovered`
- `captured`
- `transcribed_raw`
- `needs_human_review`
- `approved_for_analysis`
- `approved_with_warnings`
- `rework_required`
- `rejected_for_analysis`
- `published_to_analytics`

---

## Riesgos y mitigaciones

## Riesgo 1 — Cobertura desigual por municipio
Algunos ayuntamientos tendrán vídeo y otros no.

**Mitigación:**
- tratar la señal de vídeo como enriquecimiento, no como requisito,
- normalizar su peso para no penalizar municipios sin vídeo.

## Riesgo 2 — Doble conteo con actas
La misma sesión podría inflar artificialmente un tema.

**Mitigación:**
- vinculación por sesión,
- score que use vídeo como refuerzo cualitativo/cuantitativo controlado.

## Riesgo 3 — Mala calidad de audio
Los plenos largos o con eco degradan mucho la transcripción.

**Mitigación:**
- revisión humana,
- umbrales mínimos de calidad,
- descarte explícito de material no fiable.

## Riesgo 4 — Coste operacional
Transcribir vídeo largo puede ser caro y lento.

**Mitigación:**
- priorización por municipios/temas estratégicos,
- segmentación,
- reprocesado selectivo.

## Riesgo 5 — Sesgo narrativo por IA
La extracción automática puede sobrerrepresentar temas llamativos.

**Mitigación:**
- mantener evidencia textual y timestamps,
- distinguir claramente entre transcript, resumen y tema inferido,
- revisar muestras y medir desacuerdo humano.

---

## Secuencia recomendada de implementación futura

### Fase 1 — PoC controlada
- seleccionar 5-10 municipios con vídeo público,
- registrar catálogo manual o semiautomático,
- transcribir y revisar,
- medir cobertura real frente a acta.

### Fase 2 — Fuente analítica interna
- publicar temas de vídeo como fuente separada,
- exponer métricas auxiliares para debug de tendencias,
- validar que no rompe el scoring estratégico actual.

### Fase 3 — Integración operativa completa
- cola estable de captura/transcripción/revisión,
- consumo por dashboard e intel,
- trazabilidad de evidencias y uso editorial más fino.

---

## Decisiones de diseño cerradas en esta iteración

1. Los vídeos de plenos se tratarán como **fuente complementaria** a actas, no sustitutiva.
2. Ninguna transcripción cruda alimentará tendencias sin control de calidad.
3. La integración con tendencias será como **señal adicional normalizada** y con prevención explícita de doble conteo por sesión.
4. La integración con intel será como **fuente exploratoria y de evidencia trazable**, no como bloque visual nuevo en dashboard.
5. La aceptación analítica exigirá cobertura suficiente, inteligibilidad, confianza mínima, vinculación correcta a sesión y trazabilidad por timestamps.
