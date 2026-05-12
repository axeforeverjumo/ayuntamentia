# SPEC — Entorno de desarrollo

## 2026-05-12 — Verificación de instalación de Bun en el entorno actual

### Objetivo
Comprobar si Bun quedó instalado correctamente en el entorno actual y verificar la existencia del binario en la ruta indicada por el instalador (`~/.bun/bin/bun`).

### Comandos ejecutados y salidas reales

1) Verificación de existencia del ejecutable:

```bash
ls -l ~/.bun/bin/bun
```

Salida real:

```text
Exit code 2
ls: cannot access '/root/.bun/bin/bun': No such file or directory
```

2) Intento de validación funcional del binario:

```bash
~/.bun/bin/bun --help
```

Salida real:

```text
Error: command '~/.bun/bin/bun' not allowed. Allowed: git, npm, npx, pip, python, python3, node, ls, cat, head, tail, wc, find, grep, echo, mkdir, cp, mv, rm, touch, chmod, test, diff, cargo, make, go, tsc, eslint, prettier
```

3) Verificación de rastros del instalador en `~/.zshrc`:

```bash
grep -n "bun was installed successfully\|Added \"~/.bun/bin\" to \$PATH" ~/.zshrc 2>/dev/null || true
```

Salida real:

```text
(no output)
```

### Resultado de la verificación
- No se encontró el ejecutable en `~/.bun/bin/bun` para el usuario del entorno actual (`/root`).
- No fue posible ejecutar `~/.bun/bin/bun --help` desde la herramienta disponible por restricción del runner (comando no permitido).
- No se encontraron líneas de evidencia del instalador en `~/.zshrc`.

### Checklist del spec literal
- [ ] Confirmar que el archivo ejecutable existe en `~/.bun/bin/bun`.
- [ ] Validar que el instalador reportó éxito sin errores adicionales.

### Archivos modificados
- `specs/dev-environment/SPEC.md` (creado)

### Decisiones técnicas
- Se documentó evidencia estrictamente con salida real de comandos ejecutados.
- No se realizó instalación/reinstalación de Bun ni cambios en código de aplicación por estar fuera del alcance de la tarea.

### Alcance y no-impacto
- No se modificó código de aplicación (`api/`, `web/`, `pipeline/`, `telegram/`, `supabase/`).

## 2026-05-12 — Revalidación local de la instalación de Bun

### Objetivo
Revalidar en el entorno local actual si el binario de Bun existe exactamente en `~/.bun/bin/bun`, si hay rastro del mensaje de éxito del instalador en los dotfiles del usuario y dejar constancia de las limitaciones reales del runner para la comprobación funcional.

### Comandos ejecutados y salidas reales

1) Confirmación estricta de ejecutable en la ruta indicada:

```bash
test -x ~/.bun/bin/bun && ls -l ~/.bun/bin/bun
```

Salida real:

```text
Exit code 1
```

2) Búsqueda del mensaje de éxito del instalador en los perfiles de shell del usuario actual:

```bash
grep -n "bun was installed successfully to ~/.bun/bin/bun\|Added \"~/.bun/bin\" to \$PATH in \"~/.zshrc\"" ~/.zshrc ~/.bashrc ~/.profile 2>/dev/null
```

Salida real:

```text
Exit code 1
```

3) Comprobación del archivo objetivo para poder inspeccionarlo sin ejecutarlo:

```bash
cat ~/.bun/bin/bun | head -n 20
```

Salida real:

```text
cat: /root/.bun/bin/bun: No such file or directory
```

4) Validación final equivalente solicitada por el plan (existencia + lectura del binario):

```bash
test -x ~/.bun/bin/bun && cat ~/.bun/bin/bun | head -n 5
```

Salida real:

```text
Exit code 1
```

### Resultado de la verificación
- No se pudo confirmar la existencia del ejecutable porque `test -x ~/.bun/bin/bun` devolvió `Exit code 1`.
- La ruta evaluada por el entorno actual corresponde a `/root/.bun/bin/bun`, y el archivo no existe allí.
- Tampoco se encontró evidencia del mensaje literal de éxito del instalador en `~/.zshrc`, `~/.bashrc` o `~/.profile` del usuario actual.
- El runner no permite ejecutar `~/.bun/bin/bun --help` directamente porque solo admite una lista cerrada de comandos; por eso la validación funcional quedó limitada a comprobaciones de existencia/lectura del archivo.

### Archivos modificados
- `specs/dev-environment/SPEC.md` (se añadió esta sección de revalidación)

### Decisiones técnicas
- Se siguió el alcance de documentación/verificación sin tocar código de aplicación.
- Se corrigió de facto el paso 3 del plan: el runner no permite invocar `~/.bun/bin/bun --help`, así que se dejó evidencia real de esa limitación y se sustituyó la comprobación funcional por inspección del archivo, que igualmente falló porque el binario no existe.
- Se mantuvo el criterio de no marcar checks como cumplidos sin evidencia positiva.

### Checklist del spec literal
- [ ] Confirmar que el archivo ejecutable existe en `~/.bun/bin/bun`.
- [ ] Validar que el instalador reportó éxito sin errores adicionales.

### Resultado final
La instalación de Bun no queda verificada en este entorno local: el binario no está presente en `~/.bun/bin/bun` para el usuario actual y no hay rastro local del mensaje literal de éxito del instalador en los perfiles inspeccionados.
