# SPEC — Informes

## 2026-05-10 — Tipologías de informes por rango interno y petición (exploración)

### Objetivo
Definir la **oferta de informes de `/informes`** en función de dos ejes:
- el **rango interno** dentro del partido
- la **necesidad informativa o petición concreta** formulada por dirección u otros responsables

La iteración debe dejar documentado:
- qué rangos consumen informes y qué necesitan saber
- qué tipologías de informes ofrece la plataforma
- cómo se solicitan y parametrizan los informes para futuras implementaciones o ampliaciones

### Alcance de esta iteración
- **Tipo de tarea:** exploración/documentación.
- **Sin cambios de código de producción** en `api/`, `web/`, `pipeline/` o `supabase/`.
- Se trabaja sobre la realidad observada del repositorio y sobre la funcionalidad ya existente de `/informes`, `subscripciones` y `thematic_brief` descrita en la documentación del producto.

---

## 1) Contexto auditado en el repositorio

Archivos revisados para esta definición:
- `README.md`
- `docs/ESPECIFICACION_FUNCIONAL.md`
- `docs/MANUAL_USUARIO.md`
- `docs/MANUAL_ADMIN.md`
- `api/src/routes/informes.py`

### Conclusiones del estado actual
- La plataforma ya contempla una superficie `/informes` y, al menos a nivel backend actual, un endpoint `GET /api/informes/semanal` orientado al informe semanal.
- La documentación funcional del producto ya distingue entre:
  - **informe semanal automático para dirección**
  - **briefs temáticos personalizados** gestionados desde `/subscripcions`
- Los roles reales documentados son `admin`, `direccion`, `delegado` y `concejal`, con diferencias claras de alcance territorial y temático.
- Falta una definición explícita de **catálogo de informes por rango y por petición**, para ordenar qué tipo de pieza debe recibir cada perfil y con qué parámetros.

---

## 2) Principio rector de la oferta de informes

La oferta de informes no debe organizarse solo por periodicidad (diario/semanal), sino por una combinación de:
1. **quién lo recibe**
2. **para qué decisión lo necesita**
3. **qué profundidad y formato requiere**
4. **qué nivel de personalización territorial o temática necesita**

### Regla funcional
Un mismo hecho o foco analítico puede derivar en informes distintos según destinatario:
- dirección necesita síntesis, prioridad y decisión
- delegados necesitan seguimiento temático o territorial
- concejales necesitan utilidad local, argumentario y contexto rápido
- admin puede necesitar control operativo y validación del sistema

Por tanto, `/informes` debe entenderse como una **capa editorial de entrega de inteligencia**, no solo como un listado de PDFs o resúmenes cronológicos.

---

## 3) Rangos internos del partido y necesidades de información

## 3.1 Dirección del partido

### Necesidades principales
- visión ejecutiva transversal
- prioridades políticas de la semana
- riesgos reputacionales o de incoherencia
- oportunidades de crecimiento, ataque o defensa
- cambios relevantes por territorio, rival o tema
- material breve para toma de decisiones y coordinación interna

### Tipo de consumo esperado
- lectura rápida, de alto nivel
- foco en "qué importa ahora" y "qué hacemos"
- trazabilidad suficiente, sin exceso de detalle operativo

### Informes más adecuados
- informe ejecutivo semanal
- informe de coyuntura urgente
- informe estratégico temático
- informe de oportunidad o crisis
- dossier comparativo rival

---

## 3.2 Delegados territoriales o temáticos

### Necesidades principales
- evolución de temas bajo su responsabilidad
- focos por municipio o comarca
- alertas tempranas y cambios de tendencia
- comparativas entre territorios o actores
- seguimiento de temas recurrentes con cierto detalle

### Tipo de consumo esperado
- intermedio entre ejecutivo y operativo
- suficiente contexto para accionar llamadas, visitas, mensajes o coordinación local
- posibilidad de filtrado por tema, territorio y ventana temporal

### Informes más adecuados
- brief temático periódico
- informe territorial de seguimiento
- informe de alertas y divergencias
- comparativa por municipios/comarcas

---

## 3.3 Concejales y portavoces locales

### Necesidades principales
- contexto rápido del municipio
- resumen de temas sensibles locales
- incoherencias rivales aprovechables
- líneas de defensa propias
- argumentos cortos para intervención pública o mediática

### Tipo de consumo esperado
- concreto, accionable y local
- menor volumen, mayor claridad
- orientación práctica para pleno, radio local, entrevista, redes o reunión vecinal

### Informes más adecuados
- ficha municipal operativa
- brief de pleno o post-pleno
- argumentario de tema local
- informe de contraste rival en el municipio

---

## 3.4 Administración / coordinación interna

### Necesidades principales
- confirmar que los envíos automáticos funcionan
- revisar consumo y periodicidades
- verificar qué informes están activos y para quién
- controlar cobertura temática o territorial de las suscripciones

### Tipo de consumo esperado
- operativo y de supervisión
- centrado en estado, programación y trazabilidad, no en análisis político profundo

### Informes más adecuados
- informe operativo de envíos
- informe de cobertura de suscripciones
- informe de incidencias o gaps de generación

---

## 4) Tipologías de informes propuestas

Se define un catálogo funcional de informes que combina:
- **informes estructurales**: estables y recurrentes
- **informes bajo petición**: generados por necesidad concreta
- **informes de activación rápida**: para crisis, oportunidad o pleno

## 4.1 Informe ejecutivo semanal

### Destinatario principal
- dirección
- opcionalmente perfiles ejecutivos ampliados

### Objetivo
Dar una visión compacta de la semana con prioridad política clara.

### Contenido recomendado
- titular ejecutivo
- top movimientos políticos detectados
- territorios/focos calientes
- riesgos reputacionales o incoherencias relevantes
- oportunidades accionables
- qué vigilar la próxima semana

### Formato de entrega
- email
- Telegram
- vista web en `/informes`
- exportable a PDF en futura implementación si conviene

### Frecuencia natural
- semanal automática

---

## 4.2 Brief temático periódico

### Destinatario principal
- delegados temáticos
- dirección cuando quiera seguimiento específico
- concejales con foco especializado

### Objetivo
Seguir un tema concreto en una ventana temporal definida.

### Contenido recomendado
- evolución del tema
- municipios donde más aparece
- votaciones o argumentos relevantes
- eco social o reputacional asociado
- riesgos, oportunidades y próximos focos

### Parámetros naturales
- tema principal
- subtemas opcionales
- municipios opcionales
- ventana temporal
- canal de entrega
- periodicidad

### Formato de entrega
- email
- Telegram
- histórico en `/informes` o `/subscripcions`

---

## 4.3 Informe territorial de seguimiento

### Destinatario principal
- dirección territorial
- delegados
- concejales de coordinación comarcal

### Objetivo
Explicar qué está pasando en un municipio, comarca o conjunto de municipios.

### Contenido recomendado
- actividad política destacada del territorio
- temas dominantes
- cambios frente a la ventana anterior
- riesgos y oportunidades locales
- actores relevantes y comparativa básica con rivales

### Parámetros naturales
- municipio o comarca
- ventana temporal
- temas opcionales
- partido/rival opcional

### Formato de entrega
- ficha web
- email resumido
- brief descargable en futura implementación

---

## 4.4 Ficha municipal operativa

### Destinatario principal
- concejales
- portavoces locales
- dirección en visitas o seguimiento puntual

### Objetivo
Ofrecer una pieza breve y utilizable para acción inmediata sobre un municipio.

### Contenido recomendado
- resumen del contexto municipal
- temas sensibles activos
- posición propia y rival si aplica
- alertas o incoherencias relevantes
- 3-5 bullets accionables o argumentales

### Formato de entrega
- web/mobile-first
- Telegram útil para consumo rápido
- posible versión imprimible breve

### Frecuencia natural
- bajo petición
- o vinculada a eventos de pleno / crisis / campaña

---

## 4.5 Brief pre-pleno / post-pleno

### Destinatario principal
- concejales
- portavoces
- coordinación territorial

### Objetivo
Preparar o cerrar la lectura política de un pleno concreto.

### Variante pre-pleno
Debe incluir:
- orden del día relevante
- antecedentes del tema
- posicionamientos comparables
- riesgos de mensaje
- argumentos sugeridos

### Variante post-pleno
Debe incluir:
- qué ocurrió
- cómo votó cada actor relevante
- oportunidades de comunicación
- incoherencias detectadas
- seguimiento recomendado

### Formato de entrega
- web
- Telegram
- envío puntual por email

---

## 4.6 Informe de alertas y divergencias

### Destinatario principal
- dirección
- responsables políticos
- perfiles de disciplina interna

### Objetivo
Concentrar señales que requieren revisión por incoherencia, divergencia o cambio brusco.

### Contenido recomendado
- alertas de tendencia o salto territorial
- divergencias internas de voto o discurso
- severidad y confianza
- territorios afectados
- recomendación inicial: investigar, corregir, monitorizar, escalar

### Formato de entrega
- web priorizada
- email resumido
- posible envío urgente cuando supere umbral

---

## 4.7 Dossier comparativo rival

### Destinatario principal
- dirección
- comunicación
- portavoces

### Objetivo
Preparar una lectura comparada entre el cliente y uno o más rivales.

### Contenido recomendado
- diferencias de voto
- contradicciones entre discurso y práctica
- promesas incumplidas o dobles raseros
- territorios donde el rival queda expuesto
- ángulos recomendados para ataque político

### Parámetros naturales
- rival o lista de rivales
- tema
- territorio
- ventana temporal
- nivel de agresividad/editorial deseado en futura implementación

### Formato de entrega
- dossier web largo
- resumen ejecutivo corto
- base para nota de prensa o argumentario

---

## 4.8 Informe de oportunidad / crisis

### Destinatario principal
- dirección
- comunicación
- responsables territoriales afectados

### Objetivo
Responder a una petición urgente sobre:
- una oportunidad favorable a amplificar
- una crisis reputacional a contener

### Contenido recomendado
- qué pasó
- qué parte está verificada
- actores implicados
- impacto estimado
- recomendación inmediata
- canal/portavoz sugerido
- seguimiento de 24-72h

### Formato de entrega
- prioritariamente Telegram o vista rápida web
- email si requiere más desarrollo

### Naturaleza
- bajo petición
- o activado por sistema cuando la señal supere cierto umbral

---

## 4.9 Informe operativo de suscripciones y cobertura

### Destinatario principal
- admin
- coordinación de producto/operaciones

### Objetivo
Supervisar el funcionamiento del sistema de informes y la cobertura existente.

### Contenido recomendado
- suscripciones activas por rol
- temas más solicitados
- territorios cubiertos y no cubiertos
- periodicidades más usadas
- errores de envío o faltas de datos

### Formato de entrega
- panel admin
- export operativo

---

## 5) Mapeo entre rango y tipología de informe

| Rango | Informes prioritarios | Nivel de detalle | Tono/forma esperada |
|---|---|---:|---|
| Dirección | Ejecutivo semanal, coyuntura urgente, dossier rival, oportunidad/crisis | Bajo-medio, muy sintetizado | Decisión y prioridad |
| Delegado | Brief temático, territorial, alertas/divergencias | Medio | Seguimiento y coordinación |
| Concejal/portavoz | Ficha municipal, pre/post-pleno, argumentario local | Medio-bajo, muy accionable | Uso inmediato en territorio |
| Admin | Operativo de envíos/cobertura | Bajo político, alto operativo | Supervisión y trazabilidad |

### Regla clave
No todos los rangos deben ver el mismo informe con el mismo formato. El sistema debe modular:
- longitud
- profundidad
- territorio
- foco temático
- urgencia
- formato de entrega

---

## 6) Formatos de entrega recomendados

## 6.1 Web `/informes`
Debe funcionar como archivo histórico, visor y punto de acceso a informes generados o solicitados.

Adecuado para:
- informes ejecutivos
- dossiers largos
- fichas consultables
- históricos por tema/territorio

## 6.2 Email
Adecuado para:
- informes periódicos
- piezas ejecutivas
- briefs con estructura estable

Ventaja:
- consumo asíncrono
- fácil reenvío interno

## 6.3 Telegram
Adecuado para:
- alertas rápidas
- briefs cortos
- oportunidades/crisis
- fichas municipales muy resumidas

Ventaja:
- inmediatez
- alta utilidad móvil para cargos y dirección

## 6.4 Export / PDF / impresión
No se observa aún como implementación materializada en el código auditado, pero queda recomendado para:
- dossiers rival
- informes de dirección
- piezas para reuniones presenciales

---

## 7) Cómo se solicitarán los informes

La solicitud debe contemplar dos modos complementarios:

## 7.1 Solicitud programada
Equivale al modelo ya documentado de subscripciones.

### Casos de uso
- informe semanal de dirección
- brief temático recurrente
- seguimiento territorial periódico

### Parámetros esperables
- nombre del informe
- tipo de informe
- rol/destinatario
- periodicidad (`cron` o patrón simplificado)
- canal (`email`, `Telegram`, ambos, web)
- temas
- territorios
- ventana temporal

## 7.2 Solicitud bajo petición
Pensada para necesidades no recurrentes.

### Casos de uso
- “quiero un dossier sobre vivienda en Girona”
- “preparad un informe rápido de este pleno”
- “necesito una comparativa con ERC en seguridad”
- “dame una pieza de crisis sobre este caso”

### Canales naturales de petición futura
- botón o formulario en `/informes`
- acción desde `/subscripcions`
- petición guiada desde `/chat`
- activación interna desde alertas o reputación

### Resultado esperado
La solicitud bajo petición no debe producir un texto genérico. Debe obligar a explicitar:
- objetivo político del informe
- tema o foco
- territorio
- urgencia
- destinatario final

---

## 8) Parametrización recomendada de los informes

Toda tipología debería poder expresarse con un conjunto común de parámetros. Esto facilita futuras implementaciones backend/frontend.

## 8.1 Parámetros base
- `report_type`
- `request_mode` (`scheduled` / `on_demand`)
- `target_role`
- `delivery_channels[]`
- `time_window`
- `urgency`
- `language`

## 8.2 Parámetros analíticos
- `topics[]`
- `territories[]`
- `municipios[]`
- `comarcas[]`
- `actors[]`
- `parties[]`
- `include_alerts`
- `include_reputation`
- `include_parlament`
- `include_comparison`

## 8.3 Parámetros editoriales
- `output_length` (`flash`, `brief`, `standard`, `dossier`)
- `tone` (`ejecutivo`, `operativo`, `argumental`, `comparativo`)
- `audience`
- `goal` (`monitorizar`, `decidir`, `atacar`, `defender`, `preparar_pleno`, `seguir_crisis`, `amplificar`)

## 8.4 Parámetros operativos
- `schedule_cron`
- `subscription_name`
- `send_now`
- `expires_at`
- `owner_user_id`
- `shared_with_roles[]`

### Regla de diseño
La parametrización debe separar claramente:
- **qué contenido se pide**
- **para quién se produce**
- **cómo se entrega**
- **con qué urgencia se necesita**

---

## 9) Plantillas de salida por tipo de informe

## 9.1 Plantilla ejecutiva
Adecuada para dirección.

Estructura sugerida:
1. titular
2. 3-5 movimientos clave
3. riesgos/oportunidades
4. decisión o vigilancia recomendada

## 9.2 Plantilla de seguimiento
Adecuada para delegados.

Estructura sugerida:
1. resumen del periodo
2. focos por territorio/tema
3. alertas y cambios
4. próximos pasos

## 9.3 Plantilla operativa local
Adecuada para concejales.

Estructura sugerida:
1. contexto rápido
2. qué ha pasado
3. qué decir / qué vigilar
4. 3-5 bullets de uso inmediato

## 9.4 Plantilla de crisis/oportunidad
Adecuada para comunicación y dirección.

Estructura sugerida:
1. hecho principal
2. verificación
3. impacto estimado
4. respuesta o activación sugerida
5. ventana temporal y seguimiento

---

## 10) Reglas de decisión para elegir informe según petición

### Regla 1 — Si el usuario pide panorama general y priorización
→ `informe ejecutivo semanal` o `informe de coyuntura`

### Regla 2 — Si pide seguimiento de un tema en el tiempo
→ `brief temático periódico`

### Regla 3 — Si pide lectura localizada por municipio/comarca
→ `informe territorial` o `ficha municipal`

### Regla 4 — Si el foco es un pleno concreto
→ `brief pre-pleno / post-pleno`

### Regla 5 — Si busca munición frente a rival
→ `dossier comparativo rival`

### Regla 6 — Si hay urgencia reputacional o de comunicación
→ `informe de oportunidad / crisis`

### Regla 7 — Si la necesidad es de supervisión del sistema
→ `informe operativo de suscripciones y cobertura`

---

## 11) Recomendaciones de implementación futura

Sin tocar código en esta iteración, una futura implementación debería contemplar:

1. **Catálogo tipado de informes**
   - centralizar tipos de informe en backend/frontend para evitar piezas ad hoc inconsistentes.

2. **Formulario de solicitud en `/informes`**
   - selector de tipo, rango destinatario, territorio, tema, urgencia y canal.

3. **Compatibilidad entre `/informes` y `/subscripcions`**
   - reutilizar parametrización para informes programados y bajo demanda.

4. **Render adaptado por rol**
   - la misma base analítica puede renderizarse en formato ejecutivo, seguimiento o ficha local.

5. **Trazabilidad de solicitud**
   - registrar quién pidió cada informe, con qué parámetros y para qué objetivo.

6. **Histórico filtrable**
   - por tipo, territorio, tema, solicitante y rol objetivo.

7. **Plantillas editoriales reutilizables**
   - para garantizar consistencia entre dirección, delegados, portavoces y administración.

---

## 12) Decisiones funcionales tomadas

1. `/informes` se define como una **oferta editorial por rango y necesidad**, no solo como informe semanal genérico.
2. Los rangos mínimos observados en el proyecto (`direccion`, `delegado`, `concejal`, `admin`) requieren piezas distintas en profundidad y formato.
3. La tipología mínima recomendada incluye informes ejecutivos, temáticos, territoriales, municipales, de pleno, de alertas/divergencias, comparativos rivales, de crisis/oportunidad y operativos.
4. La solicitud debe soportar dos modos: **programado** y **bajo petición**.
5. La parametrización futura debe unificar contenido, destinatario, urgencia y canal de entrega.
6. Telegram y email son canales naturales ya alineados con la plataforma; la web `/informes` debe servir como histórico y visor principal.

---

## 13) Archivos modificados

- `specs/informes/SPEC.md`

### Cambios realizados en esta iteración
- se crea la sección de especificación de `informes`
- se identifican rangos internos y necesidades informativas
- se define un catálogo funcional de tipologías de informes
- se documentan formatos de entrega
- se documenta cómo solicitar y parametrizar informes programados y bajo petición
- se dejan recomendaciones de implementación futura sin modificar código de producción

---

## 14) Límites de esta iteración

No se implementa en esta tarea:
- nuevos endpoints FastAPI en `api/src/routes/informes.py`
- cambios de frontend en `web/src/app/informes`
- persistencia de nuevos modelos de solicitud de informes
- plantillas reales de generación
- automatización de formularios o flujos UI

Se entrega únicamente la especificación funcional solicitada.
