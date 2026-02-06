# 🔧 FIX: Script nginx-config.sh não encontrado

## 🚨 **Problema Original:**

```bash
sh: can't open '/scripts/nginx-config.sh': No such file or directory
make: *** [Makefile:165: ssl-restart-http] Error 2
```

## 🔍 **Causa Raiz:**

O container `nginx` não tinha acesso aos scripts porque:

1. **Volume `/scripts` não estava montado** no nginx
2. **Comando executava dentro do container** sem acesso aos arquivos
3. **Diretório conf.d estava read-only** impedindo modificações

## ✅ **Soluções Implementadas:**

### **1. Correção dos Volumes Docker**

**Arquivo:** `docker-compose.yml`

```yaml
# ANTES:
volumes:
  - ./nginx/conf.d:/etc/nginx/conf.d:ro  # read-only ❌

# DEPOIS:
volumes:
  - ./nginx/conf.d:/etc/nginx/conf.d:rw  # read-write ✅
  - ./scripts:/scripts:ro                # scripts montados ✅
```

### **2. Script Externo Robusto**

**Arquivo:** `scripts/nginx-switch.sh` (NOVO)

- ✅ Executa no host (não depende do container)
- ✅ Gerencia arquivos de configuração diretamente
- ✅ Suporte para HTTP e HTTPS
- ✅ Verificação e criação automática de arquivos
- ✅ Logs detalhados

### **3. Comandos Makefile Simplificados**

**Arquivo:** `Makefile`

```bash
# ANTES (dependia de script interno):
docker-compose run --rm nginx -c "sh /scripts/nginx-config.sh http"

# DEPOIS (script externo):
./scripts/nginx-switch.sh http
```

**Novos comandos:**
- `make ssl-restart-http` - Para e reinicia nginx com HTTP
- `make ssl-switch-http` - Alterna para HTTP sem parar
- `make ssl-switch-https` - Alterna para HTTPS sem parar

## 🚀 **Para aplicar no servidor:**

```bash
cd gerenciador-financeiro

# Puxar as correções
git pull

# Agora o comando deve funcionar
make ssl-restart-http

# Verificar se funcionou
make status
```

## 🧪 **Testando localmente:**

```bash
# Teste do comando
make -n ssl-restart-http

# Teste do script diretamente
./scripts/nginx-switch.sh http
./scripts/nginx-switch.sh https
```

## 📋 **Arquivos Modificados:**

- ✅ `docker-compose.yml` - Volumes nginx corrigidos
- ✅ `scripts/nginx-switch.sh` - **NOVO** script externo
- ✅ `Makefile` - Comandos ssl-restart-http, ssl-switch-*

## 🎯 **Resultado:**

- ✅ **Script acessível** no container nginx
- ✅ **Comando `make ssl-restart-http` funciona**
- ✅ **Alternância HTTP/HTTPS simplificada**
- ✅ **Não depende de scripts internos do container**
- ✅ **Mais robusto e confiável**

## ⚡ **Comando final para o servidor:**

```bash
make ssl-restart-http
```

**Agora deve funcionar perfeitamente! ✅**