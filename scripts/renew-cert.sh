#!/bin/bash

# Script de renovação automática de certificados SSL
# Executado via cron a cada dia às 2:00 AM

set -e

DOMAIN="controle-financeiro.gaius.digital"
LOG_FILE="/var/log/certbot-renewal.log"

echo "$(date): Iniciando verificação de renovação de certificado para $DOMAIN" >> $LOG_FILE

# Encontrar o path correto do certificado (pode ter sufixo -0001, -0002, etc.)
CERT_PATH=""
for dir in /etc/letsencrypt/live/${DOMAIN}*; do
    if [ -f "$dir/fullchain.pem" ]; then
        CERT_PATH="$dir"
        break
    fi
done

if [ -z "$CERT_PATH" ]; then
    echo "$(date): Certificado não encontrado para $DOMAIN" >> $LOG_FILE
    exit 1
fi

echo "$(date): Certificado encontrado em $CERT_PATH" >> $LOG_FILE

# Verificar se o certificado expira em menos de 30 dias
if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH/fullchain.pem" 2>/dev/null; then
    echo "$(date): Certificado ainda válido por mais de 30 dias. Nenhuma ação necessária." >> $LOG_FILE
    exit 0
fi

echo "$(date): Certificado expira em menos de 30 dias. Iniciando renovação..." >> $LOG_FILE

# Tentar renovar o certificado
if certbot renew --webroot --webroot-path="/var/www/certbot"; then
    echo "$(date): ✅ Certificado renovado com sucesso!" >> $LOG_FILE

    # Verificar validade do novo certificado
    NEW_EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" | cut -d= -f2)
    echo "$(date): Novo certificado válido até: $NEW_EXPIRY" >> $LOG_FILE

    # Sinalizar para o nginx recarregar (via arquivo de flag)
    touch /var/www/certbot/.nginx-reload-needed
    echo "$(date): Flag de reload criada. O nginx precisa ser reiniciado externamente." >> $LOG_FILE
else
    echo "$(date): ❌ Erro na renovação do certificado" >> $LOG_FILE
    exit 1
fi

echo "$(date): Processo de renovação concluído" >> $LOG_FILE