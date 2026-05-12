# SPEC — DevOps

## 2026-05-12 — Recarga de sesión Zsh para incorporar Bun al PATH

### Objetivo
Dejar evidencia verificable del estado actual tras la instrucción de recargar Zsh para que `PATH` incluya la ruta de Bun añadida por el instalador.

### Contexto y ajuste del plan
- La tarea es de **documentación/verificación operativa**, no de implementación de producto.
- El plan pedía comprobar una nueva sesión de Zsh con `zsh -ic ...`, pero el runner disponible **no permite invocar `zsh`** mediante `run_shell`.
- Por ello, se documenta el bloqueo con salida real y se añade la evidencia observable del entorno actual (`~/.zshrc`, `PATH`, resolución de `bun`) sin tocar código de la app.

### Comandos ejecutados y salidas reales

1) Intento de verificar el PATH en una shell Zsh interactiva:

```bash
zsh -ic 'printf "%s\n" "$PATH"; command -v bun; bun --help >/dev/null && echo BUN_OK'
```

Salida real:

```text
Error: command 'zsh' not allowed. Allowed: git, npm, npx, pip, python, python3, node, ls, cat, head, tail, wc, find, grep, echo, mkdir, cp, mv, rm, touch, chmod, test, diff, cargo, make, go, tsc, eslint, prettier
```

2) Estado de `~/.zshrc` del usuario actual:

```bash
python3 -c "import os,pathlib; z=pathlib.Path.home()/'.zshrc'; print(z); print(z.exists()); print(z.read_text() if z.exists() else '')"
```

Salida real:

```text
/root/.zshrc
True

. "$HOME/.local/bin/env"
```

3) PATH del proceso disponible y comprobación de `~/.bun/bin`:

```bash
python3 -c "import os,pathlib; p=os.environ.get('PATH',''); home=str(pathlib.Path.home()); target=home+'/.bun/bin'; print(p); print('HAS_BUN_PATH=' + str(target in p)); print('TARGET=' + target)"
```

Salida real:

```text
/opt/pulse/core-api/.venv/bin:/usr/local/bin:/usr/bin
HAS_BUN_PATH=False
TARGET=/root/.bun/bin
```

4) Resolución actual de `bun` en el entorno disponible:

```bash
python3 -c "import pathlib,shutil; home=str(pathlib.Path.home()); bun=shutil.which('bun'); print('WHICH_BUN=' + str(bun)); print('HOME=' + home)"
```

Salida real:

```text
WHICH_BUN=/usr/local/bin/bun
HOME=/root
```

### Confirmación del estado actual
- No fue posible ejecutar literalmente `exec /bin/zsh` ni abrir una nueva sesión con `zsh -ic ...` porque el runner restringe `run_shell` y `zsh` no está permitido.
- En el entorno observable por `run_shell`, `PATH` **no** contiene `/root/.bun/bin`.
- `bun` sí resuelve, pero desde `/usr/local/bin/bun`, no desde `~/.bun/bin`.
- `~/.zshrc` existe, pero su contenido visible no muestra ninguna línea que añada `~/.bun/bin` al `PATH`.

### Archivos modificados
- `specs/devops/SPEC.md`

### Self-Review (con evidencia ejecutada)
- A) Sintaxis Python: no aplica; no se tocaron archivos `.py`.
- B) Manifest coherente: no aplica; este proyecto no es Odoo.
- C) Campos del brief presentes: no aplica; el brief no pide modelos/campos.
- D) `@api.depends` completos: no aplica; este proyecto no es Odoo.
- E) `__init__.py`: no aplica; este proyecto no es Odoo.

### Gaps Descubiertos
- [GAP] El runner no permite ejecutar `zsh`, por lo que no se puede verificar de forma directa la instrucción literal `exec /bin/zsh` ni el `PATH` de una nueva sesión Zsh desde `run_shell`.
- [GAP] En el entorno actual de `run_shell`, `PATH` no contiene `~/.bun/bin`; `bun` resuelve desde `/usr/local/bin/bun`, lo que sugiere un contexto distinto al esperado por el instalador citado en el brief.
