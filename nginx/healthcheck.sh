#!/bin/sh

# Script de health check para nginx
# Testa múltiplos cenários para garantir que o nginx está funcionando

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Teste básico de configuração nginx
if ! nginx -t 2>/dev/null; then
    log "ERROR: Nginx configuration test failed"
    exit 1
fi

# Teste HTTP direto
if curl -f -s --connect-timeout 5 http://localhost:80/health >/dev/null 2>&1; then
    log "SUCCESS: HTTP health check passed"
    exit 0
fi

# Se HTTP falhou, testar HTTPS
if curl -k -f -s --connect-timeout 5 https://localhost:443/health >/dev/null 2>&1; then
    log "SUCCESS: HTTPS health check passed"
    exit 0
fi

# Testar se nginx está respondendo em qualquer porta
if curl -f -s --connect-timeout 5 http://localhost:80/ >/dev/null 2>&1; then
    log "WARNING: Nginx responding but /health endpoint not available"
    exit 0
fi

# Verificar se o processo nginx está rodando
if pgrep nginx >/dev/null 2>&1; then
    log "WARNING: Nginx process running but not responding to requests"
    exit 1
fi

log "ERROR: Nginx not running or not responding"
exit 1