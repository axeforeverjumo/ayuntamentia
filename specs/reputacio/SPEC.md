# SPEC — Reputació

## 2026-05-09 — Incorporación de fuentes sociales relevantes (exploración)

### Objetivo
Definir cómo incorporar señales de redes sociales dentro del módulo de reputación, delimitando qué perfiles son fuentes válidas, cómo medir su relevancia/influencia y cómo acotar cobertura por municipio y temática, minimizando ruido y contenido no verificable.

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación (sin cambios de código de producción).
- Se diseña un marco operativo para futuras implementaciones en ingestión, scoring y workflows editoriales.
- Se cubre el checklist solicitado:
  - Tipos de perfiles admitidos.
  - Señales de relevancia e influencia.
  - Alcance por municipio y temática.

---

## 1) Tipos de perfiles sociales admitidos como fuente reputacional

Se define una taxonomía de fuentes sociales con política de admisión (permitido / condicionado / excluido):

### 1.1 Fuentes **permitidas** (alta prioridad)
1. **Cuentas oficiales institucionales**
   - Ayuntamientos, plenos, áreas de gobierno, partidos locales con cuenta verificada u oficial.
   - Valor: máxima trazabilidad, alta verificabilidad.

2. **Representantes públicos identificables**
   - Alcaldía, concejalías, portavocías, diputados vinculados al municipio/comarca.
   - Requisito: identidad verificable y vínculo público documentado.

3. **Medios de comunicación locales y comarcales**
   - Cabeceras locales, radios municipales, canales territoriales.
   - Requisito: historial editorial consistente + publicación periódica.

4. **Periodistas/analistas con cobertura local recurrente**
   - Perfiles personales con firma profesional y trazabilidad de piezas.
   - Requisito: al menos una parte sustancial del contenido sobre el territorio objetivo.

5. **Entidades cívicas o sectoriales con impacto local**
   - Asociaciones vecinales, plataformas de comercio, entidades culturales/deportivas con peso social.
   - Requisito: actividad pública continuada y comunidad real identificable.

### 1.2 Fuentes **condicionadas** (requieren validación reforzada)
1. **Influencers locales/generalistas**
   - Se admiten si demuestran influencia real sobre conversación pública municipal.
   - Exigen validación cuantitativa + revisión humana inicial.

2. **Creadores de contenido político no periodístico**
   - Se admiten con límites: sólo para detección de clima/conversación, no como verdad factual primaria.

3. **Páginas agregadoras/curación**
   - Uso auxiliar para detección de tendencias; nunca como única fuente de hechos.

### 1.3 Fuentes **excluidas** (ruido/no verificables)
- Cuentas anónimas sin historial verificable.
- Perfiles con patrones claros de desinformación o manipulación coordinada.
- Canales que no permiten trazabilidad de origen (capturas sin contexto, cadenas sin fuente, rumores).
- Contenido puramente meme/sátira no etiquetado o sin utilidad reputacional operativa.

---

## 2) Señales para medir relevancia e influencia

Se propone una evaluación en dos capas: **eligibilidad** (puede entrar al sistema) y **prioridad** (cuánto pesa en análisis).

### 2.1 Señales de elegibilidad (gating)
Una fuente entra solo si supera umbrales mínimos:

- **Identidad verificable** (sí/no)
- **Trazabilidad de fuente** (sí/no)
- **Actividad reciente** (publicaciones en ventana rolling, p.ej. 90 días)
- **Coherencia temática mínima** (porcentaje de publicaciones ligadas a municipio/política local)
- **Riesgo de desinformación** por historial (bajo/medio/alto; alto = excluir)

Si falla identidad o trazabilidad, la fuente se descarta automáticamente.

### 2.2 Señales de prioridad (scoring)
Para fuentes elegibles:

1. **Alcance potencial**
   - Seguidores, suscriptores, audiencia estimada (normalizada por plataforma).

2. **Interacción cualificada**
   - Engagement rate real (comentarios/reacciones compartidos), corrigiendo picos artificiales.

3. **Centralidad local**
   - Proporción de contenido sobre el municipio/comarca objetivo.

4. **Credibilidad histórica**
   - Ratio de publicaciones confirmables vs. desmentidas/ambiguas.

5. **Capacidad de arrastre narrativo**
   - Frecuencia con la que su contenido es citado por medios, actores políticos o comunidades locales.

6. **Temporalidad del impacto**
   - Peso adicional a publicaciones recientes con alta aceleración de difusión.

### 2.3 Fórmula orientativa (para implementación posterior)
`score_fuente = 0.25 alcance + 0.20 interacción + 0.20 centralidad_local + 0.20 credibilidad + 0.10 arrastre + 0.05 temporalidad`

Notas:
- Escalas normalizadas 0-100.
- Si `credibilidad < umbral_min`, se limita score máximo (“techo reputacional”) o se excluye.
- Revisión humana obligatoria para top señales que disparen alertas críticas.

---

## 3) Alcance por municipio y temática

### 3.1 Segmentación territorial
Cada fuente y cada publicación debe etiquetarse por:
- **Municipio principal**
- **Municipios secundarios** (si aplica)
- **Comarca/provincia**
- **Ámbito**: local / comarcal / autonómico / estatal

Regla operativa:
- En reputación municipal, **priorizar señales locales/comarcales** frente a señales estatales salvo crisis de gran magnitud.

### 3.2 Segmentación temática
Taxonomía inicial recomendada:
- Governança i transparència
- Seguretat i convivència
- Neteja/espai públic
- Fiscalitat/pressupost
- Mobilitat
- Habitatge
- Comerç/empresa
- Educació/cultura/esport
- Salut/serveis socials
- Identitat/valors

Cada post puede tener tema primario + secundarios.

### 3.3 Matriz de cobertura mínima
Por municipio objetivo, mantener cobertura mínima en:
1. Al menos 3-5 fuentes sociales locales elegibles.
2. Al menos 2 fuentes de contraste (medio local o cuenta institucional).
3. Cobertura de temas críticos del municipio (no solo agenda nacional).

Si no se alcanza cobertura mínima, marcar el municipio como **“visibilidad insuficiente”** y bajar confianza analítica.

---

## 4) Diseño funcional de los módulos solicitados

### 4.1 Módulo A — Limpiar reputación
Objetivo: detectar, verificar y neutralizar señales negativas o falsas antes de que escalen.

Entradas:
- Menciones negativas de alta propagación.
- Alertas de narrativas hostiles.
- Señales de contradicción con hechos verificables.

Proceso:
1. Detección temprana (trending local).
2. Clasificación: crítica legítima vs. desinformación vs. ruido.
3. Verificación de hechos (fuente oficial/medio fiable).
4. Propuesta de respuesta: rectificación, contextualización, silencio estratégico o escalado.
5. Seguimiento de impacto post-respuesta.

Salidas:
- Prioridad de incidentes reputacionales.
- Playbook de respuesta por tipo de incidente.
- Indicador de “fuego activo/apagado”.

### 4.2 Módulo B — Amplificar difusión (altavoz)
Objetivo: convertir oportunidades positivas en alcance reputacional útil.

Entradas:
- Logros de gestión verificables.
- Ventanas de agenda favorables.
- Voces aliadas de alta credibilidad local.

Proceso:
1. Detección de oportunidad.
2. Selección de narrativa y prueba de veracidad.
3. Selección de canales/perfiles para difusión.
4. Secuencia de publicación (timing + formatos).
5. Medición de lift reputacional.

Salidas:
- Cola priorizada de oportunidades.
- Recomendación de portavoces y formatos.
- Métricas de amplificación efectiva.

---

## 5) Reglas anti-ruido y anti-basura (calidad de señal)

1. **No usar una única fuente social para afirmar hechos sensibles.**
2. **Exigir corroboración** (mínimo 2 fuentes, una de alta credibilidad) en incidencias críticas.
3. **Separar hecho vs. opinión** en el etiquetado.
4. **Bloquear contenido sin contexto verificable** (capturas recortadas, audios anónimos, etc.).
5. **Auditar sesgo de plataforma** (no extrapolar una red al sentir general del municipio).
6. **Registrar nivel de confianza** por señal: alto/medio/bajo.

---

## 6) KPIs propuestos para seguimiento reputacional social

- % de señales sociales verificadas sobre total capturado.
- Tiempo medio de detección a clasificación de incidente.
- Tasa de incidentes neutralizados (<72h).
- Lift de alcance en campañas de altavoz.
- Cobertura territorial real por municipio (fuentes activas elegibles).
- Ratio de ruido descartado vs. señal útil.

---

## 7) Decisiones técnicas (documentales) tomadas

1. Priorizar **prensa local + señal social local verificable** como base reputacional municipal.
2. Establecer un **gating estricto** para excluir ruido no verificable.
3. Modelar reputación social en dos carriles operativos diferenciados:
   - limpieza (defensivo)
   - amplificación (ofensivo)
4. Introducir scoring con componente de credibilidad para minimizar errores.
5. Exigir clasificación territorial y temática para evitar análisis genérico sin utilidad táctica.

---

## 8) Archivos modificados

- `specs/reputacio/SPEC.md` (creado): especificación de incorporación de fuentes sociales relevantes y delimitación de fuentes válidas/útiles.

---

## 9) Pendiente para futuras iteraciones (sin implementar en esta tarea)

- Definir tabla/catálogo persistente de fuentes sociales y campos exactos.
- Implementar pipeline de ingestión por plataforma y reglas de deduplicación.
- Integrar score social en ranking reputacional existente.
- Diseñar validación humana asistida para incidentes de alta criticidad.
