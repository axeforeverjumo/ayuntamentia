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

## 1) Contexto revisado en el repositorio

Archivos auditados para esta definición:
- `api/src/routes/reputacio.py`
- `api/src/services/reputacio_sources.py`
- `README.md`

Conclusiones del estado actual:
- El backend de reputación ya distingue entre `premsa` y `xarxes` en el catálogo de fuentes expuesto por `/api/reputacio/sources`.
- Ya existe una primera base documental/técnica para redes sociales en `SOCIAL_SOURCE_CATALOG`, pero es todavía genérica y no delimita el marco editorial completo solicitado en el brief.
- La plataforma actual prioriza prensa y fuentes contrastables; por tanto, las redes sociales deben entrar como **señal reputacional asistida y filtrada**, no como fuente automática de verdad factual.

---

## 2) Tipos de perfiles sociales admitidos como fuente reputacional

Se define una taxonomía de fuentes sociales con política de admisión: **admitida**, **condicionada** o **excluida**.

### 2.1 Fuentes admitidas

1. **Cuentas institucionales oficiales**
   - Ayuntamientos, alcaldías, áreas de gobierno, plenos, grupos municipales y partidos locales oficiales.
   - Uso principal:
     - confirmación de posicionamientos públicos
     - detección de agenda
     - contraste de incidentes
   - Valor reputacional: **muy alto** por trazabilidad y relación directa con el municipio.

2. **Cargos públicos y portavoces identificables**
   - Alcaldía, concejalías, portavocías, diputados ligados al territorio, perfiles oficiales de candidatos.
   - Requisitos:
     - identidad pública verificable
     - vínculo político o institucional demostrable
     - actividad real y reciente

3. **Medios locales y comarcales presentes en redes**
   - Páginas o cuentas sociales de periódicos locales, radios municipales, canales comarcales o cabeceras territoriales.
   - Uso principal:
     - amplificar cobertura local que a menudo no aparece en prensa nacional
     - detectar focos reputacionales en municipios pequeños

4. **Periodistas locales o analistas de territorio**
   - Perfiles personales con firma reconocible y cobertura recurrente del municipio o comarca.
   - Requisito clave: su contenido debe ser rastreable a trabajo periodístico, observación directa o fuente atribuida.

5. **Entidades cívicas, vecinales o sectoriales con influencia local real**
   - Asociaciones de vecinos, comerciantes, AMPAs, plataformas sociales, clubes o entidades culturales/deportivas con peso comunitario.
   - Uso principal:
     - detectar conflictos de convivencia, limpieza, seguridad, equipamientos, movilidad o servicios
     - medir clima social y capacidad de movilización local

### 2.2 Fuentes admitidas con validación reforzada

1. **Influencers locales o comarcales**
   - Admitidos solo si cumplen al menos varios indicadores de influencia real:
     - audiencia local significativa
     - engagement sostenido no artificial
     - recurrencia temática sobre el territorio
     - identidad conocida o verificable
   - No deben tratarse como fuente primaria de hechos sin contraste.

2. **Creadores de contenido político no periodístico**
   - Útiles para detectar narrativa, framing, ataques o oportunidades de difusión.
   - Limitación: valen como **termómetro narrativo**, no como prueba factual suficiente.

3. **Páginas agregadoras o curadoras locales**
   - Solo como radar de conversación.
   - Requieren comprobación posterior en fuentes originales.

### 2.3 Fuentes excluidas

- Cuentas anónimas sin identidad comprobable.
- Bots o redes con comportamiento coordinado artificial.
- Páginas dedicadas a rumor, bulo, captura descontextualizada o viralidad sin fuente.
- Perfiles hiperpartidistas opacos que reciclan acusaciones sin evidencia.
- Cuentas de sátira, memes o entretenimiento sin valor operativo reputacional.
- Reposts masivos sin autoría original ni contexto temporal/geográfico.

---

## 3) Señales para medir relevancia e influencia

Se propone separar las señales en dos niveles:
1. **gating editorial**: determina si una fuente puede entrar
2. **scoring reputacional**: determina cuánto pesa dentro del análisis

### 3.1 Gating editorial mínimo

Una fuente social solo puede entrar al sistema si cumple estos mínimos:

- **Identidad verificable**
  - perfil oficial, periodista identificado, entidad conocida o persona públicamente reconocible
- **Trazabilidad de origen**
  - sus afirmaciones remiten a hechos, documentos, imágenes contextualizadas o fuente primaria/localizable
- **Actividad reciente**
  - publicaciones dentro de una ventana operativa, por ejemplo últimos 90 días
- **Afinidad territorial suficiente**
  - parte relevante de su contenido se refiere al municipio, comarca o ámbito temático observado
- **Historial aceptable de credibilidad**
  - no acumula patrones consistentes de desinformación o manipulación

Regla bloqueante:
- si falla **identidad verificable** o **trazabilidad**, la fuente queda excluida

### 3.2 Señales de influencia/relevancia para el scoring

1. **Alcance potencial**
   - seguidores, suscriptores o audiencia estimada ajustada por plataforma
   - no se usa sola; evita premiar volumen vacío

2. **Interacción cualificada**
   - comentarios, compartidos, guardados, respuestas o menciones con continuidad
   - debe corregirse por picos artificiales o engagement sospechoso

3. **Centralidad geográfica**
   - peso del municipio/comarca objetivo dentro del total de publicaciones
   - una cuenta generalista con 2 posts locales no debe pesar igual que una cuenta centrada en el territorio

4. **Centralidad temática**
   - recurrencia en temas relevantes para reputación política:
     - seguretat i convivència
     - neteja i espai públic
     - habitatge
     - mobilitat
     - fiscalitat
     - transparència
     - comerç/empresa
     - serveis socials
     - identitat/valors

5. **Credibilidad histórica**
   - ratio de publicaciones verificables
   - número de rectificaciones necesarias
   - consistencia entre afirmaciones y hechos observables

6. **Capacidad de arrastre narrativo**
   - cuánto de su contenido es citado, replicado o contestado por medios, partidos, entidades o conversación local

7. **Persistencia temporal**
   - influencia sostenida en semanas/meses, no solo un pico aislado

8. **Señal de activación reputacional**
   - capacidad para abrir crisis, acelerar indignación, legitimar relato o generar oportunidad favorable

### 3.3 Fórmula orientativa para futura implementación

Modelo inicial recomendado:

`score_fuente = 0.20 alcance + 0.20 interacción + 0.20 centralidad_geográfica + 0.15 centralidad_tematica + 0.15 credibilidad + 0.05 arrastre + 0.05 persistencia`

Reglas adicionales:
- si la credibilidad cae por debajo de un umbral, la fuente no puede superar un techo de score
- para incidentes críticos, toda señal social relevante debe pasar por validación humana antes de activar recomendación operativa

---

## 4) Alcance por municipio y temática

### 4.1 Cobertura territorial

Cada fuente social y cada señal capturada debe etiquetarse por:
- municipio principal
- municipios secundarios si aplica
- comarca
- provincia/demarcación
- ámbito: local / comarcal / catalán / estatal

Regla de prioridad territorial:
- Para reputación municipal, una fuente local o comarcal verificable debe pesar más que una fuente estatal salvo que el incidente ya haya escalado de manera clara a conversación autonómica o nacional.

### 4.2 Cobertura mínima por municipio

Para considerar que un municipio tiene una base social operativa suficiente, se recomienda:
- al menos **3 fuentes sociales locales/comarcales elegibles**
- al menos **1 cuenta institucional o cargo público verificable**
- al menos **1 fuente de contraste** adicional, preferentemente medio local o entidad con legitimidad comunitaria

Si no se alcanza ese umbral, el municipio debe quedar marcado como:
- `cobertura_social_insuficiente`
- y cualquier conclusión reputacional derivada debe mostrar confianza reducida

### 4.3 Cobertura temática

Taxonomía inicial para clasificación temática de señales sociales:
- governança i transparència
- seguretat i convivència
- neteja i espai públic
- fiscalitat i pressupost
- mobilitat
- habitatge
- comerç i activitat econòmica
- educació, cultura i esport
- salut i serveis socials
- identitat, cohesió i valors
- urbanisme i equipaments
- medi ambient i civisme

Cada publicación debería llevar:
- tema principal
- temas secundarios
- nivel de sensibilidad reputacional: bajo / medio / alto / crítico

---

## 5) Qué señales sociales son válidas y útiles

### 5.1 Señales válidas

Se consideran útiles para reputación:
- denuncias o incidencias con fuente observable y contexto claro
- publicaciones que muestran respuesta social organizada o crítica vecinal trazable
- posicionamientos públicos de actores con capacidad de agenda local
- cobertura o eco de medidas municipales en cuentas influyentes del territorio
- oportunidades favorables verificables para amplificación política
- cambios de tono o intensidad en conversación local repetidos en varias fuentes elegibles

### 5.2 Señales no válidas o de bajo valor

Se deben descartar o dejar en observación:
- mensajes sin fecha, lugar o fuente
- capturas recortadas sin enlace al contenido original
- acusaciones graves no corroboradas
- ruido partidista repetitivo sin novedad factual
- campañas artificiales de engagement dudoso
- contenido viral genérico sin relación operativa con el municipio objetivo

### 5.3 Regla de comprobación de realidad

Ninguna señal social sensible debe transformarse directamente en verdad reputacional si no hay una de estas validaciones:
- fuente institucional
- medio fiable/local contrastable
- evidencia directa contextualizada
- coincidencia consistente entre varias fuentes elegibles

---

## 6) Encaje con los dos módulos pedidos en el brief

### 6.1 Módulo `limpiar reputación`

Objetivo:
- detectar fuegos reputacionales
- separar crítica legítima de basura, bulo o ataque coordinado
- priorizar respuesta con el menor margen de error posible

Entradas prioritarias:
- cuentas institucionales y portavoces
- medios locales en redes
- entidades con legitimidad comunitaria
- perfiles influyentes verificados con capacidad real de propagación

Reglas operativas:
- no actuar sobre una sola cuenta dudosa
- exigir contraste para incidencias sensibles
- etiquetar cada incidente como:
  - crítica legítima
  - error real de gestión
  - narrativa adversa amplificada
  - rumor/no verificable
  - oportunidad de rectificación rápida

### 6.2 Módulo `altavoz`

Objetivo:
- identificar oportunidades reputacionales positivas
- amplificar gestión, agenda y narrativas favorables donde exista opción real de ganar imagen y voto

Entradas prioritarias:
- cobertura favorable verificable
- cuentas locales con buena credibilidad
- líderes comunitarios o páginas con capacidad de difusión útil
- ventanas temáticas donde un mensaje municipal pueda escalar con legitimidad

Reglas operativas:
- amplificar solo hechos comprobables
- preferir nodos locales con reputación real antes que cuentas grandes pero desconectadas del territorio
- medir no solo alcance, sino calidad de la legitimación obtenida

---

## 7) Reglas de limpieza de ruido y minimización de errores

1. **No usar una sola cuenta social como base para conclusiones críticas.**
2. **Separar hecho, interpretación y emoción** en cada señal.
3. **Etiquetar confianza** por señal: alta / media / baja.
4. **Registrar por qué una fuente se admite o se excluye** para auditoría editorial.
5. **No extrapolar toda la reputación municipal desde una sola plataforma.**
6. **Revisar manualmente picos de viralidad anómala** antes de activar recomendaciones políticas.
7. **Distinguir influencia real de ruido partidista**: no todo volumen genera persuasión ni impacto electoral.

---

## 8) KPIs orientativos para futura implementación

- porcentaje de señales sociales verificadas sobre total capturado
- ratio de ruido descartado vs señal útil
- cobertura social operativa por municipio
- tiempo medio desde detección hasta clasificación
- tasa de incidentes reputacionales con validación humana previa
- oportunidades positivas detectadas y amplificadas con éxito
- distribución temática de las señales sociales por territorio

---

## 9) Decisiones técnicas y editoriales tomadas

1. Las redes sociales se incorporan como **capa reputacional asistida**, no como fuente automática de verdad.
2. La elegibilidad depende primero de **identidad verificable + trazabilidad**.
3. La relevancia debe ponderar **territorio, temática, credibilidad e influencia**, no solo seguidores.
4. El alcance por municipio se considera insuficiente si no existe un mínimo de fuentes sociales locales elegibles.
5. Los módulos `limpiar reputación` y `altavoz` comparten catálogo base, pero usan reglas distintas de priorización.
6. La prensa local y las cuentas territoriales verificables siguen siendo el núcleo más útil para pueblos pequeños y medianos.

---

## 10) Archivos modificados

- `specs/reputacio/SPEC.md`

Cambios realizados en este archivo:
- sustitución del contenido previo por una especificación centrada explícitamente en fuentes sociales relevantes para reputación
- incorporación de taxonomía de perfiles admitidos, condicionados y excluidos
- definición de señales de relevancia e influencia
- delimitación del alcance por municipio y temática
- conexión operativa con los módulos `limpiar reputación` y `altavoz`
- trazabilidad a los archivos reales revisados del repositorio

---

## 11) Límites de esta iteración

No se implementa en esta tarea:
- ingesta automática por plataforma social
- persistencia en base de datos de fuentes sociales
- scoring en backend
- cambios de frontend
- automatización de validación humana

Esto queda como trabajo posterior de implementación.

---

## 2026-05-10 — Módulo `limpiar reputación` (exploración)

### Objetivo
Definir el submódulo de reputación orientado a **apagar fuegos, minimizar errores y corregir impacto negativo**, con comportamiento equivalente al de un **departamento de prensa de alto nivel**. La función principal no es solo detectar menciones negativas, sino convertir señal reputacional verificada en una respuesta disciplinada, rápida y útil para preservar imagen, contener crisis y recuperar iniciativa.

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación.
- **Sin cambios de código de producción**.
- Se cubre el checklist pedido en el brief:
  - objetivos, entradas y salidas del módulo
  - flujos de detección de crisis y propuesta de respuesta
  - métricas de severidad y prioridad de actuación

---

## 1) Contexto revisado en el repositorio

Archivos auditados para esta definición:
- `README.md`
- `api/src/routes/reputacio.py`
- `api/src/services/reputacio_sources.py`
- `specs/reputacio/SPEC.md`
- `docs/reputacio-diagnostic-2025-02-14.md`

Conclusiones del estado actual:
- El backend actual de reputación ya dispone de una base de **ingesta, catálogo de fuentes y clasificación simple de sentimiento**, pero todavía no existe una capa operativa explícita para gestión de crisis y contención reputacional.
- El sistema ya separa fuentes de `premsa` y `xarxes`, y la documentación previa ya definió filtros de ruido, comprobación de realidad y cobertura social/local.
- Falta todavía la traducción de esa señal filtrada a un flujo tipo **war room de prensa**: qué constituye crisis, cómo se prioriza, cómo se decide responder, con qué tono y con qué controles para no empeorar el incendio.
- El principal riesgo del módulo no es detectar poco, sino **actuar mal**: responder demasiado pronto, responder con datos incompletos, amplificar una crítica pequeña, negar un hecho verdadero o entrar en conflicto con una comunidad local cuando conviene corregir y cerrar.

---

## 2) Propósito del módulo `limpiar reputación`

### 2.1 Definición funcional

`limpiar reputación` es el submódulo encargado de:
- detectar deterioro reputacional verificable
- distinguir entre **crítica legítima**, **error real**, **narrativa adversa**, **rumor** y **ataque coordinado**
- recomendar la mejor respuesta posible para **reducir daño, evitar errores de comunicación y recuperar control del relato**
- convertir hallazgos en acciones de prensa, argumentario, contraste, rectificación o silencio estratégico

### 2.2 Filosofía operativa

El módulo debe comportarse como un **departamento de prensa de alto nivel con disciplina americana de crisis**:
- rapidez sin improvisación
- respuesta basada en hechos
- control del framing
- priorización de daño electoral y legitimidad pública
- máxima aversión al error evitable
- separación estricta entre lo verificado, lo plausible y lo no comprobado

### 2.3 Resultado esperado

No basta con “ver noticias negativas”.
El resultado esperado es:
1. saber **qué fuego existe realmente**
2. saber **si merece respuesta**
3. saber **cómo responder sin empeorar**
4. saber **qué mensaje, qué portavoz y qué canal** convienen
5. saber **cuándo cerrar el caso o seguir monitorizando**

---

## 3) Objetivos del módulo

### 3.1 Objetivos primarios

1. **Minimizar errores de respuesta**
   - evitar responder sobre rumores, piezas incompletas o contenido manipulado

2. **Apagar fuegos con rapidez y precisión**
   - detectar incidentes que pueden dañar imagen, agenda o voto y priorizarlos correctamente

3. **Reducir impacto negativo acumulado**
   - limitar escalada mediática, legitimación social y repetición de narrativa adversa

4. **Convertir crisis en control narrativo cuando sea posible**
   - pasar de reacción defensiva a corrección, contextualización o contraencuadre creíble

5. **Proteger credibilidad del cliente y de sus portavoces**
   - impedir respuestas impulsivas, exageradas o inconsistentes con hechos verificables

### 3.2 Objetivos secundarios

- generar argumentarios defensivos reutilizables
- detectar patrones repetidos por territorio, tema o emisor
- aprender qué respuestas funcionan mejor por tipo de crisis
- dejar trazabilidad editorial de por qué se respondió, cómo y con qué evidencia

### 3.3 Anti-objetivos

El módulo no debe:
- responder a todo
- convertir cualquier crítica en guerra política
- amplificar ruido marginal
- fabricar relatos sin sustento factual
- recomendar desmentidos cuando los hechos son ciertos
- confundir volumen social con gravedad real

---

## 4) Entradas del módulo

### 4.1 Entradas de señal reputacional

1. **Artículos de prensa**
   - nacionales, regionales, comarcales y locales
   - especial prioridad a cobertura local por municipio

2. **Señales sociales filtradas**
   - cuentas institucionales
   - medios locales en redes
   - periodistas y entidades territoriales verificables
   - influencers o perfiles con influencia local real y trazabilidad suficiente

3. **Eventos de contexto político**
   - plenos, votaciones, comparecencias, notas oficiales, protestas, incidencias de gestión, polémicas de campaña

4. **Memoria reputacional previa**
   - incidentes recurrentes
   - actores hostiles conocidos
   - temas sensibles históricos del municipio o del partido

### 4.2 Entradas de validación

Cada hallazgo debe llegar, como mínimo, con estos metadatos o equivalentes:
- fuente
- tipo de fuente
- enlace/origen
- fecha y territorio
- actor afectado
- tono aparente
- evidencia disponible
- nivel de corroboración
- `confidence_score`
- `reality_check_status`
- flags de ruido o integridad narrativa

### 4.3 Entradas de negocio/editoriales

Para decidir respuesta no basta con la mención. También deben considerarse:
- sensibilidad del tema
- relevancia electoral del municipio/territorio
- perfil del actor afectado (partido, alcalde, concejal, portavoz, candidatura)
- momento político (campaña, pleno, crisis social, negociación)
- historial reciente de ataques o errores similares

---

## 5) Salidas del módulo

### 5.1 Salidas operativas principales

1. **Alerta reputacional priorizada**
   - incidente resumido
   - nivel de severidad
   - urgencia
   - confianza
   - recomendación inicial

2. **Diagnóstico de crisis**
   - qué hecho está verificado
   - qué parte está en duda
   - qué narrativa está circulando
   - qué actores la empujan
   - riesgo de escalada

3. **Propuesta de respuesta**
   - responder / contrastar / rectificar / contextualizar / derivar / no responder
   - mensaje sugerido
   - tono recomendado
   - evidencia a usar
   - canal sugerido
   - portavoz sugerido

4. **Argumentario defensivo breve**
   - 3-5 puntos utilizables por cargo público, equipo de prensa o community manager

5. **Plan de seguimiento**
   - ventana de observación
   - señales que confirmarían mejora o empeoramiento
   - condiciones de cierre

### 5.2 Posibles estados de salida

- `ignore`
- `monitor`
- `verify_first`
- `respond_light`
- `respond_full`
- `rectify`
- `escalate_human`
- `close_case`

---

## 6) Tipología de incidentes que debe reconocer

### 6.1 Tipos básicos

1. **Crítica legítima por gestión**
   - existe un problema real y visible
   - normalmente conviene corrección, empatía y plan de solución

2. **Error propio verificable**
   - declaración desafortunada, dato incorrecto, conducta impropia, incoherencia documental
   - puede requerir rectificación o repliegue rápido

3. **Narrativa adversa amplificada**
   - hay framing negativo sobre un hecho real o semirreal
   - exige control de relato y contextualización

4. **Rumor o acusación no verificada**
   - no debe activar respuesta fuerte sin contraste

5. **Ataque coordinado / ruido artificial**
   - volumen alto con baja credibilidad o patrones de coordinación
   - normalmente conviene contención sin sobrerreaccionar

6. **Crisis institucional o social real**
   - protesta, conflicto vecinal, polémica grave, incidente de seguridad, discriminación, corrupción, servicios esenciales
   - máxima prioridad

### 6.2 Etiquetas analíticas recomendadas

Cada incidente debería poder etiquetarse por:
- `incident_type`
- `truth_status`: verificado / parcialmente verificado / no verificado / falso probable
- `narrative_direction`: gestión / ética / legal / identitaria / convivencia / incompetencia / corrupción / trato ciudadano
- `recommended_posture`: negar / matizar / corregir / explicar / compensar / silenciar / contraatacar

---

## 7) Flujo operativo de detección de crisis y respuesta

### 7.1 Flujo extremo a extremo

1. **Captura de señal**
   - entra una mención de prensa o redes

2. **Filtro de ruido y reality check**
   - se descarta basura o se deja en observación
   - solo pasan a crisis las señales con confianza suficiente o impacto potencial alto

3. **Agrupación de incidente**
   - se unen menciones relacionadas sobre el mismo hecho/narrativa
   - se evita tratar cada post o artículo como crisis separada

4. **Clasificación de crisis**
   - tipo de incidente
   - tema
   - territorio
   - actor afectado
   - tono
   - etapa: emergente / activa / escalada / residual

5. **Scoring de severidad y prioridad**
   - impacto, alcance, velocidad, confianza, sensibilidad, capacidad de contagio

6. **Decisión de actuación**
   - ignorar, monitorizar, verificar, responder, rectificar o escalar a humano

7. **Propuesta de respuesta**
   - mensaje, tono, portavoz, canal, pruebas, objetivo táctico

8. **Seguimiento post-respuesta**
   - observar si cae intensidad, si se desplaza el framing o si aparecen réplicas nuevas

9. **Cierre o reapertura**
   - el incidente se cierra cuando deja de ser dañino o reaparece si escala de nuevo

### 7.2 Regla central del flujo

No se responde por defecto al primer impacto.
Primero se decide:
- **¿es verdad?**
- **¿importa?**
- **¿está creciendo?**
- **¿responder ayuda o empeora?**

---

## 8) Árbol de decisión para propuesta de respuesta

### 8.1 Caso A — Falso, débil o ruidoso

Condiciones típicas:
- baja confianza
- fuente débil
- poca difusión
- sin corroboración

Salida recomendada:
- `ignore` o `monitor`
- no legitimar el contenido con respuesta pública

### 8.2 Caso B — Verdadero pero acotado

Condiciones típicas:
- hecho real
- alcance bajo o medio
- sensibilidad moderada

Salida recomendada:
- `respond_light` o `verify_first`
- mensaje factual y corto
- evitar dramatización

### 8.3 Caso C — Verdadero y dañino

Condiciones típicas:
- hecho verificado
- riesgo reputacional alto
- legitimación por medio local, protesta, actor institucional o repetición

Salida recomendada:
- `respond_full` o `rectify`
- respuesta estructurada con tono disciplinado
- posible reconocimiento parcial, contexto y plan de acción

### 8.4 Caso D — Narrativa adversa sobre hecho ambiguo

Condiciones típicas:
- parte del contenido es real pero el framing es exagerado o incompleto

Salida recomendada:
- `verify_first` + `respond_light/respond_full` según evolución
- reenmarcar con hechos y contraste, sin negar lo evidente

### 8.5 Caso E — Crisis grave con dimensión ética, legal o social

Condiciones típicas:
- discriminación, seguridad, violencia, corrupción, trato institucional grave, movilización vecinal fuerte

Salida recomendada:
- `escalate_human`
- revisión humana obligatoria antes de emisión
- posible combinación de comunicado, portavoz principal y plan de seguimiento intensivo

---

## 9) Diseño de la propuesta de respuesta

### 9.1 Componentes mínimos de la respuesta sugerida

Toda propuesta del módulo debe incluir:
- **objetivo táctico**: desmentir, bajar temperatura, reconocer, corregir, contextualizar, cortar escalada, preservar credibilidad
- **mensaje núcleo**: una frase central clara
- **hechos utilizables**: solo evidencia verificada
- **puntos de apoyo**: 3-5 bullets para portavoz
- **riesgos de respuesta**: qué no decir, qué puede volverse en contra
- **canal recomendado**: nota, tuit, declaración, llamada a medio, mensaje interno, silencio táctico
- **portavoz recomendado**: cuenta institucional, portavoz local, alcalde, partido, tercero validado
- **ventana temporal**: inmediato / hoy / 24h / monitorizar primero

### 9.2 Tipos de respuesta admitidos

1. **Silencio táctico**
   - cuando responder amplificaría basura o daría oxígeno a un actor marginal

2. **Contraste discreto**
   - cuando falta verificar y conviene recabar datos antes de salir

3. **Desmentido factual**
   - cuando el contenido es falso y la prueba es sólida

4. **Contextualización / matiz**
   - cuando el hecho existe pero se está deformando

5. **Reconocimiento + corrección**
   - cuando hay error real y la mejor opción es reparar rápido

6. **Respuesta empática**
   - cuando la dimensión humana/social pesa más que la pelea política

7. **Contraencuadre disciplinado**
   - cuando existe oportunidad de mover el foco a gestión, datos o incoherencia del atacante

### 9.3 Reglas para minimizar errores

- no negar un hecho ya verificado
- no usar tono agresivo ante crítica ciudadana legítima
- no responder con triunfalismo ante daño real
- no basar la salida en un dato no contrastado
- no escalar un conflicto pequeño a crisis mayor por sobreexposición

---

## 10) Métricas de severidad

### 10.1 Dimensiones del score de severidad

Se propone puntuar cada incidente de 0 a 100 con estas dimensiones:

1. **Impacto reputacional intrínseco (`0-25`)**
   - cuánto daño puede hacer a imagen, legitimidad o confianza

2. **Alcance actual (`0-15`)**
   - tamaño y calidad de la difusión actual

3. **Velocidad de propagación (`0-10`)**
   - rapidez con la que gana eco

4. **Autoridad de los emisores (`0-15`)**
   - peso de medios, entidades, periodistas, actores institucionales o perfiles influyentes implicados

5. **Sensibilidad del tema (`0-15`)**
   - corrupción, discriminación, seguridad, convivencia, infancia, servicios básicos, etc.

6. **Proximidad electoral/territorial (`0-10`)**
   - cuánto afecta al municipio, demarcación o actor políticamente prioritario

7. **Persistencia / recurrencia (`0-10`)**
   - si el tema reaparece y acumula desgaste

### 10.2 Interpretación sugerida

- `0-24` → ruido o incidencia menor
- `25-49` → incidente manejable
- `50-69` → crisis relevante
- `70-84` → crisis alta
- `85-100` → crisis crítica

---

## 11) Métricas de prioridad de actuación

La severidad sola no basta. La prioridad final debe combinar:
- severidad
- confianza factual
- urgencia temporal
- posibilidad de intervención útil

### 11.1 Factores de prioridad

1. **Severidad (`0-40`)**
2. **Confianza factual (`0-20`)**
3. **Urgencia temporal (`0-20`)**
   - si una hora de espera empeora mucho el daño
4. **Capacidad de corrección (`0-10`)**
   - si una respuesta bien hecha puede mejorar claramente el escenario
5. **Riesgo de error de respuesta (`0-10`, inverso)**
   - a mayor riesgo de equivocarse, menor automatismo y más revisión humana

### 11.2 Bandas de prioridad

- `P4` — baja
  - monitorizar
- `P3` — media
  - revisar hoy
- `P2` — alta
  - preparar respuesta el mismo día
- `P1` — crítica
  - activar revisión inmediata y propuesta de salida en minutos/horas

### 11.3 SLA orientativo

- `P1`: primera propuesta en 15-30 min si la evidencia base existe
- `P2`: propuesta en <2 h
- `P3`: propuesta dentro del día
- `P4`: seguimiento pasivo

---

## 12) Matriz severidad × acción recomendada

| Severidad | Confianza | Acción base |
|---|---:|---|
| Baja | Baja | `ignore` / `monitor` |
| Baja | Alta | `monitor` o `respond_light` si conviene cerrar rápido |
| Media | Baja | `verify_first` |
| Media | Alta | `respond_light` o `respond_full` según difusión |
| Alta | Baja | `escalate_human` + verificación urgente |
| Alta | Alta | `respond_full`, `rectify` o `escalate_human` |
| Crítica | Cualquiera | revisión humana obligatoria + war room |

Regla clave:
- **crítica + baja confianza** no significa ignorar; significa **verificar urgentemente sin disparar comunicación prematura**.

---

## 13) Señales de mejora y criterios de cierre

### 13.1 Indicadores de mejora

- cae volumen de menciones negativas cualificadas
- baja participación de emisores con autoridad
- desaparece la repetición del claim central
- la cobertura pasa de acusatoria a contextualizada/neutra
- actores locales relevantes dejan de empujar el tema
- la conversación se desplaza a hechos favorables o neutros

### 13.2 Cierre de incidente

Un caso puede cerrarse cuando:
- no hay nueva escalada durante una ventana definida
- el núcleo del hecho ya fue aclarado, corregido o absorbido
- el coste de seguir respondiendo supera el beneficio
- el tema se ha degradado a ruido residual

---

## 14) KPIs del módulo

### 14.1 KPIs de calidad

- ratio de alertas útiles vs falsos positivos
- porcentaje de incidentes respondidos con evidencia suficiente
- porcentaje de respuestas que requirieron rectificación posterior
- ratio de crisis mal clasificadas por exceso o defecto

### 14.2 KPIs de velocidad

- tiempo desde detección a clasificación
- tiempo desde clasificación a propuesta de respuesta
- tiempo desde propuesta a decisión humana

### 14.3 KPIs de eficacia reputacional

- reducción de intensidad narrativa tras respuesta
- porcentaje de incidentes contenidos sin escalada adicional
- porcentaje de casos donde el framing mejora tras intervención
- recurrencia de un mismo tipo de crisis por municipio/tema/actor

### 14.4 KPI rector

El KPI principal no es “responder mucho”, sino:
- **reducir daño reputacional verificable con el mínimo número de errores de comunicación**

---

## 15) Integración con el resto del sistema reputacional

### 15.1 Dependencias conceptuales

Este módulo se apoya en las definiciones previas ya documentadas en este SPEC:
- ampliación de fuentes de prensa y redes
- priorización de prensa local
- filtro de ruido
- comprobación de realidad
- `confidence_score`

### 15.2 Relación con `altaveu`

- `limpiar reputación` se orienta a **contener daño y corregir percepción negativa**
- `altaveu` se orienta a **amplificar oportunidades favorables**
- ambos deben compartir catálogo de fuentes y reglas de verificabilidad, pero divergen en:
  - scoring táctico
  - tono recomendado
  - umbrales de intervención

---

## 16) Recomendaciones de implementación futura

Sin tocar producción en esta tarea, una implementación posterior debería introducir:

1. **Modelo de incidente reputacional**
   - `incident_id`
   - `incident_type`
   - `severity_score`
   - `priority_level`
   - `truth_status`
   - `recommended_action`
   - `recommended_tone`
   - `recommended_channel`
   - `recommended_spokesperson`
   - `follow_up_status`

2. **Agrupación de menciones por incidente**
   - no trabajar solo por artículo/post individual

3. **Plantillas de respuesta por tipo de crisis**
   - error real
   - rumor
   - crítica vecinal
   - framing adverso
   - crisis ética/legal

4. **Cola de revisión humana**
   - obligatoria para P1 y casos de baja confianza con alta severidad

5. **Panel operativo futuro**
   - incidentes abiertos
   - timeline de escalada
   - respuesta sugerida
   - evidencia y fuentes
   - estado de seguimiento

---

## 17) Decisiones técnicas y editoriales tomadas

1. `limpiar reputación` se define como módulo de **gestión de crisis reputacional**, no solo de escucha.
2. La unidad operativa principal debe ser el **incidente**, no la mención aislada.
3. La respuesta solo es válida si distingue hecho verificado, narrativa circulante y margen de duda.
4. El sistema debe poder recomendar también **no responder**.
5. La prioridad de actuación debe combinar daño, urgencia y confianza factual.
6. Los temas socialmente sensibles exigen revisión humana más estricta.
7. La prensa local y los actores territoriales con legitimidad siguen teniendo más valor táctico en municipios pequeños que el ruido viral genérico.

---

## 18) Archivos modificados

- `specs/reputacio/SPEC.md`

Cambios realizados en esta iteración:
- se añade una nueva sección específica para el submódulo `limpiar reputación`
- se definen objetivos, entradas y salidas operativas
- se especifica el flujo de detección de crisis, clasificación y propuesta de respuesta
- se documentan tipologías de incidentes y árbol de decisión de actuación
- se añade una matriz de severidad, prioridad y SLA orientativo
- se conectan las decisiones con el catálogo de fuentes y el filtro de ruido ya documentados

---

## 19) Límites de esta iteración

No se implementa en esta tarea:
- persistencia de incidentes reputacionales en base de datos
- endpoints nuevos FastAPI
- scoring automático en backend
- interfaz de crisis en frontend
- automatización de portavoces o canales
- generación automática final de comunicados

Se entrega únicamente la especificación operativa solicitada.

---

## 2026-05-10 — Configuración auditable de `trending_score`

### Objetivo
Dejar una fuente única de verdad auditable para la configuración editorial manual del `trending_score` sin crear tablas nuevas, asumiendo que **Juan** es el único administrador previsto de este ajuste.

### Tabla reutilizada
- Tabla elegida: `alertas_reglas`
- Motivo: ya es una tabla administrativa existente del sistema, ampliada previamente con campos MVP sin romper compatibilidad, y permite añadir configuración manual auditable sin duplicar modelos ni introducir una tabla global nueva no evidenciada en el repositorio.

### Columnas añadidas
Migración: `supabase/migrations/013_add_trending_config_audit.sql`

Nuevas columnas idempotentes:
- `trending_config_json JSONB`
- `trending_config_updated_at TIMESTAMPTZ`
- `trending_config_updated_by TEXT`

### JSON canónico esperado
```json
{
  "weights": {
    "delta_plens": 0.6,
    "score_premsa": 0.4,
    "score_xarxes": 0.0
  },
  "penalties": {
    "Hisenda": 0.30,
    "RRHH": 0.40,
    "Urbanisme rutinari": 0.50,
    "default": 0.80
  }
}
```

Reglas editoriales documentadas:
- `weights` es obligatorio.
- `penalties` es obligatorio.
- `penalties.default` es obligatorio para cubrir temas no mapeados explícitamente.

### Estrategia de auditoría
La auditoría manual de este ajuste queda en las columnas:
- `trending_config_updated_at`: fecha/hora de la última carga o edición manual
- `trending_config_updated_by`: identificador textual del administrador manual

En esta iteración el valor inicial queda marcado con:
- `trending_config_updated_by = 'Juan'`

### Valor inicial cargado
La migración carga un valor inicial idempotente **solo si** la columna `trending_config_json` está vacía en el primer registro existente de `alertas_reglas`, evitando sobreescribir ediciones futuras.

### Retrocompatibilidad
- No se crean tablas nuevas.
- No se añaden `NOT NULL` disruptivos.
- No se renombran ni eliminan columnas existentes.
- La obligación del esquema JSON se documenta en `COMMENT ON COLUMN` y en este SPEC, en lugar de imponer una `CHECK` que pudiera bloquear datos preexistentes o cargas manuales intermedias.

### Archivos modificados
- `supabase/migrations/013_add_trending_config_audit.sql`
- `specs/reputacio/SPEC.md`

---

## 2026-05-10 — Submódulo `amplificar difusión` / `altaveu` (exploración)

### Objetivo
Definir el submódulo `altaveu` dentro de reputación para **detectar oportunidades favorables de comunicación, priorizar acciones de difusión con impacto electoral y mejorar la percepción pública**. Debe comportarse como un departamento de prensa de alto nivel: disciplinado, orientado a oportunidades reales, con foco local y obsesión por evitar errores, humo y triunfalismo vacío.

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación.
- **Sin cambios de código de producción**.
- Se cubre el checklist pedido:
  - objetivos, entradas y salidas del módulo `amplificar difusión`
  - detección de oportunidades favorables de comunicación
  - propuestas de activación por canal y audiencia

---

## 1) Contexto revisado en el repositorio

Archivos auditados para esta definición:
- `README.md`
- `api/src/routes/reputacio.py`
- `api/src/services/reputacio_sources.py`
- `specs/reputacio/SPEC.md`

Conclusiones del estado actual:
- El backend ya expone un catálogo de fuentes de reputación y distingue entre `premsa` y `xarxes`.
- El servicio `api/src/services/reputacio_sources.py` ya nombra explícitamente el módulo `altaveu`, pero solo como objetivo de alto nivel; todavía no existe una especificación operativa completa.
- El trabajo previo del SPEC ya definió tres bloques imprescindibles que `altaveu` debe reutilizar:
  - ampliación de medios y prensa local
  - señales sociales relevantes
  - filtro de ruido y comprobación de realidad
- Por tanto, `altaveu` no debe construir difusión sobre volumen bruto, sino sobre **oportunidades verificadas y territoralmente útiles**, especialmente en municipios pequeños y medianos donde la prensa local y las redes con arraigo pesan más que la viralidad genérica.

---

## 2) Propósito del submódulo `altaveu`

### 2.1 Definición funcional

`altaveu` es el submódulo encargado de:
- detectar cobertura, hechos, gestos, validaciones o ventanas narrativas favorables
- evaluar si esas oportunidades merecen ser amplificadas
- recomendar cómo convertirlas en **visibilidad útil, buena percepción pública y potencial ganancia de voto**
- proponer activaciones concretas por canal, territorio y audiencia

### 2.2 Filosofía operativa

El módulo debe actuar como una mezcla de:
- **war room positivo**
- **departamento de prensa premium**
- **equipo de earned media + rapid response inversa**

Eso implica:
- aprovechar rápido lo favorable antes de que se enfríe
- no vender humo ni exagerar logros dudosos
- priorizar legitimidad local y prueba social real
- elegir el canal correcto para cada audiencia
- usar disciplina narrativa: un mensaje claro, repetible y verificable

### 2.3 Resultado esperado

No basta con encontrar noticias positivas.
El resultado esperado es:
1. identificar **qué oportunidad existe realmente**
2. estimar **si vale la pena activarla**
3. decidir **qué relato conviene empujar**
4. recomendar **canal, audiencia, portavoz y formato**
5. medir si la oportunidad puede traducirse en imagen, agenda o voto

---

## 3) Objetivos del módulo

### 3.1 Objetivos primarios

1. **Detectar oportunidades favorables accionables**
   - hechos, menciones, validaciones o comparativas que ayuden a reforzar imagen pública

2. **Maximizar visibilidad útil**
   - no solo alcance bruto, sino exposición ante públicos que importan electoralmente

3. **Mejorar percepción pública con base verificable**
   - convertir gestión, apoyo social, contraste favorable o cobertura local positiva en reputación tangible

4. **Ayudar a ganar votos y legitimidad**
   - priorizar oportunidades que mejoran confianza, competencia percibida, proximidad o liderazgo

5. **Aprovechar ventanas de agenda antes que los rivales**
   - activar difusión cuando el momento político, el medio o la conversación local favorecen la expansión

### 3.2 Objetivos secundarios

- reforzar argumentarios de concejales y portavoces
- dar continuidad a éxitos de gestión o posicionamientos eficaces
- convertir cobertura local en activos reutilizables para campaña y relato
- detectar terceros que validan de forma creíble un mensaje propio

### 3.3 Anti-objetivos

`altaveu` no debe:
- amplificar contenido dudoso o no verificado
- confundir likes con persuasión electoral
- sobreactivar mensajes pequeños hasta quemarlos
- promover triunfalismo que pueda volverse en contra
- priorizar difusión estatal si la oportunidad es local y la conversión real ocurre en territorio

---

## 4) Entradas del módulo

### 4.1 Entradas de señal favorable

1. **Cobertura de prensa positiva o utilizable**
   - artículos favorables
   - piezas neutrales con framing aprovechable
   - comparativas donde el cliente queda mejor que rivales
   - eco territorial de una decisión, propuesta o intervención

2. **Señales sociales verificadas**
   - apoyo de entidades, periodistas, líderes comunitarios o perfiles influyentes
   - conversación local favorable
   - reconocimiento a gestión, presencia o respuesta política
   - contenido orgánico reutilizable

3. **Eventos y hitos políticos**
   - plenos, mociones, iniciativas, intervenciones, visitas, anuncios, acuerdos, resultados o rectificaciones exitosas

4. **Señales de contraste competitivo**
   - errores de rivales que abren hueco
   - divisiones entre adversarios
   - comparación favorable en coherencia, rapidez, cercanía o firmeza

5. **Memoria de oportunidades previas**
   - territorios, temas o formatos donde históricamente la amplificación funcionó bien

### 4.2 Metadatos mínimos requeridos

Toda oportunidad debería llegar con estos campos o equivalentes:
- fuente
- tipo de fuente
- enlace u origen
- fecha
- territorio principal
- actor beneficiado
- tema principal
- tono
- evidencia disponible
- `confidence_score`
- alcance estimado
- audiencia dominante
- grado de reutilización posible

### 4.3 Entradas editoriales/estratégicas

La activación final depende también de:
- prioridad electoral del municipio o territorio
- tipo de audiencia al que afecta la oportunidad
- sensibilidad del tema
- capacidad del actor local para ejecutar difusión
- saturación narrativa previa
- encaje con el posicionamiento político del cliente

---

## 5) Salidas del módulo

### 5.1 Salidas operativas principales

1. **Oportunidad priorizada**
   - resumen del hecho favorable
   - score de oportunidad
   - nivel de urgencia
   - confianza
   - motivo táctico

2. **Diagnóstico de amplificación**
   - qué hecho está verificado
   - qué ángulo conviene enfatizar
   - por qué puede resonar
   - qué audiencia tiene más probabilidad de reaccionar bien

3. **Plan de activación**
   - canal recomendado
   - audiencia objetivo
   - portavoz sugerido
   - formato sugerido
   - ventana temporal óptima

4. **Mensaje núcleo y argumentario breve**
   - claim principal
   - 3-5 bullets reutilizables
   - prueba social o factual a citar

5. **Plan de seguimiento**
   - señales de éxito esperadas
   - si conviene segunda ola
   - criterio de cierre o reciclaje posterior

### 5.2 Estados posibles de salida

- `ignore`
- `monitor`
- `prepare_assets`
- `activate_local`
- `activate_multichannel`
- `pitch_press`
- `amplify_with_allies`
- `hold_for_better_timing`

---

## 6) Qué constituye una oportunidad favorable de comunicación

### 6.1 Tipos básicos de oportunidad

1. **Validación externa creíble**
   - un medio, entidad o actor respetado valida un hecho, postura o resultado favorable

2. **Logro de gestión con prueba clara**
   - hay un resultado tangible que puede mejorar percepción de competencia o eficacia

3. **Comparativa favorable frente a rivales**
   - el cliente aparece como más coherente, más rápido, más cercano o más resolutivo

4. **Sintonía social o comunitaria**
   - una demanda vecinal, sectorial o territorial encaja con el mensaje propio y permite conexión emocional/política

5. **Ventana de agenda local**
   - un tema entra en conversación municipal y existe una posición propia fuerte que puede capitalizarse

6. **Reparación reputacional con giro positivo**
   - un problema previo se resuelve, se corrige o se reencuadra con legitimidad

7. **Microoportunidad territorial**
   - cobertura pequeña pero muy importante en un municipio específico donde la proximidad pesa más que el volumen

### 6.2 Regla de oro

Una oportunidad favorable no es solo “algo bueno”.
Debe cumplir una combinación suficiente de estas condiciones:
- verificable
- relevante para percepción pública
- amplificable por algún canal real
- útil para alguna audiencia concreta
- conectable con voto, confianza, liderazgo o agenda

---

## 7) Sistema de detección de oportunidades favorables

### 7.1 Flujo de detección

1. **Captura de señal favorable**
   - entra una mención, artículo, gesto, apoyo o evento

2. **Filtro de realidad y ruido**
   - se descarta humo, vanity metrics o apoyo débil sin trazabilidad

3. **Agrupación de oportunidad**
   - varias menciones sobre el mismo hecho favorable se agrupan en una sola oportunidad

4. **Clasificación de oportunidad**
   - tipo, tema, territorio, actor beneficiado, audiencia potencial, vida útil

5. **Scoring de oportunidad**
   - impacto reputacional, valor electoral, capacidad de difusión, autoridad del emisor, urgencia temporal

6. **Decisión de activación**
   - no activar, preparar material, activar local, empujar multicanal, ofrecer a prensa, movilizar aliados

7. **Seguimiento**
   - evaluar eco, repetición, legitimación adicional y fatiga de mensaje

### 7.2 Regla central del flujo

Antes de amplificar, el sistema debe responder:
- **¿es verdad?**
- **¿a quién le importa?**
- **¿en qué territorio pesa?**
- **¿qué canal convierte mejor esta señal en percepción o voto?**
- **¿tenemos mejores oportunidades compitiendo por atención al mismo tiempo?**

---

## 8) Criterios para detectar oportunidades con valor real

### 8.1 Señales fuertes

Una oportunidad sube de prioridad si presenta varias de estas señales:
- cobertura en prensa local o regional fiable
- validación por tercero creíble no alineado automáticamente
- evidencia tangible de gestión o impacto
- encaje con un tema sensible o prioritario para el municipio
- posibilidad de personalizar el mensaje a audiencia clara
- comparación favorable frente a rival o contexto adverso
- potencial de reutilización en argumentario, redes, prensa o intervención pública

### 8.2 Señales débiles o engañosas

Se debe rebajar o descartar si la supuesta oportunidad depende sobre todo de:
- autopropaganda sin contraste externo
- una sola cuenta amiga con poco peso real
- engagement superficial o artificial
- tema irrelevante para el territorio
- mensaje que gusta internamente pero no tiene traducción pública útil
- dato incompleto que puede desmontarse al amplificarlo

### 8.3 Jerarquía editorial de oportunidad

De mayor a menor valor táctico:
1. validación externa local/regional con hecho comprobable
2. logro de gestión con prueba y afectación visible
3. comparativa favorable clara
4. apoyo orgánico de actores comunitarios con legitimidad
5. tendencia conversacional social favorable ya verificada
6. señal positiva interna sin legitimación externa

---

## 9) Métrica de oportunidad y priorización

### 9.1 Dimensiones del `opportunity_score` (`0-100`)

1. **Impacto reputacional positivo (`0-20`)**
   - cuánto puede mejorar imagen, competencia percibida o legitimidad

2. **Valor electoral (`0-20`)**
   - capacidad de mover simpatía, confianza o predisposición al voto en audiencia útil

3. **Autoridad de la validación (`0-15`)**
   - peso del medio, actor, entidad o perfil que legitima la oportunidad

4. **Centralidad territorial (`0-15`)**
   - relevancia del territorio afectado y proximidad al público donde importa

5. **Amplificabilidad multicanal (`0-10`)**
   - facilidad para convertir la oportunidad en formatos reutilizables

6. **Urgencia / ventana temporal (`0-10`)**
   - riesgo de perder valor si no se activa rápido

7. **Claridad factual (`0-10`)**
   - facilidad para comunicarla sin ambigüedades ni riesgo de corrección posterior

### 9.2 Interpretación sugerida

- `0-24` → oportunidad marginal
- `25-49` → oportunidad secundaria
- `50-69` → oportunidad buena
- `70-84` → oportunidad alta
- `85-100` → oportunidad prioritaria

### 9.3 Regla correctora

Una oportunidad con score alto pero con `confidence_score` insuficiente no debe activarse automáticamente.
Primero debe pasar por revisión editorial o humana.

---

## 10) Propuestas de activación por canal y audiencia

### 10.1 Prensa local / comarcal

**Cuándo usarla**
- logro de gestión municipal
- respuesta eficaz a problema vecinal
- dato o decisión con impacto claro en territorio
- comparativa favorable que interesa a públicos locales

**Audiencia principal**
- votante local indeciso
- tejido vecinal
- comerciantes, entidades, asociaciones
- personas que siguen la actualidad municipal

**Acciones recomendadas**
- pitch a periodista o medio local
- nota breve territorializada
- ofrecer titular claro + dato + portavoz local
- convertir una cobertura positiva en segunda pieza de seguimiento

**Objetivo táctico**
- legitimidad y penetración territorial

### 10.2 Redes sociales institucionales

**Cuándo usarla**
- oportunidad verificable con mensaje simple y visualizable
- hitos de gestión, agenda, declaraciones o contraste político claro

**Audiencia principal**
- base propia
- simpatizantes blandos
- público local que consume titulares rápidos

**Acciones recomendadas**
- post corto con claim central
- carrusel/resumen visual
- clip breve de portavoz
- cita de tercero validando el hecho

**Objetivo táctico**
- velocidad, repetición y control del framing

### 10.3 WhatsApp / difusión cerrada / grupos de apoyo

**Cuándo usarla**
- oportunidad local que requiere propagación rápida y capilar
- mensaje simple, útil para reenviar
- argumentario de movilización o activación comunitaria

**Audiencia principal**
- militancia
- red de simpatizantes
- cargos locales
- microinfluencers comunitarios

**Acciones recomendadas**
- texto corto con titular + enlace
- bullet points reutilizables
- pieza visual o corte de audio muy breve
- indicación de “qué decir” y “qué no sobredimensionar”

**Objetivo táctico**
- multiplicación orgánica controlada

### 10.4 Portavoces y concejales

**Cuándo usarla**
- oportunidad con potencial de convertirse en argumento político recurrente
- comparativas favorables o validaciones externas fuertes

**Audiencia principal**
- pleno, radio local, entrevistas, actos, puerta a puerta, medios comarcales

**Acciones recomendadas**
- mini-argumentario de 3-5 frases
- dato ancla
- formulación adaptada a tono institucional o combativo
- versión corta para intervención oral

**Objetivo táctico**
- convertir oportunidad mediática en persuasión política directa

### 10.5 Aliados, entidades y terceros validadores

**Cuándo usarla**
- existe apoyo orgánico creíble o validación social utilizable
- interesa ampliar legitimidad más allá del partido

**Audiencia principal**
- votante escéptico
- comunidad local
- sectores sociales concretos

**Acciones recomendadas**
- amplificar testimonios o reconocimientos verificables
- facilitar materiales compartibles
- promover eco cruzado con prudencia

**Objetivo táctico**
- prueba social y credibilidad externa

### 10.6 Formatos largos o evergreen

**Cuándo usarla**
- oportunidad con vida útil larga o valor estratégico acumulable
- ejemplo: balance de gestión, comparativa temática, éxito sostenido, caso local ejemplar

**Audiencia principal**
- cuadros, periodistas, votante interesado, equipo de campaña

**Acciones recomendadas**
- dossier breve
- hilo/documento FAQ
- pieza de web o landing temática
- repositorio de ejemplos para argumentarios

**Objetivo táctico**
- convertir una oportunidad puntual en activo duradero

---

## 11) Playbooks por tipo de audiencia

### 11.1 Votante local indeciso

Qué suele funcionar:
- prueba de gestión concreta
- mejora visible en problema cotidiano
- tono útil, no ideológico en exceso
- validación externa local

Activación recomendada:
- prensa local + post institucional + portavoz de proximidad

### 11.2 Base propia y simpatizantes

Qué suele funcionar:
- contraste claro con rivales
- sensación de avance, firmeza o acierto
- piezas simples de compartir

Activación recomendada:
- redes + WhatsApp + mini-argumentario para replicación

### 11.3 Entidades y comunidad organizada

Qué suele funcionar:
- reconocimiento a demandas vecinales
- evidencia de escucha, resolución o colaboración
- tono respetuoso y territorial

Activación recomendada:
- contacto directo, prensa local, mensajes de portavoz local, materiales contextualizados

### 11.4 Periodistas y prescriptores locales

Qué suele funcionar:
- novedad clara
- dato comprobable
- impacto local concreto
- acceso rápido a portavoz y contexto

Activación recomendada:
- pitch breve, enfoque territorial, titular limpio y evidencia preparada

---

## 12) Riesgos y controles para evitar errores

### 12.1 Riesgos principales

- amplificar una señal que luego se matiza o cae
- sobredimensionar un logro pequeño y generar rechazo
- usar un tono triunfalista en un contexto social delicado
- gastar atención en una oportunidad irrelevante mientras otra mejor expira
- intentar nacionalizar una oportunidad que solo funciona en clave local

### 12.2 Reglas de control

1. amplificar solo hechos que superen `reality check`
2. priorizar legitimación externa frente a autobombo
3. no activar multicanal si la oportunidad todavía no tiene mensaje sólido
4. adaptar tono a audiencia y sensibilidad
5. cortar la difusión cuando aparezcan fatiga, backlash o riesgo de sobreexposición

---

## 13) KPIs del módulo

### 13.1 KPIs de detección

- oportunidades favorables detectadas por territorio y tema
- ratio de oportunidades válidas vs oportunidades descartadas
- porcentaje de oportunidades con validación externa

### 13.2 KPIs de activación

- tiempo desde detección hasta activación
- porcentaje de oportunidades activadas por canal
- reutilización de activos en portavoces, redes y prensa

### 13.3 KPIs de eficacia

- aumento de cobertura favorable cualificada
- crecimiento de menciones positivas verificadas
- penetración territorial de mensajes activados
- oportunidades que generan activos reutilizables en argumentario
- porcentaje de activaciones que mejoran percepción o refuerzan agenda local

### 13.4 KPI rector

El KPI central no es “publicar más”, sino:
- **convertir oportunidades verificadas en visibilidad útil, legitimidad pública y mejor predisposición electoral**

---

## 14) Integración con `limpiar reputación`

### 14.1 Complementariedad funcional

- `limpiar reputación` contiene daño, corrige y apaga fuegos
- `altaveu` detecta viento a favor y lo convierte en tracción política

### 14.2 Reglas compartidas

Ambos comparten:
- catálogo de fuentes
- priorización de prensa local
- filtro de ruido
- comprobación de realidad
- `confidence_score`

### 14.3 Diferencia táctica

- `limpiar reputación` pregunta: **¿cómo evitamos perder?**
- `altaveu` pregunta: **¿cómo aprovechamos esto para ganar?**

---

## 15) Recomendaciones de implementación futura

Sin tocar producción en esta tarea, una implementación posterior debería introducir:

1. **Modelo de oportunidad favorable**
   - `opportunity_id`
   - `opportunity_type`
   - `opportunity_score`
   - `confidence_score`
   - `target_audience`
   - `recommended_channel`
   - `recommended_format`
   - `recommended_spokesperson`
   - `activation_status`

2. **Agrupación de señales por oportunidad**
   - no tratar cada artículo/post positivo como caso aislado

3. **Plantillas de activación por canal**
   - prensa local
   - redes institucionales
   - WhatsApp / difusión cerrada
   - portavoz / pleno / entrevista

4. **Cola editorial de priorización**
   - decidir qué oportunidades se activan primero cuando compiten entre sí

5. **Panel futuro de altavoz**
   - oportunidades abiertas
   - scoring
   - audiencia sugerida
   - canales propuestos
   - estado de ejecución y seguimiento

---

## 16) Decisiones técnicas y editoriales tomadas

1. `altaveu` se define como módulo de **amplificación estratégica de oportunidades**, no como simple feed de noticias positivas.
2. La unidad operativa principal debe ser la **oportunidad agrupada**, no la mención individual.
3. La prensa local y los actores territoriales tienen prioridad estructural en municipios pequeños y medianos.
4. La activación debe priorizar valor electoral y legitimidad, no vanidad de métricas.
5. La oportunidad solo debe activarse si es verificable y si existe una audiencia claramente beneficiaria.
6. El módulo debe recomendar también **esperar** cuando una oportunidad aún no está madura o puede mejorar con mejor timing.
7. Los argumentarios de concejales son una salida central del módulo, no un efecto secundario.

---

## 17) Archivos modificados

- `specs/reputacio/SPEC.md`

Cambios realizados en esta iteración:
- se añade una nueva sección específica para el submódulo `amplificar difusión` / `altaveu`
- se definen objetivos, entradas y salidas operativas del módulo
- se especifica cómo detectar oportunidades favorables de comunicación
- se documentan criterios de scoring y priorización de oportunidades
- se añaden playbooks de activación por canal y por audiencia
- se deja trazabilidad a los archivos reales revisados del repositorio

---

## 18) Límites de esta iteración

No se implementa en esta tarea:
- scoring en backend
- persistencia de oportunidades en base de datos
- endpoints nuevos FastAPI
- UI específica del módulo `altaveu`
- automatización de mensajes o campañas
- integración con métricas reales de distribución por canal

Se entrega únicamente la especificación operativa solicitada.

---

## 2026-05-09 — Filtro de ruido y comprobación de realidad en reputació

### Objetivo
Especificar cómo descartar ruido, basura y contenido sin fuente verificable dentro del módulo de reputación, definiendo una comprobación de realidad operativa y una puntuación de confianza por mención/hallazgo para minimizar errores y evitar conclusiones falsas.

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación (sin cambios de código de producción).
- Se diseña un marco editorial y técnico para futuras implementaciones sobre backend, pipeline y workflows humanos.
- Se cubre el checklist solicitado:
  - criterios de descarte por falta de fuente o baja fiabilidad
  - señales de ruido y contenido irrelevante
  - puntuación de confianza por mención o hallazgo

---

## 1) Contexto revisado en el repositorio

Archivos auditados para esta definición:
- `README.md`
- `api/src/routes/reputacio.py`
- `api/src/services/reputacio_sources.py`
- `specs/reputacio/SPEC.md`

Conclusiones del estado actual:
- El módulo ya expone un catálogo de fuentes mediante `/api/reputacio/sources`, separando `premsa` y `xarxes`.
- Existe un primer bloque de `criteris_soroll` en `api/src/services/reputacio_sources.py`, pero todavía no hay una especificación operativa completa para filtrar hallazgos a nivel de mención individual.
- La ingesta actual de reputación está centrada en prensa RSS, por lo que la lógica de limpieza debe diseñarse de forma transversal: válida tanto para artículos como para señales sociales o futuras fuentes.
- El riesgo principal del brief no es la falta de volumen, sino la contaminación de señal: rumores, capturas sin contexto, viralidad artificial, contenido viejo reviralizado y perfiles sin trazabilidad.

---

## 2) Principio rector: no toda mención es inteligencia utilizable

En reputación debemos separar tres capas:

1. **Detección bruta**
   - cualquier contenido que potencialmente mencione al actor, partido, candidato o tema relevante.

2. **Mención evaluable**
   - contenido con suficiente contexto, fuente y relación temática para entrar en análisis.

3. **Señal operativa**
   - hallazgo ya filtrado, con confianza suficiente para alimentar `limpiar reputación`, `altavoz` o revisión humana.

Regla base:
- **una mención detectada no equivale a un hecho verificado ni a una amenaza reputacional real**.

Esto obliga a introducir dos compuertas antes de actuar:
- **filtro de ruido**
- **comprobación de realidad**

---

## 3) Criterios de descarte por falta de fuente o baja fiabilidad

### 3.1 Descarte inmediato (`reject`)

La mención debe descartarse sin entrar a scoring operativo si cumple cualquiera de estas condiciones:

1. **Sin fuente primaria localizable**
   - no hay URL original, documento, publicación fuente o referencia rastreable.
   - ejemplos:
     - captura de pantalla recortada sin enlace
     - “dicen que…” sin origen
     - texto reenviado sin autoría ni contexto

2. **Autoria no verificable**
   - cuenta anónima, perfil opaco, medio no identificable o agregador sin responsables visibles.

3. **Hecho no comprobable en el contenido**
   - la mención presenta una acusación o afirmación factual, pero no aporta prueba, cita, documento, vídeo contextualizado o corroboración externa.

4. **Satira, meme o parodia no etiquetada como información**
   - si el formato principal es humor, manipulación o entretenimiento y no existe valor factual recuperable.

5. **Spam o reciclaje automatizado**
   - publicaciones repetidas en masa, patrones de bots, agregación vacía o cuentas que solo recirculan enlaces sin contexto.

6. **Contenido manipulado o descontextualizado**
   - fragmentos de vídeo/audio/foto sin fecha, sin lugar o con indicios de edición engañosa.

7. **Duplicado sin valor incremental**
   - misma pieza republicada en otros nodos sin añadir evidencia, contexto o legitimación nueva.

### 3.2 Descarte por baja fiabilidad (`soft reject`)

La mención no se usa como señal operativa automática, aunque puede quedar archivada para observación, si ocurre alguno de estos casos:

1. **Fuente de fiabilidad históricamente baja**
   - perfil o medio con historial de errores, exageraciones o falta de correcciones.

2. **Solo existe una fuente débil**
   - el hallazgo depende de un único emisor de baja autoridad.

3. **Relación territorial insuficiente**
   - contenido viral generalista sin conexión clara con el municipio, comarca o actor monitorizado.

4. **Relación temática débil**
   - menciona tangencialmente al actor pero no afecta a reputación política utilizable.

5. **Contenido antiguo reviralizado**
   - reaparece material viejo como si fuese actual, sin contexto temporal claro.

6. **Exceso de interpretación y poco hecho observable**
   - opinión, insulto o framing sin dato verificable detrás.

### 3.3 Regla editorial de oro

Si una mención implica riesgo alto —por ejemplo corrupción, agresión, racismo, condena judicial, escándalo local, protesta vecinal relevante o crisis institucional— **no puede escalar a recomendación política sin fuente verificable y/o corroboración suficiente**.

---

## 4) Señales de ruido y contenido irrelevante

### 4.1 Señales de ruido estructural

Indican que el contenido probablemente no aporta inteligencia reputacional útil:

- reposts masivos del mismo mensaje
- copy/paste coordinado entre cuentas similares
- engagement anómalo desproporcionado respecto al historial del perfil
- cuentas recién creadas con actividad intensiva
- mezcla incoherente de temas virales sin anclaje territorial
- publicaciones que solo buscan provocar reacción emocional sin dato comprobable
- uso dominante de hashtags de guerra cultural no conectados con el municipio observado

### 4.2 Señales de irrelevancia temática

Indican que la mención puede ser real pero no relevante para reputación política operativa:

- menciones superficiales del nombre del partido o concejal sin impacto narrativo
- referencias de agenda menor sin conflicto, oportunidad o legitimación pública
- contenido de entretenimiento, memes o conversación interna de militancia sin eco externo
- cobertura nacional genérica que no cambia percepción local ni línea argumental municipal
- comentarios aislados de baja visibilidad sin capacidad de arrastre

### 4.3 Señales de baja comprobación de realidad

Son indicadores específicos de que el contenido no supera la barrera factual:

- ausencia de enlace original
- ausencia de fecha/hora/lugar
- ausencia de autor identificable
- afirmaciones absolutas sin prueba
- captura parcial que oculta emisor o contexto
- vídeo sin audio completo o con corte que impide interpretar el hecho
- dato numérico sin documento, acta, nota oficial o cobertura contrastable

### 4.4 Señales de posible valor aunque haya tensión

No todo contenido crítico es ruido. Debe conservarse para evaluación si presenta una o varias de estas señales:

- fuente local identificable
- evidencia directa contextualizada
- coincidencia entre varias fuentes independientes
- eco en medio local o institucional
- capacidad real de afectar agenda, voto o imagen pública
- crítica repetida y consistente sobre un mismo problema de gestión

---

## 5) Comprobación de realidad (`reality check`)

### 5.1 Definición

La comprobación de realidad es la validación mínima necesaria para decidir si una mención puede tratararse como:
- hecho probable
- narrativa relevante
- ruido descartable
- caso que exige revisión humana

### 5.2 Jerarquía de evidencia

Orden de mayor a menor fuerza:

1. **Fuente oficial primaria**
   - ayuntamiento, pleno, documento oficial, nota pública oficial, comparecencia identificada.

2. **Medio periodístico fiable con atribución clara**
   - prensa local/regional/nacional con firma, contexto y hecho atribuible.

3. **Evidencia directa contextualizada**
   - vídeo, audio, imagen o documento con fecha, lugar y emisor identificables.

4. **Corroboración múltiple independiente**
   - varias fuentes elegibles que coinciden en el núcleo factual sin depender unas de otras.

5. **Fuente social influyente y verificable**
   - útil como alerta o termómetro, pero insuficiente por sí sola para hechos sensibles.

6. **Rumor o agregación sin trazabilidad**
   - no apto para señal operativa.

### 5.3 Reglas de validación

Una mención supera el `reality check` si cumple al menos una de estas condiciones:

- proviene de fuente oficial primaria
- proviene de medio fiable y el hecho está claramente atribuido
- contiene evidencia directa contextualizada suficiente
- aparece corroborada por **2 o más** fuentes independientes elegibles

Una mención queda en `manual_review` si:
- parece importante pero la evidencia es incompleta
- hay conflicto entre fuentes
- el contenido puede escalar políticamente pero todavía no está claro si es verdadero, sesgado o manipulado

Una mención queda en `reject` si:
- no supera ningún criterio de realidad mínima
- depende de una fuente débil sin apoyo adicional
- su estructura apunta a rumor, meme, basura o viralidad hueca

---

## 6) Puntuación de confianza por mención o hallazgo

### 6.1 Objetivo del score

La puntuación de confianza no mide si una noticia gusta o perjudica, sino **cuánto podemos confiar en que esa mención representa una señal reputacional utilizable**.

Escala recomendada:
- `0-29` → descartar
- `30-54` → observación pasiva
- `55-74` → revisión humana recomendada
- `75-100` → señal operativa utilizable

### 6.2 Factores del score

#### A) Fiabilidad de la fuente (`0-25`)
- 25: oficial o medio local/regional/nacional de alta fiabilidad
- 18: periodista/local influencer verificable con buen historial
- 10: fuente mixta o credibilidad media
- 0-5: fuente opaca o problemática

#### B) Fuerza de evidencia (`0-25`)
- 25: documento, vídeo, acta o fuente primaria clara
- 18: cobertura periodística bien atribuida
- 10: testimonio trazable pero incompleto
- 0: afirmación sin prueba

#### C) Corroboración independiente (`0-20`)
- 20: 3 o más fuentes independientes coinciden
- 12: 2 fuentes independientes coinciden
- 5: una sola fuente fuerte
- 0: una sola fuente débil

#### D) Contexto temporal y geográfico (`0-10`)
- 10: fecha y territorio claros, plenamente vigentes
- 5: contexto parcial pero utilizable
- 0: contenido desanclado o reviralizado sin contexto

#### E) Relevancia reputacional (`0-10`)
- 10: impacto claro en imagen pública, agenda o voto
- 5: relevancia media o indirecta
- 0: mención marginal

#### F) Integridad narrativa (`-10 a +10`)
- +10: contenido completo, sin indicios de manipulación
- 0: integridad neutra
- -10: señales claras de recorte, sensationalism, edición engañosa o framing dudoso

### 6.3 Fórmula recomendada

`confidence_score = fuente + evidencia + corroboracion + contexto + relevancia + integridad`

Con topes:
- mínimo: 0
- máximo: 100

### 6.4 Multiplicadores/penalizaciones adicionales

Aplicar penalización fuerte (`-20` o rechazo directo) si:
- hay sospecha consistente de bot/spam/coordinación artificial
- el hallazgo depende de captura sin fuente original
- el contenido fue desmentido por fuente superior

Aplicar bonificación moderada (`+5`) si:
- la fuente es local y especialmente relevante para el municipio afectado
- el hallazgo conecta con una tendencia sostenida ya detectada en varias semanas

---

## 7) Estados de salida operativa

Cada mención debería terminar en uno de estos estados:

1. `reject`
   - ruido, basura, falta de fuente o imposibilidad de comprobación

2. `observe`
   - contenido débil pero quizá emergente; no actuar todavía

3. `manual_review`
   - potencialmente importante, requiere criterio humano antes de concluir

4. `action_limpiar`
   - señal negativa suficientemente fiable para preparar respuesta, contraste o contención

5. `action_altaveu`
   - señal positiva suficientemente fiable para amplificar difusión

### 7.1 Umbrales sugeridos

- `0-29` → `reject`
- `30-54` → `observe`
- `55-74` → `manual_review`
- `75-100` + tono negativo → `action_limpiar`
- `75-100` + tono positivo → `action_altaveu`

Importante:
- una señal con score alto pero sobre tema sensible puede seguir requiriendo validación humana por política editorial.

---

## 8) Ejemplos de clasificación

### Caso A — Descartar
- Publicación en X de cuenta anónima: “Dicen que el concejal ha sido denunciado”
- Sin enlace, sin documento, sin fecha, sin fuente original.

Resultado:
- `reality_check = fail`
- `confidence_score ≈ 5-10`
- estado: `reject`

### Caso B — Observación
- Página local de Facebook conocida publica que “hay malestar vecinal por suciedad”, con fotos pero sin fecha clara ni contraste adicional.

Resultado:
- evidencia parcial, relevancia potencial, contexto incompleto
- `confidence_score ≈ 40-50`
- estado: `observe`

### Caso C — Revisión humana
- Influencer local identificado denuncia trato racista en un acto municipal con vídeo parcial; un medio comarcal se hace eco pero aún faltan detalles.

Resultado:
- señal importante, evidencia aún incompleta
- `confidence_score ≈ 60-72`
- estado: `manual_review`

### Caso D — Activar limpiar reputación
- Medio local fiable publica pieza firmada sobre protesta vecinal contra una decisión del gobierno municipal; además hay comunicado de entidad local y vídeo de la concentración.

Resultado:
- corroboración sólida y alto impacto reputacional
- `confidence_score ≈ 82-92`
- estado: `action_limpiar`

### Caso E — Activar altavoz
- Radio local, nota oficial y varias entidades del municipio reconocen positivamente una medida del grupo/portavoz, con eco orgánico verificable.

Resultado:
- señal favorable con comprobación suficiente
- `confidence_score ≈ 80-90`
- estado: `action_altaveu`

---

## 9) Encaje con los módulos del brief

### 9.1 Módulo `limpiar reputación`

Usa este filtro para:
- apagar fuegos reales antes de amplificar bulos
- distinguir crítica legítima de basura coordinada
- priorizar incidencias con evidencia sólida
- reducir falsos positivos que empujan a responder donde no hace falta

Salida recomendada para cada alerta:
- qué hecho sí está verificado
- qué parte sigue en duda
- qué fuentes sostienen la alerta
- nivel de urgencia
- recomendación: responder / contrastar / monitorizar / ignorar

### 9.2 Módulo `altavoz`

Usa este filtro para:
- no amplificar logros dudosos o métricas infladas
- asegurar que la oportunidad positiva tiene base real
- seleccionar nodos de difusión con credibilidad y arraigo local

Regla clave:
- **solo se amplifica lo comprobable**; si una oportunidad favorable no supera el `reality check`, no debe convertirse en argumentario triunfalista.

---

## 10) Recomendación de implementación futura

Sin cambiar código en esta iteración, la futura implementación debería introducir estas piezas:

1. **Modelo normalizado por mención/hallazgo**
   - `source_type`
   - `source_id` o descriptor de fuente
   - `evidence_type`
   - `corroboration_count`
   - `reality_check_status`
   - `confidence_score`
   - `noise_flags[]`
   - `review_status`
   - `recommended_module`

2. **Pipeline de evaluación en fases**
   - ingestión/detección
   - deduplicación
   - descarte inmediato
   - scoring de confianza
   - asignación de estado
   - cola de revisión humana para casos grises

3. **Auditabilidad**
   - registrar por qué se descartó o aprobó cada mención
   - guardar flags explicables, no solo score final

4. **UI operativa futura**
   - filtros por `confidence_score`, `reality_check_status` y `noise_flags`
   - vista de evidencia y corroboración para analistas/editorial

---

## 11) Decisiones técnicas y editoriales tomadas

1. El problema central se modela a nivel de **mención individual**, no solo de fuente global.
2. La comprobación de realidad es una compuerta obligatoria previa a cualquier acción política.
3. La confianza combina seis dimensiones: fuente, evidencia, corroboración, contexto, relevancia e integridad narrativa.
4. El sistema debe separar `reject`, `observe`, `manual_review` y acciones operativas.
5. La prensa local y las fuentes territoriales verificables conservan prioridad porque reducen error contextual en municipios pequeños.
6. El volumen social solo vale si supera trazabilidad, contexto y evidencia mínima.

---

## 12) Archivos modificados

- `specs/reputacio/SPEC.md`

Cambios realizados en esta iteración:
- se añade una nueva sección de diseño para filtro de ruido y comprobación de realidad
- se definen criterios de descarte inmediato y descarte por baja fiabilidad
- se especifican señales de ruido, irrelevancia y baja comprobación factual
- se diseña una jerarquía de evidencia y reglas de `reality check`
- se propone una puntuación de confianza de 0 a 100 con factores y umbrales
- se conectan los resultados con los módulos `limpiar reputación` y `altavoz`
- se deja una recomendación concreta de implementación futura sin tocar código de producción

---

## 13) Límites de esta iteración

No se implementa en esta tarea:
- persistencia de menciones filtradas en base de datos
- cambios en endpoints FastAPI
- scoring automático en backend o pipeline
- revisión humana asistida en frontend
- conectores nuevos de redes sociales

Se entrega únicamente la especificación operativa pedida por el brief.
