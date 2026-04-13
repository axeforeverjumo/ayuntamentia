#!/bin/bash
# Crea un usuario admin de AyuntamentIA en Supabase Auth + perfil.
# Uso: ./create_admin.sh <email> <password> <nombre>
set -e

EMAIL="${1:?Uso: create_admin.sh email password nombre}"
PASSWORD="${2:?password}"
NOMBRE="${3:?nombre}"

SUPABASE_URL="${SUPABASE_URL:-http://localhost:8000}"
SERVICE_KEY="${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY env var requerida}"

echo "Creando usuario en Supabase Auth..."
USER_JSON=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}")

USER_ID=$(echo "$USER_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "User ID: $USER_ID"

echo "Insertando perfil admin..."
PGPASSWORD="${PG_PASSWORD:?PG_PASSWORD requerida}" psql -h "${PG_HOST:-localhost}" -U postgres -d postgres -c \
  "INSERT INTO user_profiles (user_id, nombre, rol, activo) VALUES ('$USER_ID', '$NOMBRE', 'admin', TRUE)
   ON CONFLICT (user_id) DO UPDATE SET nombre=EXCLUDED.nombre, rol='admin', activo=TRUE;"

echo "✅ Admin creat: $EMAIL / $NOMBRE"
