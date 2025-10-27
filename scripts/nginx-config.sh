#!/bin/bash

# Script para alternar entre configurações HTTP e HTTPS do Nginx
# Usado durante o processo de obtenção de certificados SSL

set -e

MODE=${1:-""}
NGINX_CONF_DIR="/etc/nginx/conf.d"
HTTP_CONF="http-only.conf"
HTTPS_CONF="default.conf"

show_usage() {
    echo "Uso: $0 <modo>"
    echo ""
    echo "Modos disponíveis:"
    echo "  http    - Ativar apenas HTTP (para obtenção de certificados)"
    echo "  https   - Ativar HTTPS (após certificados obtidos)"
    echo "  status  - Mostrar configuração atual"
    echo ""
}

switch_to_http() {
    echo "🔄 Alternando para configuração HTTP..."
    
    # Desativar configuração HTTPS
    if [ -f "$NGINX_CONF_DIR/$HTTPS_CONF" ]; then
        mv "$NGINX_CONF_DIR/$HTTPS_CONF" "$NGINX_CONF_DIR/$HTTPS_CONF.disabled"
        echo "✅ Configuração HTTPS desativada"
    fi
    
    # Ativar configuração HTTP
    if [ -f "$NGINX_CONF_DIR/$HTTP_CONF.disabled" ]; then
        mv "$NGINX_CONF_DIR/$HTTP_CONF.disabled" "$NGINX_CONF_DIR/$HTTP_CONF"
        echo "✅ Configuração HTTP ativada"
    elif [ ! -f "$NGINX_CONF_DIR/$HTTP_CONF" ]; then
        echo "📝 Criando configuração HTTP..."
        # Copiar do template se existir
        if [ -f "$NGINX_CONF_DIR/$HTTP_CONF.template" ]; then
            cp "$NGINX_CONF_DIR/$HTTP_CONF.template" "$NGINX_CONF_DIR/$HTTP_CONF"
            echo "✅ Configuração HTTP criada a partir do template"
        else
            echo "❌ Arquivo $HTTP_CONF e template não encontrados"
            exit 1
        fi
    else
        echo "✅ Configuração HTTP já ativa"
    fi
    
    echo "🌐 Nginx configurado para HTTP apenas"
}

switch_to_https() {
    echo "🔄 Alternando para configuração HTTPS..."
    
    # Verificar se certificados existem
    CERT_PATH="/etc/letsencrypt/live/controle-financeiro.gaius.digital"
    if [ ! -f "$CERT_PATH/fullchain.pem" ] && [ ! -f "$CERT_PATH-0001/fullchain.pem" ]; then
        echo "❌ Certificados SSL não encontrados em $CERT_PATH"
        echo "🔧 Execute primeiro: make ssl-init"
        exit 1
    fi
    
    # Desativar configuração HTTP com tratamento de erro
    if [ -f "$NGINX_CONF_DIR/$HTTP_CONF" ]; then
        if mv "$NGINX_CONF_DIR/$HTTP_CONF" "$NGINX_CONF_DIR/$HTTP_CONF.disabled" 2>/dev/null; then
            echo "✅ Configuração HTTP desativada"
        else
            echo "⚠️  Erro ao desativar HTTP - tentando remover"
            rm -f "$NGINX_CONF_DIR/$HTTP_CONF" 2>/dev/null || echo "🔄 HTTP mantido ativo"
        fi
    fi
    
    # Ativar configuração HTTPS
    if [ -f "$NGINX_CONF_DIR/$HTTPS_CONF.disabled" ]; then
        if mv "$NGINX_CONF_DIR/$HTTPS_CONF.disabled" "$NGINX_CONF_DIR/$HTTPS_CONF" 2>/dev/null; then
            echo "✅ Configuração HTTPS ativada"
        else
            echo "⚠️  Erro ao ativar HTTPS - tentando copiar"
            cp "$NGINX_CONF_DIR/$HTTPS_CONF.disabled" "$NGINX_CONF_DIR/$HTTPS_CONF" 2>/dev/null || echo "❌ Falha ao ativar HTTPS"
        fi
    elif [ ! -f "$NGINX_CONF_DIR/$HTTPS_CONF" ]; then
        echo "❌ Arquivo $HTTPS_CONF não encontrado"
        exit 1
    else
        echo "✅ Configuração HTTPS já ativa"
    fi
    
    echo "🔒 Nginx configurado para HTTPS"
}

show_status() {
    echo "📊 Status atual da configuração Nginx:"
    echo ""
    
    if [ -f "$NGINX_CONF_DIR/$HTTP_CONF" ]; then
        echo "🌐 HTTP: ✅ Ativo ($HTTP_CONF)"
    else
        echo "🌐 HTTP: ❌ Inativo"
    fi
    
    if [ -f "$NGINX_CONF_DIR/$HTTPS_CONF" ]; then
        echo "🔒 HTTPS: ✅ Ativo ($HTTPS_CONF)"
    else
        echo "🔒 HTTPS: ❌ Inativo"
    fi
    
    echo ""
    
    # Verificar certificados
    CERT_PATH="/etc/letsencrypt/live/controle-financeiro.gaius.digital"
    if [ -f "$CERT_PATH/fullchain.pem" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" | cut -d= -f2)
        echo "📜 Certificado: ✅ Encontrado"
        echo "📅 Validade: $EXPIRY"
    else
        echo "📜 Certificado: ❌ Não encontrado"
    fi
}

case $MODE in
    "http")
        switch_to_http
        ;;
    "https")
        switch_to_https
        ;;
    "status")
        show_status
        ;;
    "")
        show_usage
        exit 1
        ;;
    *)
        echo "❌ Modo '$MODE' não reconhecido."
        echo ""
        show_usage
        exit 1
        ;;
esac

# Testar configuração
echo ""
echo "🔧 Testando configuração do Nginx..."
if nginx -t 2>/dev/null; then
    echo "✅ Configuração válida!"
else
    echo "❌ Erro na configuração do Nginx"
    exit 1
fi