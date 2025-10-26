#!/bin/bash

# Script de verificação pré-certificação SSL
# Verifica se todos os pré-requisitos estão atendidos

set -e

DOMAIN="controle-financeiro.gaius.digital"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verificando pré-requisitos para certificação SSL..."
echo "=================================================="
echo ""

# 1. Verificar DNS
echo "1️⃣ Verificando DNS..."
if command -v nslookup >/dev/null 2>&1; then
    DNS_IP=$(nslookup $DOMAIN | grep "Address:" | tail -n1 | awk '{print $2}')
    if [ -n "$DNS_IP" ]; then
        printf "${GREEN}✅ DNS resolvendo: $DOMAIN -> $DNS_IP${NC}\n"
    else
        printf "${RED}❌ DNS não está resolvendo para $DOMAIN${NC}\n"
    fi
else
    printf "${YELLOW}⚠️  nslookup não disponível - pule esta verificação${NC}\n"
fi
echo ""

# 2. Verificar se nginx está rodando
echo "2️⃣ Verificando Nginx..."
if docker-compose ps nginx | grep -q "Up"; then
    printf "${GREEN}✅ Container Nginx está rodando${NC}\n"
else
    printf "${RED}❌ Container Nginx não está rodando${NC}\n"
    echo "Execute: docker-compose up -d nginx"
fi
echo ""

# 3. Verificar conectividade HTTP
echo "3️⃣ Verificando conectividade HTTP..."
if command -v curl >/dev/null 2>&1; then
    if curl -s --connect-timeout 10 -I "http://$DOMAIN/health" | grep -q "200"; then
        printf "${GREEN}✅ HTTP acessível: http://$DOMAIN${NC}\n"
    else
        printf "${RED}❌ HTTP não acessível: http://$DOMAIN${NC}\n"
        echo "Verifique:"
        echo "- Firewall (porta 80)"
        echo "- DNS apontando para este servidor"
        echo "- Nginx configurado corretamente"
    fi
else
    printf "${YELLOW}⚠️  curl não disponível - teste manualmente: http://$DOMAIN/health${NC}\n"
fi
echo ""

# 4. Verificar diretório ACME
echo "4️⃣ Verificando diretório ACME..."
ACME_DIR="/var/www/certbot/.well-known/acme-challenge"
if docker-compose exec nginx test -d "$ACME_DIR" 2>/dev/null; then
    printf "${GREEN}✅ Diretório ACME existe: $ACME_DIR${NC}\n"
else
    printf "${YELLOW}⚠️  Criando diretório ACME...${NC}\n"
    docker-compose exec nginx mkdir -p "$ACME_DIR" 2>/dev/null || printf "${RED}❌ Falha ao criar diretório ACME${NC}\n"
fi
echo ""

# 5. Teste de arquivo ACME
echo "5️⃣ Testando servir arquivos ACME..."
TEST_FILE="test-$(date +%s).txt"
TEST_CONTENT="test-acme-challenge-$(date)"

# Criar arquivo de teste
if docker-compose run --rm --entrypoint /bin/sh certbot -c "echo '$TEST_CONTENT' > /var/www/certbot/.well-known/acme-challenge/$TEST_FILE" 2>/dev/null; then
    printf "${GREEN}✅ Arquivo de teste criado${NC}\n"
    
    # Testar acesso ao arquivo
    if command -v curl >/dev/null 2>&1; then
        sleep 2
        RESPONSE=$(curl -s "http://$DOMAIN/.well-known/acme-challenge/$TEST_FILE" 2>/dev/null || echo "ERRO")
        if [ "$RESPONSE" = "$TEST_CONTENT" ]; then
            printf "${GREEN}✅ ACME challenge acessível via HTTP${NC}\n"
        else
            printf "${RED}❌ ACME challenge NÃO acessível${NC}\n"
            echo "Resposta recebida: $RESPONSE"
            echo "Esperado: $TEST_CONTENT"
        fi
        
        # Limpar arquivo de teste
        docker-compose run --rm --entrypoint /bin/sh certbot -c "rm -f /var/www/certbot/.well-known/acme-challenge/$TEST_FILE" 2>/dev/null
    else
        printf "${YELLOW}⚠️  curl não disponível - teste manualmente:${NC}\n"
        echo "   http://$DOMAIN/.well-known/acme-challenge/$TEST_FILE"
    fi
else
    printf "${RED}❌ Falha ao criar arquivo de teste${NC}\n"
fi
echo ""

# 6. Verificar configuração nginx
echo "6️⃣ Verificando configuração Nginx..."
if docker-compose exec nginx nginx -t 2>/dev/null; then
    printf "${GREEN}✅ Configuração Nginx válida${NC}\n"
else
    printf "${RED}❌ Configuração Nginx inválida${NC}\n"
    echo "Execute: docker-compose exec nginx nginx -t"
fi
echo ""

# 7. Verificar volumes
echo "7️⃣ Verificando volumes..."
if docker volume ls | grep -q "certbot_certs"; then
    printf "${GREEN}✅ Volume certbot_certs existe${NC}\n"
else
    printf "${YELLOW}⚠️  Volume certbot_certs será criado automaticamente${NC}\n"
fi

if docker volume ls | grep -q "certbot_www"; then
    printf "${GREEN}✅ Volume certbot_www existe${NC}\n"
else
    printf "${YELLOW}⚠️  Volume certbot_www será criado automaticamente${NC}\n"
fi
echo ""

echo "=================================================="
echo "🎯 Verificação concluída!"
echo ""
echo "Se todos os itens estão ✅, execute:"
echo "   make ssl-init-prod"
echo ""
echo "Se há itens ❌, corrija-os antes de prosseguir."