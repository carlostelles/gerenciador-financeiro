#!/bin/bash

# Script para corrigir permissões SSL e inicializar nginx corretamente
# Usado quando há problemas de permissão com certificados

set -e

echo "🔧 Corrigindo permissões SSL e configuração nginx..."

# Função para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Verificar se estamos executando como root ou com sudo
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_COMMAND" ]; then
    log "⚠️  Este script precisa de privilégios administrativos"
    echo "Execute: sudo $0"
    exit 1
fi

# 1. Parar containers relacionados
log "🛑 Parando containers nginx e certbot..."
docker stop gf-nginx gf-certbot gf-certbot-cron 2>/dev/null || true

# 2. Verificar e corrigir permissões nos volumes
log "🔍 Verificando volumes de certificados..."
CERT_VOLUME=$(docker volume inspect gf-certbot-certs --format '{{.Mountpoint}}' 2>/dev/null || echo "")

if [ -n "$CERT_VOLUME" ] && [ -d "$CERT_VOLUME" ]; then
    log "📁 Volume encontrado em: $CERT_VOLUME"
    
    # Corrigir permissões recursivamente
    log "🔧 Corrigindo permissões..."
    chown -R 1000:1000 "$CERT_VOLUME" 2>/dev/null || true
    chmod -R 755 "$CERT_VOLUME" 2>/dev/null || true
    
    # Verificar se existem certificados
    DOMAIN_DIR="$CERT_VOLUME/live/controle-financeiro.gaius.digital"
    if [ -d "$DOMAIN_DIR" ]; then
        log "📜 Certificados encontrados, corrigindo permissões específicas..."
        chmod 644 "$DOMAIN_DIR"/*.pem 2>/dev/null || true
        chmod 600 "$DOMAIN_DIR"/privkey.pem 2>/dev/null || true
        log "✅ Permissões dos certificados corrigidas"
    else
        log "📜 Nenhum certificado encontrado - será criado http-only.conf"
    fi
else
    log "📁 Volume de certificados não encontrado - será criado"
fi

# 3. Preparar configuração nginx
NGINX_CONF_DIR="/tmp/nginx-conf-fix"
mkdir -p "$NGINX_CONF_DIR"

log "🔧 Preparando configuração nginx..."

# Determinar qual configuração usar
if [ -d "$CERT_VOLUME/live/controle-financeiro.gaius.digital" ] && [ -f "$CERT_VOLUME/live/controle-financeiro.gaius.digital/fullchain.pem" ]; then
    log "🔒 Certificados encontrados - usando configuração HTTPS"
    CONFIG_MODE="https"
else
    log "🌐 Certificados não encontrados - usando configuração HTTP"
    CONFIG_MODE="http"
fi

log "✅ Permissões corrigidas! Modo: $CONFIG_MODE"
log "🚀 Use: make nginx-rebuild para reiniciar o nginx"

exit 0