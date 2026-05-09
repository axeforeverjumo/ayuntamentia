# Diseño de ingesta de vídeos de plenos para tendencias

Fecha: 2026-05-09  
Área: dashboard / tendencias / intel / pipeline  
Tipo de tarea: exploración

## Estado del documento

Este archivo se mantiene como **alias documental** para quienes busquen la propuesta en `docs/`.

El artefacto canónico y alineado con la estructura del repositorio es:

- `specs/dashboard/video-plens-ingesta-tendencies.md`

## Resumen ejecutivo

Se ha definido un flujo completo para incorporar vídeos de plenos como nueva fuente analítica:

1. descubrimiento y catálogo del vídeo,
2. captura del medio y preparación de audio,
3. transcripción automática,
4. revisión humana y control de calidad,
5. segmentación analítica y extracción de temas,
6. asimilación con tendencias e intel.

## Decisiones cerradas

- Los vídeos de plenos son una **fuente complementaria** a las actas.
- Ninguna transcripción cruda debe entrar directamente en el ranking de tendencias.
- La señal de vídeo debe llegar a tendencias como componente trazable y con prevención de doble conteo por sesión.
- Intel puede reutilizar la fuente como contexto y evidencia, pero **sin** recuperar un bloque visual de `intel stream` en dashboard.
- Solo deben usarse en análisis transcripciones con cobertura, confianza, vinculación y trazabilidad suficientes.

## Referencia

Para el diseño completo, contexto verificado del repo, integración detallada y criterios mínimos de calidad, consultar:

- `specs/dashboard/video-plens-ingesta-tendencies.md`
