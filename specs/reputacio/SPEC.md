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
