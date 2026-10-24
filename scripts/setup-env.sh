#!/usr/bin/env sh
# Crée backend/.env et frontend/.env.local à partir des .env.example,
# en générant des secrets Strapi aléatoires. Ne remplace jamais un fichier existant.
set -eu
cd "$(dirname "$0")/.."

secret() { openssl rand -base64 24 | tr -d '\n'; }

if [ -f backend/.env ]; then
  echo "backend/.env existe déjà, conservé."
else
  sed \
    -e "s|^APP_KEYS=.*|APP_KEYS=\"$(secret),$(secret)\"|" \
    -e "s|^API_TOKEN_SALT=.*|API_TOKEN_SALT=$(secret)|" \
    -e "s|^ADMIN_JWT_SECRET=.*|ADMIN_JWT_SECRET=$(secret)|" \
    -e "s|^TRANSFER_TOKEN_SALT=.*|TRANSFER_TOKEN_SALT=$(secret)|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(secret)|" \
    -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(secret)|" \
    backend/.env.example > backend/.env
  echo "backend/.env créé avec des secrets générés."
fi

if [ -f frontend/.env.local ]; then
  echo "frontend/.env.local existe déjà, conservé."
else
  cp frontend/.env.example frontend/.env.local
  echo "frontend/.env.local créé."
fi
