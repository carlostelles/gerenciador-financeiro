#!/bin/bash

# Script de inicialização SSL com Let's Encrypt
# Autor: Sistema de Gerenciamento Financeiro
# Data: $(date)

set -e

DOMAIN="controle-financeiro.gaius.digital"
EMAIL="ola@carlostelles.com.br"  # Altere para seu email
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
WWW_PATH="/var/www/certbot"

echo "=== Inicializando configuração SSL para $DOMAIN ==="

# Verificar se o certificado já existe e é válido
if [ -d "$CERT_PATH" ]; then
    echo "Certificado encontrado em $CERT_PATH"
    
    # Verificar se o certificado ainda é válido (mais de 30 dias)
    if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH/fullchain.pem" 2>/dev/null; then
        echo "Certificado ainda é válido por mais de 30 dias. Usando certificado existente."
        exit 0
    else
        echo "Certificado expira em menos de 30 dias ou é inválido. Renovando..."
    fi
else
    echo "Certificado não encontrado. Criando novo certificado..."
fi

# Criar diretório para validação ACME
mkdir -p "$WWW_PATH/.well-known/acme-challenge"

# Verificar se o domínio está acessível
echo "Verificando conectividade com $DOMAIN..."
if ! curl -s --connect-timeout 10 "http://$DOMAIN/.well-known/acme-challenge/" > /dev/null; then
    echo "Aviso: Não foi possível conectar com $DOMAIN. Certifique-se de que:"
    echo "1. O DNS está configurado corretamente"
    echo "2. O servidor está acessível na porta 80"
    echo "3. O Nginx está rodando e configurado"
    echo ""
    echo "Continuando com a solicitação do certificado..."
fi

# Obter ou renovar certificado
echo "Solicitando certificado SSL para $DOMAIN..."

# Usar staging para testes (remova --staging para produção)
echo "Usando staging environment para testes..."
certbot certonly \
    --webroot \
    --webroot-path="$WWW_PATH" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --verbose \
    --staging \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL obtido com sucesso!"
    echo "Certificado salvo em: $CERT_PATH"
    
    # Verificar informações do certificado
    echo ""
    echo "=== Informações do Certificado ==="
    openssl x509 -in "$CERT_PATH/fullchain.pem" -text -noout | grep -E "(Subject:|Not After:|DNS:)"
    
    # Testar configuração do nginx
    echo ""
    echo "=== Testando configuração do Nginx ==="
    if command -v nginx > /dev/null; then
        nginx -t
        echo "✅ Configuração do Nginx válida!"
    fi
    
    echo ""
    echo "🔧 Para aplicar o certificado, reinicie o Nginx:"
    echo "docker-compose restart nginx"
    
else
    echo "❌ Erro ao obter certificado SSL"
    echo "Verifique:"
    echo "1. DNS do domínio $DOMAIN está apontando para este servidor"
    echo "2. Portas 80 e 443 estão abertas no firewall"
    echo "3. Nginx está configurado corretamente"
    exit 1
fi