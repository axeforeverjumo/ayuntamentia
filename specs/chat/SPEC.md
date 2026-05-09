# SPEC — Integración del RAG del partido en chat

## 2026-05-09 — Definición de integración del RAG del partido para coherencia política y veracidad

### Contexto y objetivo
Este documento define cómo nutrir el chat (`/chat`) con información del partido cliente para reforzar la coherencia con su línea política, minimizando alucinaciones y asegurando que los argumentarios y propuestas de acción se basen en evidencia verificable.

Se prioriza:
1. Veracidad (no inventar, no extrapolar sin soporte).
2. Coherencia discursiva con el partido cliente.
3. Recuperación preferente de fuentes oficiales y vigentes.

---

### 1) Tipos de documentos y fuentes que alimentarán el RAG

#### 1.1 Fuentes oficiales primarias (prioridad máxima)
- Programa electoral vigente del partido (municipal/autonómico/nacional según uso).
- Ponencias políticas aprobadas en congresos/asambleas.
- Estatutos y documentos doctrinales oficiales.
- Notas de prensa y comunicados oficiales publicados en web del partido.
- Intervenciones institucionales oficiales del partido (portavocías, ruedas de prensa, comparecencias publicadas por canales oficiales).
- Propuestas registradas oficialmente (mociones, enmiendas, iniciativas) cuando estén firmadas por representantes del partido.

#### 1.2 Fuentes oficiales secundarias (alta prioridad)
- Publicaciones verificadas en redes oficiales del partido (cuentas verificadas o listadas en web oficial).
- Dossiers de campaña aprobados internamente para uso público.
- FAQ/argumentarios internos validados por dirección política para portavocía.

#### 1.3 Fuentes de contraste y contexto (prioridad media-baja, nunca base única para afirmaciones del partido)
- Cobertura de prensa sobre posicionamientos del partido.
- Entrevistas en medios (si no están en canal oficial, requieren verificación cruzada).
- Informes externos que contextualicen propuestas (economía, seguridad, vivienda, etc.).

#### 1.4 Fuentes excluidas o restringidas
- Filtraciones no verificadas.
- Recortes sin autoría/fecha/fuente trazable.
- Contenido viral sin respaldo oficial.
- Resúmenes internos no aprobados por responsables políticos.

Regla operativa: **una afirmación sobre la postura del partido solo puede salir del chat con respaldo en fuente oficial primaria o en dos fuentes secundarias verificadas y no contradictorias.**

---

### 2) Metadatos y criterios de versionado del discurso político

Para cada documento ingerido en el RAG se registrarán metadatos obligatorios:

#### 2.1 Metadatos obligatorios por documento
- `doc_id` (UUID interno estable)
- `tenant_party` (ej. AC, PP, PSC)
- `doc_type` (programa, ponencia, nota_prensa, intervencion, propuesta, etc.)
- `title`
- `source_url` (o referencia documental interna trazable)
- `source_domain`
- `is_official_source` (boolean)
- `publisher_entity` (órgano o cuenta oficial emisora)
- `author_speaker` (si aplica)
- `publication_date`
- `effective_from` / `effective_to` (vigencia política)
- `language`
- `territorial_scope` (municipal/provincial/autonómico/estatal)
- `topic_tags` (vivienda, seguridad, fiscalidad, migración, etc.)
- `validation_status` (`pending_review`, `validated`, `rejected`)
- `validated_by` + `validated_at`
- `checksum` (detección de cambios)
- `version_label` (ej. `2026.03-v2`)
- `supersedes_doc_id` (si reemplaza versión)
- `linea_politica_score` (0-1; coherencia con marco oficial tras revisión humana)

#### 2.2 Metadatos por chunk (para trazabilidad en respuesta)
- `chunk_id`
- `doc_id`
- `chunk_index`
- `char_range`
- `semantic_section` (diagnóstico, propuesta, mensaje_clave, dato, cita)
- `stance_vector` (embedding + etiqueta de postura cuando aplique)
- `quote_ready` (si el texto puede citarse literal)

#### 2.3 Criterios de versionado
- Modelo append-only: nunca sobreescribir contenido histórico; crear nueva versión.
- `supersedes_doc_id` obligatorio para reemplazos.
- Solo una versión “vigente” por combinación (`tenant_party`, `doc_type`, `territorial_scope`, `topic_tags` principales) cuando aplique.
- Si hay contradicción entre versiones, priorizar la más reciente **validada** y marcar advertencia de cambio de postura.
- Mantener historial para auditoría: qué cambió, cuándo y quién validó.

#### 2.4 Criterios de validez temporal
- El retrieval debe penalizar documentos fuera de vigencia (`effective_to` vencido).
- Permitir uso histórico explícito solo cuando el prompt pida comparación temporal.

---

### 3) Estrategia de recuperación (retrieval) priorizando fuentes oficiales

#### 3.1 Pipeline de recuperación propuesto
1. **Clasificación de intención** del prompt (argumentario, contraste, propuesta de acción, resumen, fact-check).
2. **Filtrado duro por tenant** (`tenant_party`) y por estado de validación (`validated`).
3. **Priorización por oficialidad y vigencia** antes del ranking semántico.
4. **Búsqueda híbrida** (semántica + keywords + filtros estructurados).
5. **Re-ranking de veracidad** con score compuesto.
6. **Generación condicionada por evidencia** (solo responde afirmaciones con soporte suficiente).

#### 3.2 Score de recuperación recomendado
`final_score = 0.40 * semantic_score + 0.30 * officiality_score + 0.20 * recency_score + 0.10 * validation_score`

Donde:
- `officiality_score`: 1.0 para fuente oficial primaria, 0.7 secundaria, <=0.4 contraste.
- `recency_score`: decaimiento temporal según `publication_date` y `effective_*`.
- `validation_score`: 1.0 validado humano, 0.5 auto-validado, 0 rechazado.

Regla de seguridad: si no hay mínimo `N=2` chunks válidos de fuente oficial/validada para una afirmación sensible, el chat debe responder con cautela (“No tengo evidencia suficiente para afirmarlo con seguridad”).

#### 3.3 Política de respuesta anti-alucinación
- Toda afirmación de postura del partido debe mapear a citas/chunks recuperados.
- Si hay conflicto entre fuentes, exponer conflicto y pedir criterio temporal/político.
- Prohibido inventar cifras, fechas, votaciones o citas literales.
- En propuestas de acción (social media, nota de prensa):
  - Separar explícitamente “hechos verificados” de “recomendaciones estratégicas”.
  - Anclar recomendaciones en 2-3 evidencias oficiales recientes.
  - Incluir tono alineado al partido sin atribuir hechos no verificados.

#### 3.4 Modo “Agencia de alto rendimiento” para acciones en canales
Para solicitudes de ejecución comunicativa:
- Entradas mínimas: objetivo político, audiencia, canal, ventana temporal, constraints reputacionales.
- Recuperar primero: postura oficial vigente + mensajes marco + precedentes comunicativos del partido.
- Salida estructurada:
  1) Insight basado en evidencia,
  2) Mensaje clave,
  3) Piezas sugeridas por canal,
  4) Riesgos reputacionales,
  5) Evidencias citadas.

---

### 4) Criterios de aceptación de la integración
- El 100% de respuestas de argumentario incluyen trazabilidad de fuente (`doc_id`, `source_url`, fecha).
- El sistema rechaza afirmaciones sin respaldo suficiente en corpus validado.
- La recuperación prioriza documentos oficiales del cliente frente a prensa/contexto.
- El historial de versiones permite auditar cambios de postura y vigencia.

---

### Archivos modificados
- `specs/chat/SPEC.md` (creación): especificación funcional/técnica de integración del RAG del partido en chat.

### Decisiones técnicas
- Tarea tratada como **EXPLORACIÓN** (documentación), sin cambios en código de producción.
- Enfoque “official-first retrieval” con scoring compuesto y umbrales de seguridad anti-alucinación.
- Versionado append-only con metadatos de vigencia y validación humana para trazabilidad política.
- La estrategia se alinea con el contexto multi-tenant existente (`CLIENT_PARTIDO` / `CLIENT_NOMBRE`), pero prioriza el corpus del cliente activo como filtro duro de recuperación.

### Próximos pasos de implementación sugeridos
1. Crear esquema persistente para documentos/chunks/versiones del corpus político del cliente.
2. Añadir pipeline de validación humana antes de marcar contenido como `validated`.
3. Implementar retrieval híbrido con filtros por `tenant_party`, `validation_status`, `territorial_scope`, `topic_tags` y vigencia.
4. Exponer trazabilidad de evidencias en la respuesta del chat para auditoría y review.

---

## 2026-05-09 — Diseño de salida de acciones de canal con calidad de agencia

### Contexto y objetivo
Se define un estándar operativo para que las propuestas de comunicación generadas desde `/chat` (social media, notas de prensa y acciones de difusión) tengan **calidad equivalente a agencia de alto prestigio**, manteniendo como requisito no negociable la **veracidad 100% sustentada en contexto real**.

Este bloque complementa la capa RAG anti-alucinación: no solo importa “qué decir”, sino **cómo accionarlo por canal** con rigor, claridad y ejecución inmediata.

### 1) Plantillas de salida por canal

#### 1.1 Plantilla — Social media (post unitario o hilo)
**Campos obligatorios:**
- `objetivo_politico`: qué se busca (informar, movilizar, contraste, reputación, respuesta a crisis).
- `audiencia_objetivo`: segmento (vecinos, militancia, prensa local, jóvenes, etc.).
- `canal`: X / Instagram / Facebook / LinkedIn / WhatsApp broadcast.
- `angulo_estrategico`: enfoque principal alineado con postura oficial.
- `mensaje_clave`: 1 frase nuclear (máx. 20-25 palabras).
- `copy_propuesto`: texto final adaptado al canal.
- `variantes_ab`: mínimo 2 versiones alternativas de copy.
- `cta`: llamada a la acción concreta.
- `activos_sugeridos`: imagen/video/carrusel + briefing creativo breve.
- `riesgos_reputacionales`: posibles críticas previsibles y mitigación.
- `evidencias`: 2-3 referencias verificadas (doc_id/url/fecha).
- `nivel_confianza`: alto/medio/bajo según solidez de evidencia.

**Formato de entrega recomendado:**
1) Diagnóstico breve (2-3 líneas)
2) Copy final
3) Variantes A/B
4) Recomendación visual
5) Riesgos + respuesta preventiva
6) Evidencias citadas

#### 1.2 Plantilla — Nota de prensa
**Campos obligatorios:**
- `titular`: informativo, verificable y sin hipérboles no sustentadas.
- `subtitular`: contexto + impacto ciudadano.
- `lead`: 4-6 líneas con qué/quién/cuándo/dónde/por qué.
- `cuerpo`: bloques por idea (hecho, posición política, propuesta, impacto).
- `declaracion_portavoz`: quote borrador (señalada como “pendiente validación” si no existe cita real).
- `datos_clave`: cifras con fuente explícita.
- `preguntas_dificiles_previstas`: objeciones de prensa + respuesta sugerida.
- `kit_difusion`: versión corta para redes + asunto email + bullet points para portavocía.
- `evidencias`: fuentes oficiales y fecha de vigencia.
- `control_legal_reputacional`: checklist de riesgo difamación/desinformación.

**Formato de entrega recomendado:**
1) Titular/subtitular
2) Lead
3) Cuerpo redactado listo para revisión
4) Q&A de riesgo
5) Kit de distribución
6) Evidencias

#### 1.3 Plantilla — Acciones de difusión multicanal
**Campos obligatorios:**
- `objetivo_campana` (SMART)
- `ventana_temporal` (hitos D-3, D-1, D0, D+1)
- `canales_activados` (owned/earned/paid)
- `secuencia_acciones` (pasos accionables con responsable sugerido)
- `dependencias` (material creativo, validación jurídica, disponibilidad portavoz)
- `kpi_operativos` (alcance, engagement, ratio de cobertura, sentimiento)
- `riesgos_y_contingencias`
- `criterio_de_parada` (cuándo escalar, pausar o corregir)
- `evidencias_base`

**Formato de entrega recomendado:** tabla por fases:
- Fase
- Acción
- Responsable
- SLA
- KPI esperado
- Riesgo
- Evidencia que la respalda

### 2) Criterios de tono, calidad y accionabilidad por canal

#### 2.1 Tono
- **Institucional**: precisión máxima, lenguaje sobrio, foco en hechos públicos.
- **Movilizador**: llamada a participación sin manipulación ni datos no confirmados.
- **Respuesta crítica/contraste**: firmeza argumental sin ataques ad hominem ni afirmaciones no demostrables.
- **Proximidad local**: ejemplos concretos de impacto ciudadano y lenguaje comprensible.

Regla: el tono debe ajustarse al canal, pero **nunca** degradar veracidad ni respeto institucional.

#### 2.2 Calidad mínima exigida (estándar “agencia top”)
Toda propuesta debe cumplir:
1. **Claridad**: mensaje entendible en primera lectura.
2. **Pertinencia**: conectada al contexto político real del momento.
3. **Diferenciación**: ángulo estratégico explícito (por qué este mensaje y no otro).
4. **Ejecutabilidad**: lista para publicar o revisar (sin vaguedades).
5. **Medibilidad**: KPI y criterio de éxito definidos.
6. **Defendibilidad**: cada afirmación importante tiene soporte verificable.

#### 2.3 Accionabilidad por canal
- Cada salida debe incluir: “qué publicar”, “cuándo”, “con qué activo”, “quién valida”, “qué medir”.
- Prohibidas recomendaciones genéricas tipo “hacer campaña en redes” sin secuencia concreta.
- Si faltan datos clave, la salida debe bloquear ejecución y pedir inputs mínimos.

### 3) Controles para sustentar propuestas en contexto real

#### 3.1 Evidencia mínima obligatoria
Antes de proponer acciones, el sistema debe disponer de:
- mínimo 2 evidencias oficiales válidas y vigentes para el tema,
- consistencia temporal (sin contradicción con versión política vigente),
- trazabilidad (`doc_id`/`source_url`/fecha).

Si no se cumple, respuesta obligatoria:
- “No hay evidencia suficiente para recomendar publicación de forma segura.”
- listado de datos faltantes.

#### 3.2 Semáforo de confianza de propuesta
- **Verde**: evidencia oficial suficiente, contexto vigente, bajo riesgo de disputa factual.
- **Ámbar**: evidencia parcial o contexto cambiante; requiere validación humana previa.
- **Rojo**: evidencia insuficiente/contradictoria; no se recomienda publicar.

#### 3.3 Guardrails anti-alucinación aplicados a contenido de canal
- No inventar citas de portavoces.
- No inventar cifras ni porcentajes.
- No inferir posicionamientos no explicitados en fuentes oficiales.
- Separar explícitamente “hecho verificado” de “recomendación estratégica”.
- Incluir sección “supuestos” cuando se use información incompleta.

### 4) Checklist de aceptación (QA de salida)
Una propuesta de canal se considera apta si cumple todos:
- [ ] Incluye plantilla completa del canal solicitado.
- [ ] Tiene CTA y siguiente paso operativo.
- [ ] Identifica riesgos reputacionales y mitigación.
- [ ] Cita evidencias verificables y vigentes.
- [ ] Declara nivel de confianza (verde/ámbar/rojo).
- [ ] No contiene afirmaciones sin respaldo documental.

### Archivos modificados
- `specs/chat/SPEC.md` (actualización): se añade estándar de salidas por canal con enfoque “calidad de agencia” y controles de veracidad contextual.

### Decisiones técnicas
- Cambio de tipo **documental/especificación** (sin tocar runtime) para mantener alcance del brief.
- Diseño de plantillas estructuradas para facilitar implementación posterior en prompts/formatters.
- Criterios de bloqueo explícitos cuando no exista evidencia suficiente.
- Se mantiene coherencia con el enfoque anti-alucinación definido en la sección previa del SPEC.
