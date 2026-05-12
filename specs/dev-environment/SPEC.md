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
