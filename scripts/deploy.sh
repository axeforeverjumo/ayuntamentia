#!/bin/bash
# Deploy AyuntamentIA to server 85.215.105.45
set -e

SERVER="root@85.215.105.45"
PROJECT_DIR="/opt/ayuntamentia"
REPO_URL="https://github.com/axeforeverjumo/ayuntamentia.git"

echo "=== Deploying AyuntamentIA ==="

# 1. Clone/pull repo on server
ssh $SERVER "
    if [ -d $PROJECT_DIR ]; then
        cd $PROJECT_DIR && git pull
    else
        git clone $REPO_URL $PROJECT_DIR
    fi
"

# 2. Copy .env if it doesn't exist
ssh $SERVER "
    if [ ! -f $PROJECT_DIR/.env ]; then
        cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env
        echo '⚠️  .env created from example — edit it with real values!'
    fi
"

# 3. Build and start services
ssh $SERVER "
    cd $PROJECT_DIR
    docker compose build
    docker compose up -d
    echo '✅ Services started'
    docker compose ps
"

echo "=== Deploy complete ==="
echo "API: http://85.215.105.45:8050/api/health"
echo "Web: http://85.215.105.45:3100"
