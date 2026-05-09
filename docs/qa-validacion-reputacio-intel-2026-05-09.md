# Validación funcional final — `/reputacio` y `/intel`

Fecha: 2026-05-09

## Objetivo
Validar funcionalmente los cambios recientes para:
- refresco automático de `/reputacio`,
- eliminación de noticias antiguas,
- feedback visual de carga en `/intel`,
- evidencia de cierre.

## Evidencia técnica revisada

### `/reputacio`
- El frontend hace refresco automático cada 30 segundos mediante `setInterval` en `web/src/app/reputacio/page.tsx`.
- Las peticiones de overview y detalle usan `cache: 'no-store'`.
- El backend expone `GET /api/reputacio/latest` con cabeceras `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
- La ingesta manual y programada usan `POST /api/reputacio/ingest`.
- Se añadió limpieza física de noticias antiguas en `api/src/routes/reputacio.py` con borrado de `premsa_articles` cuya `data_publicacio` queda fuera de la ventana de 30 días.

### `/intel`
- El loader aparece solo si la carga supera `350ms`.
- Si llega a mostrarse, permanece visible al menos `900ms`.
- El bloque tiene `role="status"`, `aria-live="polite"`, `aria-atomic="true"` y `aria-busy` para feedback accesible.
- El mensaje visible comunica explícitamente que se están recuperando ránquings, tendencias y promesas.

## Evidencia de verificación ejecutada

### Build frontend
Se ejecutó:
- `npm --prefix web run build`

Resultado observado:
- Compilación correcta.
- Rutas `/reputacio` y `/intel` generadas correctamente.

### Lint frontend
Se ejecutó:
- `npm --prefix web run lint`

Resultado observado:
- Existen errores y warnings previos en otras pantallas del proyecto.
- No bloquean específicamente esta incidencia, pero deben quedar registrados como gap transversal.

### Sintaxis Python global
Se ejecutó:
- `python3 -c "import ast, pathlib; [ast.parse(p.read_text()) for p in pathlib.Path('.').rglob('*.py') if '.git' not in str(p)]"`

Resultado observado:
- Sin salida, exit 0.

## Antes / después

### Antes
- `/reputacio` podía quedar visualmente congelada con noticias antiguas y sin limpieza física de registros viejos.
- `/intel` podía dejar una sensación de pantalla vacía mientras la carga tardaba en completarse.

### Después
- `/reputacio` mantiene auto-refresco en cliente, sin caché en cliente/backend y ahora además elimina físicamente noticias fuera de la ventana temporal esperada.
- `/intel` muestra un estado de carga visible, animado y accesible cuando la espera es real.

## Limitaciones de esta validación
- En este entorno no se ha ejecutado un navegador real ni un smoke E2E con capturas automáticas.
- La evidencia disponible es técnica/funcional por inspección de código y comandos de build/sintaxis/lint.
- Para cierre operativo en producción controlada conviene verificar manualmente:
  1. que `POST /api/reputacio/ingest` devuelve `articles_eliminats > 0` cuando existan noticias antiguas,
  2. que `/reputacio` refresca la lista sin recargar la página,
  3. que `/intel` muestra el loader en red lenta.
