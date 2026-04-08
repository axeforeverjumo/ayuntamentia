#!/bin/bash
# Initialize database schema on the server's Supabase PostgreSQL
set -e

SERVER="root@85.215.105.45"
DB_CONTAINER="supabase-db"  # or pulse-supabase-db

echo "=== Initializing AyuntamentIA database ==="

# Copy migration to server
scp /opt/ayuntamentia/supabase/migrations/001_schema.sql $SERVER:/tmp/ayuntamentia_schema.sql 2>/dev/null || true

# Execute migration
ssh $SERVER "
    docker exec -i $DB_CONTAINER psql -U postgres -d postgres < /tmp/ayuntamentia_schema.sql
    echo '✅ Schema created successfully'
    docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('municipios', 'actas', 'puntos_pleno', 'votaciones', 'alertas');\"
"
