#!/bin/bash

# Script para gerar certificados auto-assinados para desenvolvimento
# Arquivo: scripts/generate-dev-certs.sh

set -e

DOMAIN="${1:-controle-financeiro.gaius.digital}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CERT_PATH="$CERT_DIR"

echo "=== Gerando certificados auto-assinados para desenvolvimento ==="
echo "Domínio: $DOMAIN"

# Criar diretório para certificados
mkdir -p "$CERT_DIR"

# Gerar chave privada
echo "Gerando chave privada..."
openssl genrsa -out "$CERT_DIR/privkey.pem" 2048

# Gerar certificado auto-assinado
echo "Gerando certificado auto-assinado..."
openssl req -new -x509 -key "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -days 365 \
    -subj "/C=BR/ST=Rio Grande do Sul/L=Porto Alegre/O=CARLOS TELLES TECNOLOGIA DA INFORMACAO LTDA/OU=IT/CN=$DOMAIN" \
    -extensions v3_req \
    -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=BR
ST=Rio Grande do Sul
L=Porto Alegre
O=CARLOS TELLES TECNOLOGIA DA INFORMACAO LTDA
OU=IT
CN=$DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
DNS.3 = *.gaius.digital
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
)

# Criar link simbólico para compatibilidade
ln -sf fullchain.pem "$CERT_DIR/cert.pem"

# Definir permissões
chmod 644 "$CERT_DIR/fullchain.pem"
chmod 644 "$CERT_DIR/cert.pem"
chmod 600 "$CERT_DIR/privkey.pem"

echo "✅ Certificados auto-assinados gerados com sucesso!"
echo "Localização: $CERT_DIR"
echo ""
echo "📋 Arquivos criados:"
echo "  - fullchain.pem (certificado)"
echo "  - privkey.pem (chave privada)"
echo "  - cert.pem (link para fullchain.pem)"
echo ""
echo "⚠️  AVISO: Estes são certificados auto-assinados para desenvolvimento."
echo "⚠️  O navegador mostrará um aviso de segurança que você deve aceitar."
echo ""
echo "🔍 Informações do certificado:"
openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout | grep -E "(Subject:|Not After:|DNS:|IP Address:)"