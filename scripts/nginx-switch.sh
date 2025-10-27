#!/bin/bash

# Script para configurar nginx rapidamente entre HTTP e HTTPS
# Executa diretamente no host sem depender de scripts dentro do container

set -e

MODE=${1:-"http"}
NGINX_CONF_DIR="./nginx/conf.d"
HTTP_CONF="http-only.conf"
HTTPS_CONF="default.conf"

case $MODE in
    "http")
        echo "🔄 Configurando nginx para HTTP apenas..."
        
        # Desabilitar HTTPS
        if [ -f "$NGINX_CONF_DIR/$HTTPS_CONF" ]; then
            mv "$NGINX_CONF_DIR/$HTTPS_CONF" "$NGINX_CONF_DIR/$HTTPS_CONF.disabled"
            echo "✅ Configuração HTTPS desabilitada"
        fi
        
        # Habilitar HTTP
        if [ -f "$NGINX_CONF_DIR/$HTTP_CONF.disabled" ]; then
            mv "$NGINX_CONF_DIR/$HTTP_CONF.disabled" "$NGINX_CONF_DIR/$HTTP_CONF"
            echo "✅ Configuração HTTP habilitada"
        elif [ ! -f "$NGINX_CONF_DIR/$HTTP_CONF" ]; then
            if [ -f "$NGINX_CONF_DIR/$HTTP_CONF.template" ]; then
                cp "$NGINX_CONF_DIR/$HTTP_CONF.template" "$NGINX_CONF_DIR/$HTTP_CONF"
                echo "✅ Configuração HTTP criada do template"
            else
                echo "❌ Arquivo http-only.conf não encontrado!"
                exit 1
            fi
        else
            echo "✅ Configuração HTTP já ativa"
        fi
        ;;
        
    "https")
        echo "🔄 Configurando nginx para HTTPS..."
        
        # Desabilitar HTTP
        if [ -f "$NGINX_CONF_DIR/$HTTP_CONF" ]; then
            mv "$NGINX_CONF_DIR/$HTTP_CONF" "$NGINX_CONF_DIR/$HTTP_CONF.disabled"
            echo "✅ Configuração HTTP desabilitada"
        fi
        
        # Habilitar HTTPS
        if [ -f "$NGINX_CONF_DIR/$HTTPS_CONF.disabled" ]; then
            mv "$NGINX_CONF_DIR/$HTTPS_CONF.disabled" "$NGINX_CONF_DIR/$HTTPS_CONF"
            echo "✅ Configuração HTTPS habilitada"
        elif [ ! -f "$NGINX_CONF_DIR/$HTTPS_CONF" ]; then
            echo "❌ Arquivo default.conf não encontrado!"
            exit 1
        else
            echo "✅ Configuração HTTPS já ativa"
        fi
        ;;
        
    *)
        echo "❌ Modo inválido: $MODE"
        echo "Use: $0 [http|https]"
        exit 1
        ;;
esac

echo "✅ Configuração alterada para: $MODE"