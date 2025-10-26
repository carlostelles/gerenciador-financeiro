#!/bin/bash

# Script principal de deploy com SSL
# Gerenciador Financeiro - Deploy com HTTPS automático

set -e

DOMAIN="controle-financeiro.gaius.digital"
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Iniciando deploy do Gerenciador Financeiro com SSL"
echo "Domínio: $DOMAIN"
echo "Data: $(date)"
echo ""
echo "⚠️  IMPORTANTE: Este script foi substituído pelo Makefile"
echo "❓ Use: make ssl-deploy"
echo ""
echo "Redirecionando para o Makefile em 3 segundos..."
sleep 3

exec make ssl-deploy