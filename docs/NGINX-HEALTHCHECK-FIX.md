# 🏥 Correção do Health Check do Nginx

## 🔍 Problema Identificado

O container `gf-nginx` está reportando `health: unhealthy` porque o health check não está passando. Isso pode acontecer por:

1. **Redirecionamento HTTPS**: O health check tenta acessar HTTP mas é redirecionado
2. **Certificados SSL**: Problemas com certificados podem bloquear HTTPS
3. **Configuração nginx**: Conflitos ou erros na configuração
4. **Timeout insuficiente**: Health check muito restritivo

## ✅ Correções Implementadas

### 1. **Health Check Robusto**
Criado script `/nginx/healthcheck.sh` que:
- ✅ Testa configuração nginx (`nginx -t`)
- ✅ Tenta HTTP primeiro (`http://localhost:80/health`)
- ✅ Fallback para HTTPS (`https://localhost:443/health`)
- ✅ Testa resposta geral se `/health` falhar
- ✅ Verifica se processo nginx está rodando
- ✅ Logs detalhados para diagnóstico

### 2. **Timeouts Aumentados**
- **Interval**: 30s (tempo entre checks)
- **Timeout**: 15s (tempo limite por check)
- **Start Period**: 60s (tempo inicial antes de começar)
- **Retries**: 5 (tentativas antes de marcar como unhealthy)

### 3. **Health Check Duplo**
- Health check no **Dockerfile** (nível da imagem)
- Health check no **docker-compose.yml** (nível do serviço)

## 🚀 Como Aplicar no Servidor

### **Opção 1: Comando Automático**
```bash
cd gerenciador-financeiro
make nginx-rebuild
```

### **Opção 2: Passos Manuais**
```bash
cd gerenciador-financeiro

# 1. Parar nginx
docker-compose stop nginx

# 2. Reconstruir imagem (força nova build)
docker-compose build --no-cache nginx

# 3. Reiniciar nginx
docker-compose up -d nginx

# 4. Verificar status (aguardar ~60s para start_period)
docker-compose ps nginx
```

## 🔍 Verificação e Diagnóstico

### **Verificar Health Check**
```bash
# Status dos containers
docker-compose ps

# Logs do health check
docker-compose logs nginx | grep -i health

# Testar health check manualmente
docker-compose exec nginx /usr/local/bin/healthcheck.sh

# Ver logs detalhados do nginx
docker-compose logs --tail=50 nginx
```

### **Verificar Endpoints**
```bash
# Testar HTTP
curl -I http://controle-financeiro.gaius.digital/health

# Testar HTTPS
curl -k -I https://controle-financeiro.gaius.digital/health

# Verificar redirecionamento
curl -I http://controle-financeiro.gaius.digital/
```

## 🐛 Solução para Problemas Específicos

### **Se health check continuar falhando:**

1. **Verificar configuração nginx**:
   ```bash
   docker-compose exec nginx nginx -t
   ```

2. **Verificar se /health endpoint existe**:
   ```bash
   docker-compose exec nginx curl -f http://localhost:80/health
   ```

3. **Verificar certificados SSL**:
   ```bash
   docker-compose exec nginx ls -la /etc/letsencrypt/live/controle-financeiro.gaius.digital/
   ```

4. **Logs detalhados do health check**:
   ```bash
   docker-compose exec nginx /usr/local/bin/healthcheck.sh
   ```

### **Se precisar desabilitar temporariamente:**

Editar `docker-compose.yml` e comentar o health check:
```yaml
nginx:
  # healthcheck:
  #   test: ["CMD", "/usr/local/bin/healthcheck.sh"]
  #   interval: 30s
  #   timeout: 15s
  #   retries: 5
  #   start_period: 60s
```

## 📋 Arquivos Modificados

- ✅ `nginx/Dockerfile` - Health check robusto
- ✅ `nginx/healthcheck.sh` - Script de verificação detalhado
- ✅ `docker-compose.yml` - Health check configurado
- ✅ `Makefile` - Comando `nginx-rebuild`

## 🎯 Resultado Esperado

Após aplicar as correções:
```bash
docker-compose ps nginx
# Deve mostrar: Up X minutes (healthy)
```

**O nginx deve parar de reiniciar e manter-se saudável! ✅**