#!/usr/bin/env bash
# ==============================================================================
# NUMA — SCRIPT DE DESPLIEGUE EN VPS
# ==============================================================================
set -euo pipefail

echo "Iniciando despliegue de Numa..."

if [ ! -f .env.production ]; then
    echo "Creando .env.production desde .env.production.example..."
    cp .env.production.example .env.production

    VAULT_KEY=$(openssl rand -hex 32)
    APP_KEY=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -hex 16)

    sed -i "s|cambiar_por_clave_hex_de_64_caracteres_generada_con_openssl_rand_hex_32|$VAULT_KEY|g" .env.production
    sed -i "s|TU_PASSWORD_AQUI|$DB_PASS|g" .env.production
    sed -i "s|generate_with_openssl_rand_hex_32|$APP_KEY|g" .env.production
fi

chmod 600 .env.production

corepack enable || true

mkdir -p data logs
chmod 700 data

pnpm install --frozen-lockfile
pnpm build

if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
    pm2 save
else
    echo "PM2 no detectado. Inicia el servidor ejecutando: pnpm start"
fi

echo "Despliegue completado."
