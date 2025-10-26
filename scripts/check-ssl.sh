#!/bin/bash

# Script de verificação de status SSL
# Monitora certificados e configuração HTTPS

set -e

DOMAIN="controle-financeiro.gaius.digital"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "🔍 Verificação de Status SSL para $DOMAIN"
echo "======================================="
echo ""

# Verificar se o container nginx está rodando
if docker ps | grep -q "gf-nginx"; then
    echo "✅ Container Nginx: Rodando"
else
    echo "❌ Container Nginx: Parado"
    exit 1
fi

# Verificar se o container certbot está rodando
if docker ps | grep -q "gf-certbot"; then
    echo "✅ Container Certbot: Rodando"
else
    echo "⚠️  Container Certbot: Parado (normal se não renovando)"
fi

# Verificar se o container cron está rodando
if docker ps | grep -q "gf-certbot-cron"; then
    echo "✅ Container Cron: Rodando"
else
    echo "❌ Container Cron: Parado"
fi

echo ""

# Verificar conectividade HTTP
echo "🌐 Testando conectividade HTTP..."
if curl -s --connect-timeout 10 -I "http://$DOMAIN" | grep -q "301\|302"; then
    echo "✅ HTTP: Redirecionando para HTTPS (correto)"
else
    echo "❌ HTTP: Sem redirecionamento ou inacessível"
fi

# Verificar conectividade HTTPS
echo "🔒 Testando conectividade HTTPS..."
if curl -s --connect-timeout 10 -I "https://$DOMAIN" | grep -q "200"; then
    echo "✅ HTTPS: Acessível"
else
    echo "❌ HTTPS: Inacessível"
fi

echo ""

# Verificar existência do certificado
echo "📜 Verificando certificado..."
if docker exec gf-nginx test -f "$CERT_PATH/fullchain.pem"; then
    echo "✅ Certificado: Encontrado"
    
    # Verificar validade do certificado
    EXPIRY_DATE=$(docker exec gf-nginx openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY_DATE" ]; then
        # Compatível com macOS e Linux
        EXPIRY_TIMESTAMP=$(date -jf "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null) || \
        EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null) || \
        EXPIRY_TIMESTAMP=""
        
        if [ -n "$EXPIRY_TIMESTAMP" ]; then
            CURRENT_TIMESTAMP=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
            
            echo "📅 Expira em: $EXPIRY_DATE"
            echo "⏰ Dias restantes: $DAYS_UNTIL_EXPIRY"
            
            if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
                echo "✅ Status: Certificado válido por mais de 30 dias"
            elif [ $DAYS_UNTIL_EXPIRY -gt 7 ]; then
                echo "⚠️  Status: Certificado expira em menos de 30 dias"
            else
                echo "🚨 Status: Certificado expira em menos de 7 dias!"
            fi
        else
            echo "⚠️  Não foi possível calcular dias restantes"
            echo "📅 Data bruta: $EXPIRY_DATE"
        fi
    else
        echo "❌ Não foi possível ler data de expiração"
    fi
    
    # Verificar se o certificado é válido para o domínio
    if docker exec gf-nginx openssl x509 -in "$CERT_PATH/fullchain.pem" -text -noout | grep -q "$DOMAIN"; then
        echo "✅ Domínio: Certificado válido para $DOMAIN"
    else
        echo "❌ Domínio: Certificado não válido para $DOMAIN"
    fi
    
else
    echo "❌ Certificado: Não encontrado"
fi

echo ""

# Verificar configuração SSL do Nginx
echo "⚙️  Verificando configuração Nginx..."
if docker exec gf-nginx nginx -t 2>/dev/null; then
    echo "✅ Configuração Nginx: Válida"
else
    echo "❌ Configuração Nginx: Inválida"
fi

# Verificar se HTTPS está configurado
if docker exec gf-nginx nginx -T 2>/dev/null | grep -q "listen 443 ssl"; then
    echo "✅ SSL: Configurado no Nginx"
else
    echo "❌ SSL: Não configurado no Nginx"
fi

echo ""

# Verificar logs recentes
echo "📋 Logs recentes (últimas 5 linhas):"
echo "--- Nginx ---"
docker logs gf-nginx --tail 5 2>/dev/null || echo "Sem logs nginx"
echo ""
echo "--- Certbot ---"
docker logs gf-certbot --tail 5 2>/dev/null || echo "Sem logs certbot"

echo ""

# Verificar cron de renovação
echo "🔄 Verificando auto-renovação..."
if docker exec gf-certbot-cron crontab -l 2>/dev/null | grep -q "renew-cert.sh"; then
    echo "✅ Cron: Configurado para renovação automática"
    echo "⏰ Próxima execução: Diariamente às 2:00 AM"
else
    echo "❌ Cron: Não configurado"
fi

# Verificar últimos logs de renovação
if docker exec gf-certbot-cron test -f /var/log/certbot-renewal.log; then
    echo "📝 Última tentativa de renovação:"
    docker exec gf-certbot-cron tail -1 /var/log/certbot-renewal.log
else
    echo "📝 Nenhum log de renovação encontrado"
fi

echo ""

# Teste de headers de segurança
echo "🛡️  Verificando headers de segurança..."
RESPONSE=$(curl -s -I "https://$DOMAIN" 2>/dev/null || echo "")

if echo "$RESPONSE" | grep -q "strict-transport-security"; then
    echo "✅ HSTS: Configurado"
else
    echo "❌ HSTS: Não configurado"
fi

if echo "$RESPONSE" | grep -q "x-frame-options"; then
    echo "✅ X-Frame-Options: Configurado"
else
    echo "❌ X-Frame-Options: Não configurado"
fi

if echo "$RESPONSE" | grep -q "x-content-type-options"; then
    echo "✅ X-Content-Type-Options: Configurado"
else
    echo "❌ X-Content-Type-Options: Não configurado"
fi

echo ""
echo "🔍 Verificação concluída!"
echo ""

# Resumo final
if curl -s --connect-timeout 5 "https://$DOMAIN/health" | grep -q "healthy"; then
    echo "🎉 Status Geral: Sistema funcionando com HTTPS!"
    echo "🌐 Acesse: https://$DOMAIN"
else
    echo "⚠️  Status Geral: Sistema com problemas ou inacessível"
    echo "🔧 Execute: docker-compose logs -f"
fi