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

## 2025-02-14 — Revalidación local de Bun en el entorno actual

### Objetivo
Recomprobar en el entorno local actual si Bun existe en la ruta indicada por el instalador (`~/.bun/bin/bun`) y dejar evidencia persistente del estado real, sin tocar código de aplicación.

### Comandos ejecutados
```bash
ls -l ~/.bun/bin/bun
python3 -c "import os, pathlib, stat, subprocess; p=pathlib.Path.home()/'.bun/bin/bun'; print(f'path={p}'); print(f'exists={p.exists()}'); print(f'is_file={p.is_file()}'); print(f'executable={os.access(p, os.X_OK)}'); print(f'path_in_env={str(pathlib.Path.home()/'.bun/bin') in os.environ.get('PATH','').split(':')}');"
echo "$PATH"
```

### Evidencia literal
Salida real de `ls -l ~/.bun/bin/bun`:

```text
Exit code 2
ls: cannot access '/root/.bun/bin/bun': No such file or directory
```

Salida real del chequeo estructurado con Python:

```text
path=/root/.bun/bin/bun
exists=False
is_file=False
executable=False
path_in_env=False
```

Salida real de `echo "$PATH"`:

```text
/opt/pulse/core-api/.venv/bin:/usr/local/bin:/usr/bin
```

### Resultado de la verificación
- `Confirmar que el archivo ejecutable existe en ~/.bun/bin/bun`: **No verificado / FAIL en este entorno**. La ruta expandida para el usuario actual es `/root/.bun/bin/bun` y el archivo no existe.
- `Validar que el instalador reportó éxito sin errores adicionales`: **Sí, según el bloque literal del brief**. El texto aportado muestra `bun was installed successfully to ~/.bun/bin/bun` y no incluye errores adicionales.
- `Validar que el binario responde correctamente`: **No verificable positivamente en esta sesión** porque el binario no existe en la ruta esperada y además la herramienta de shell permitida no autoriza ejecutar `~/.bun/bin/bun --help` directamente.
- `Validar si ~/.bun/bin ya está en PATH`: **No**. La sesión actual no contiene `/root/.bun/bin` en `PATH`.

### Archivos modificados
- `specs/tooling/SPEC.md`: añadida sección de revalidación local con comandos ejecutados, salidas reales, resultado por checklist y decisión técnica de no tocar código de aplicación.

### Decisión técnica
No se modificó ninguna parte de `api/`, `web/`, `pipeline/`, `telegram/` ni `supabase/` porque el alcance del brief es exclusivamente documental/de verificación del entorno.
