# Tooling SPEC

## 2025-02-14 — Verificación de instalación de Bun en el entorno actual

### Objetivo
Comprobar en el entorno actual si Bun quedó instalado correctamente y si el binario existe en la ruta indicada por el instalador: `~/.bun/bin/bun`.

### Comandos ejecutados
```bash
test -x ~/.bun/bin/bun && ls -l ~/.bun/bin/bun
ls -l /root/.bun/bin/bun
head -n 20 /root/.bun/bin/bun
```

### Evidencia literal
Salida real del chequeo de ejecutable:

```text
Exit code 1
```

Salida real de `ls -l /root/.bun/bin/bun`:

```text
ls: cannot access '/root/.bun/bin/bun': No such file or directory
```

Salida real de `head -n 20 /root/.bun/bin/bun`:

```text
head: cannot open '/root/.bun/bin/bun' for reading: No such file or directory
```

### Contraste con el bloque del instalador aportado en el brief
El brief contiene literalmente la línea:

```text
bun was installed successfully to ~/.bun/bin/bun
```

En ese bloque no aparecen errores adicionales: solo el mensaje de éxito, la adición de `~/.bun/bin` al `PATH` en `~/.zshrc` y las instrucciones `exec /bin/zsh` y `bun --help`.

### Resultado de la verificación
- `Confirmar que el archivo ejecutable existe en ~/.bun/bin/bun`: **No verificado positivamente en este entorno**. Los comandos ejecutados no encontraron `/root/.bun/bin/bun`.
- `Validar que el instalador reportó éxito sin errores adicionales`: **Sí, según el bloque literal del brief**. La salida compartida reporta éxito y no incluye errores adicionales.
- `Validar que el binario arranca desde la ruta indicada`: **No verificable en este entorno** porque el archivo no existe y además la herramienta de shell permitida no acepta ejecutar `~/.bun/bin/bun` directamente.

### Archivos modificados
- `specs/tooling/SPEC.md`: añadido registro de verificación con comandos ejecutados, evidencia literal y conclusión por checklist.

### Self-Review (con evidencia ejecutada)
- A) Sintaxis Python:

```text
(no output)
```

- B) Manifest coherente:

```text
(no output)
```

- C) Campos del brief presentes:

```text
No aplicable. El brief no pide modelos ni campos.
```

- D) @api.depends completos:

```text
No aplicable. El brief no pide computes.
```

- E) __init__.py:

```text
find: ‘addons’: No such file or directory
```

Interpretación de B y E: no aplican al proyecto actual porque no es Odoo y no existe carpeta `addons`.
