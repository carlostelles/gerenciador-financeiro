# 🔧 FIX: ACME Directory Read-Only Error

## 🚨 **Problema Identificado:**

```bash
mkdir: can't create directory '/var/www/certbot/.well-known/': Read-only file system
❌ Falha ao criar diretório ACME

/bin/sh: can't create /var/www/certbot/.well-known/acme-challenge/test-1761526357.txt: nonexistent directory
❌ Falha ao criar arquivo de teste
```

## 🔍 **Causa Raiz:**

1. **Volume certbot_www montado como read-only** (`:ro`) no nginx
2. **Script ssl-pre-check** tentando criar arquivos em sistema read-only
3. **Let's Encrypt precisa escrever** arquivos de challenge no diretório
4. **Nginx não consegue servir** arquivos ACME para verificação

## ✅ **Soluções Implementadas:**

### **1. Correção do Docker Compose**

**Arquivo:** `docker-compose.yml`

```yaml
# ANTES (❌ ERRO):
volumes:
  - certbot_www:/var/www/certbot:ro  # read-only

# DEPOIS (✅ CORRETO):
volumes:
  - certbot_www:/var/www/certbot:rw  # read-write
```

### **2. Correção do Script ssl-pre-check**

**Arquivo:** `scripts/ssl-pre-check.sh`

```bash
# ANTES (❌ Tentava criar no nginx):
$COMPOSE_CMD exec nginx mkdir -p "$ACME_DIR"

# DEPOIS (✅ Cria no certbot):
$COMPOSE_CMD run --rm --entrypoint /bin/sh certbot -c "mkdir -p '$ACME_DIR'"
```

### **3. Comando de Correção Automática**

**Arquivo:** `Makefile`

```bash
ssl-fix-acme-permissions: ## Corrigir permissões do diretório ACME
	# Para nginx
	# Cria diretório ACME via certbot
	# Reinicia nginx
	# Corrige permissões
```

## 🚀 **Para aplicar no servidor:**

### **Comando Rápido (Solução Completa):**
```bash
cd gerenciador-financeiro

# Puxar correções
git pull

# Corrigir permissões ACME
make ssl-fix-acme-permissions

# Verificar se funcionou
make ssl-pre-check
```

### **Comando Passo a Passo:**
```bash
# 1. Parar nginx para aplicar nova configuração de volume
docker compose stop nginx

# 2. Criar diretório ACME com permissões corretas
docker compose run --rm --entrypoint /bin/sh certbot -c "mkdir -p /var/www/certbot/.well-known/acme-challenge && chmod 755 /var/www/certbot/.well-known/acme-challenge"

# 3. Reiniciar nginx com nova configuração
docker compose up -d nginx

# 4. Testar se funcionou
make ssl-pre-check
```

## 🧪 **Verificação:**

```bash
# Testar criação de arquivo ACME
docker compose run --rm --entrypoint /bin/sh certbot -c "echo 'test' > /var/www/certbot/.well-known/acme-challenge/test.txt"

# Verificar se nginx serve o arquivo
curl http://controle-financeiro.gaius.digital/.well-known/acme-challenge/test.txt

# Limpar teste
docker compose run --rm --entrypoint /bin/sh certbot -c "rm -f /var/www/certbot/.well-known/acme-challenge/test.txt"
```

## 📋 **Arquivos Corrigidos:**

- ✅ `docker-compose.yml` - Volume certbot_www agora read-write
- ✅ `scripts/ssl-pre-check.sh` - Usa container certbot para criar diretórios
- ✅ `Makefile` - Comando `ssl-fix-acme-permissions`

## 🎯 **Resultado Esperado:**

- ✅ **Comando `make ssl-pre-check` funciona** sem erros de permissão
- ✅ **Diretório ACME criado** com permissões corretas
- ✅ **Let's Encrypt pode escrever** arquivos de challenge
- ✅ **Nginx pode servir** arquivos ACME para verificação
- ✅ **Processo SSL funciona** completamente

## ⚠️  **Por que isso é importante:**

O diretório `/var/www/certbot/.well-known/acme-challenge/` é onde o Let's Encrypt coloca arquivos temporários durante a verificação de domínio. Se não conseguir escrever nesses arquivos, a certificação SSL falhará.

## ⚡ **Comando final para o servidor:**

```bash
make ssl-fix-acme-permissions
```

**Após isso, `make ssl-pre-check` deve funcionar sem erros! ✅**