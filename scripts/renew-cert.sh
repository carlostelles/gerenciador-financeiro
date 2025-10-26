#!/bin/bash

# Script de renovação automática de certificados SSL
# Executado via cron a cada dia às 2:00 AM

set -e

DOMAIN="controle-financeiro.gaius.digital"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
LOG_FILE="/var/log/certbot-renewal.log"

echo "$(date): Iniciando verificação de renovação de certificado para $DOMAIN" >> $LOG_FILE

# Verificar se o certificado existe
if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    echo "$(date): Certificado não encontrado em $CERT_PATH" >> $LOG_FILE
    exit 1
fi

# Verificar se o certificado expira em menos de 30 dias
if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH/fullchain.pem" 2>/dev/null; then
    echo "$(date): Certificado ainda válido por mais de 30 dias. Nenhuma ação necessária." >> $LOG_FILE
    exit 0
fi

echo "$(date): Certificado expira em menos de 30 dias. Iniciando renovação..." >> $LOG_FILE

# Tentar renovar o certificado
if certbot renew --quiet --webroot --webroot-path="/var/www/certbot"; then
    echo "$(date): ✅ Certificado renovado com sucesso!" >> $LOG_FILE
    
    # Recarregar nginx para usar o novo certificado
    echo "$(date): Recarregando configuração do Nginx..." >> $LOG_FILE
    
    # Enviar sinal de reload para o container nginx
    docker exec gf-nginx nginx -s reload
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "$(date): ✅ Nginx recarregado com sucesso!" >> $LOG_FILE
    else
        echo "$(date): ❌ Erro ao recarregar Nginx" >> $LOG_FILE
    fi
    
    # Verificar validade do novo certificado
    NEW_EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" | cut -d= -f2)
    echo "$(date): Novo certificado válido até: $NEW_EXPIRY" >> $LOG_FILE
    
else
    echo "$(date): ❌ Erro na renovação do certificado" >> $LOG_FILE
    exit 1
fi

echo "$(date): Processo de renovação concluído" >> $LOG_FILE