# 🔧 Correção Docker Compose no Makefile

## 🔍 **Problema Identificado:**
```
make: docker-compose: No such file or directory
make: *** [Makefile:155: nginx-rebuild] Error 127
```

**Causa:** O servidor usa `docker compose` (sem hífen) ao invés de `docker-compose` (com hífen).

## ✅ **Correções Implementadas:**

### 1. **Detecção Automática**
Adicionada variável no Makefile que detecta automaticamente qual comando usar:
```makefile
DOCKER_COMPOSE_CMD := $(shell if command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)
```

### 2. **Comandos Corrigidos:**
- ✅ `nginx-rebuild` - Usa variável `$(DOCKER_COMPOSE_CMD)`
- ✅ `ssl-init` - Simplificado com a mesma variável
- ✅ Todos os comandos agora compatíveis

### 3. **Sintaxe Simplificada:**
Antes:
```makefile
@if command -v docker-compose >/dev/null 2>&1; then \
    docker-compose stop nginx; \
else \
    docker compose stop nginx; \
fi
```

Depois:
```makefile
$(DOCKER_COMPOSE_CMD) stop nginx
```

## 🚀 **Comandos Prontos para o Servidor:**

### **Reconstruir Nginx:**
```bash
cd gerenciador-financeiro
make nginx-rebuild
```

### **Inicializar SSL (desenvolvimento):**
```bash
cd gerenciador-financeiro
make ssl-init
```

### **Inicializar SSL (produção):**
```bash
cd gerenciador-financeiro
make ssl-init-prod
```

## 🧪 **Teste Rápido:**
```bash
# Verificar qual comando será usado
make -n nginx-rebuild | head -5

# Deve mostrar algo como:
# echo "🔧 Reconstruindo container nginx..."
# docker compose stop nginx    # <- sem hífen
```

## 📋 **Arquivos Modificados:**
- ✅ `Makefile` - Variável `DOCKER_COMPOSE_CMD` adicionada
- ✅ `nginx-rebuild` - Comando simplificado
- ✅ `ssl-init` - Comando simplificado

## 🎯 **Resultado:**

**Todos os comandos `make` agora funcionam independente da versão do Docker Compose! ✅**

**O comando `make nginx-rebuild` deve executar sem erros no servidor! 🚀**