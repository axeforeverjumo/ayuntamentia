# Multi-tenant — desplegar AyuntamentIA para cualquier partido

La herramienta es **genérica** y puede servir a cualquier partido político catalán (AC, PP, PSC, ERC, JxCat, CUP, VOX, Cs, Comuns). El "partido cliente" se configura con variables de entorno que controlan:

- **Prompts del chat** (POV): quién es el cliente, cómo interpretar "nosotros vs rivales"
- **Branding**: hero "L'arma política de {X}", tagline, saludo del bot de Telegram
- **Preguntas de los modos políticos**: "Dossier contra {rival}", "Defensar posició de {cliente}", etc.
- **Tool `oportunidades_tema`**: detecta huecos políticos donde el cliente puede crecer

Los **datos municipales son los mismos** (actas, votaciones, argumentos, mociones) — sólo cambia el ángulo de interpretación. Una única DB sirve a todos los tenants.

## Variables de entorno

Pon estas en `.env` antes de `docker compose build`:

```bash
# Sigla canónica (mayúsculas). Debe coincidir con los aliases internos.
CLIENT_PARTIDO=PP

# Nombre mostrado al usuario (hero, saludos, prompts)
CLIENT_NOMBRE=Partit Popular

# Opcional: orden de prioridad de rivales (CSV). Si está vacío, se infiere
# del partido — ver _default_rivales_por_partido en api/src/routes/chat.py.
CLIENT_RIVALES=PSC,ERC,JxCat,VOX,CUP,Cs
```

Valores soportados de `CLIENT_PARTIDO`:

| Sigla    | Nombre típico                                   |
|----------|-------------------------------------------------|
| `AC`     | Aliança Catalana                                |
| `PP`     | Partit Popular                                  |
| `PSC`    | Partit dels Socialistes de Catalunya            |
| `ERC`    | Esquerra Republicana de Catalunya               |
| `JxCat`  | Junts per Catalunya                             |
| `CUP`    | Candidatura d'Unitat Popular                    |
| `VOX`    | Vox                                             |
| `Cs`     | Ciutadans                                       |
| `Comuns` | Catalunya en Comú                               |

## Despliegue por tenant (un VPS, varios dominios)

El patrón recomendado: **un docker-compose por tenant**, cada uno en su propia carpeta `/opt/ayuntamentia-{tenant}/` con su `.env`. Nginx enruta cada dominio a los puertos correspondientes.

Ejemplo: desplegar para PP en `pp.factoriaia.com` (port 3200 web, 8060 API):

```bash
# En el VPS
mkdir -p /opt/ayuntamentia-pp
cd /opt/ayuntamentia-pp
git clone <repo> .

# Config del tenant
cat > .env << 'EOF'
# (copia el .env base y cambia las líneas relevantes)
CLIENT_PARTIDO=PP
CLIENT_NOMBRE=Partit Popular
CLIENT_RIVALES=PSC,ERC,JxCat,VOX,CUP,Cs
NEXT_PUBLIC_API_URL=https://pp.factoriaia.com
EOF

# Cambiar puertos del web para no chocar con otros tenants.
# Edita docker-compose.yml: ports "3200:3000"

docker compose build api web
docker compose up -d
```

Nginx:

```nginx
server {
    server_name pp.factoriaia.com;
    listen 443 ssl;
    # ... certbot ...

    location / {
        proxy_pass http://localhost:3200;
        # ... upgrade headers ...
    }
    location /api/ {
        proxy_pass http://localhost:8060/api/;
        proxy_read_timeout 180s;
    }
}
```

Y cada tenant tiene su propio bot de Telegram (distinto `TELEGRAM_BOT_TOKEN`).

## Qué NO cambia entre tenants

- **Base de datos**: todos los tenants consultan la misma DB de actas municipales (datos públicos). No hay separación de datos.
- **Proxy LLM (OpenClaw)**: el mismo endpoint sirve a todos los tenants.
- **Pipeline de ingesta**: una sola instancia procesa las actas; todos los tenants ven los mismos datos ya parseados.

## Qué SÍ cambia

- Prompts del chat (ROUTER_PROMPT y ANSWER_PROMPT usan `$CLIENT_PARTIDO` / `$CLIENT_NOMBRE`)
- Intent hints para modos atacar/defender/comparar/oportunidad
- Preguntas de los 5 modos políticos en el empty state del chat (generadas dinámicamente en `web/src/lib/clientConfig.ts`)
- Tool `oportunidades_tema` — detecta dónde puede crecer el cliente
- Saludo del bot de Telegram
- Hero del chat ("L'arma política de {X}")

## Endpoint de introspección

`GET /api/chat/config` devuelve:

```json
{
  "partido": "PP",
  "nombre": "Partit Popular",
  "rivales": ["PSC", "ERC", "JxCat", "VOX", "CUP", "Cs"]
}
```

Útil para depurar qué tenant está activo en un despliegue.

## Testing local con otro tenant

```bash
CLIENT_PARTIDO=PP CLIENT_NOMBRE="Partit Popular" docker compose up --build api web
```

Abre http://localhost:3100/chat y verás:
- Hero: "L'arma política de Partit Popular"
- Modo Atacar con preguntas tipo "Dossier complet contra PSC sobre civisme"
- Modo Comparar con "PSC vs JxCat en immigració 2026"

## Limitaciones conocidas

- **Los ejemplos del ROUTER_PROMPT** usan siempre partidos reales de la escena catalana (Junts, ERC, PSC, etc.) como ilustración. Esto es correcto (el modelo aprende qué tools usar para cada patrón) y no sesga la respuesta porque el intent hint + ANSWER_PROMPT usan el `$CLIENT_PARTIDO` efectivo.
- **El hardcode del nombre por defecto** sigue siendo "Aliança Catalana" si no se configura nada — por compatibilidad con el despliegue actual.
- **Next.js requiere rebuild** para cambiar las `NEXT_PUBLIC_*` (son inlineadas en build time).
