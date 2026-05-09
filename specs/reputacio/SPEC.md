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
