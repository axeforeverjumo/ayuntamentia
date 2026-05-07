#!/bin/bash
cd /opt/ayuntamentia || exit 1
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/home/claude/backups/politica
mkdir -p $BACKUP_DIR

echo "=== BACKUP ==="
tar czf $BACKUP_DIR/politica-$TIMESTAMP.tar.gz     --exclude='node_modules' --exclude='.next' --exclude='.git'     web/src web/public web/package.json web/next.config.ts web/postcss.config.mjs     2>/dev/null
echo "Backup: $BACKUP_DIR/politica-$TIMESTAMP.tar.gz"
ls -t $BACKUP_DIR/politica-*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null

echo "=== REBUILDING DOCKER ==="
docker compose up -d --build web 2>&1
sleep 15

echo "=== VERIFICATION ==="
HTTP_CODE=$(curl -sI http://127.0.0.1:3100/ -o /dev/null -w "%{http_code}")
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "DEPLOY OK — https://politica.factoriaia.com"
else
    echo "DEPLOY ISSUE — HTTP $HTTP_CODE (Docker puede tardar mas, espera 30s y prueba de nuevo)"
fi
