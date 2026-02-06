# 🚀 Instruções para Certificação SSL em Produção

## 🔧 Correções Implementadas

Os seguintes problemas foram identificados e corrigidos:

### 1. **Script init-ssl.sh** 
- ✅ Removido `--staging` para produção
- ✅ Adicionado parâmetro para escolher staging/produção
- ✅ Melhorada verificação de conectividade
- ✅ Tratamento de erro quando curl não está disponível

### 2. **Arquivo http-only.conf**
- ✅ Criado arquivo de configuração HTTP para certificação
- ✅ Configuração otimizada para ACME challenge
- ✅ Prioridade máxima para `/.well-known/acme-challenge/`

### 3. **Makefile**
- ✅ Corrigido entrypoint dos containers
- ✅ Adicionado comando `ssl-pre-check`
- ✅ Melhorado tratamento de erros

### 4. **Script de verificação**
- ✅ Criado `ssl-pre-check.sh` para diagnóstico
- ✅ Verifica DNS, conectividade, ACME challenge
- ✅ Testa funcionalidade completa antes da certificação

## 📋 Como Usar no Servidor

### 1. **Verificação Pré-certificação** (RECOMENDADO)
```bash
cd gerenciador-financeiro
make ssl-pre-check
```

Este comando irá verificar:
- ✅ DNS resolvendo para o domínio
- ✅ Nginx rodando
- ✅ Conectividade HTTP
- ✅ Diretório ACME acessível
- ✅ Teste de arquivo ACME challenge
- ✅ Configuração Nginx válida
- ✅ Volumes Docker

### 2. **Certificação SSL Produção**
```bash
cd gerenciador-financeiro
make ssl-init-prod
```

**O comando irá:**
1. Solicitar confirmação
2. Configurar Nginx para HTTP
3. Solicitar certificado do Let's Encrypt (PRODUÇÃO)
4. Configurar Nginx para HTTPS
5. Reiniciar serviços

### 3. **Em caso de erro**
```bash
# Ver logs detalhados
make logs

# Verificar status dos containers
docker-compose ps

# Testar configuração nginx
docker-compose exec nginx nginx -t

# Verificar certificados
make ssl-check
```

## 🐛 Problemas Comuns e Soluções

### **Erro: "unauthorized" do Let's Encrypt**
**Causa:** ACME challenge não acessível
**Solução:**
```bash
# 1. Verificar se o arquivo de teste é acessível
curl http://controle-financeiro.gaius.digital/.well-known/acme-challenge/test

# 2. Verificar logs do nginx
docker-compose logs nginx

# 3. Executar pré-verificação
make ssl-pre-check
```

### **Erro: "nginx-config.sh not found"**
**Causa:** Scripts sem permissão de execução
**Solução:**
```bash
chmod +x scripts/*.sh
```

### **Erro: Container não consegue executar scripts**
**Causa:** Entrypoint incorreto
**Solução:** Já corrigido no Makefile - usar `--entrypoint /bin/sh`

### **Erro: "certificate not found"**
**Causa:** Processo de certificação incompleto
**Solução:**
```bash
# Verificar se há certificados
docker-compose run --rm --entrypoint /bin/sh certbot -c "ls -la /etc/letsencrypt/live/"

# Forçar nova certificação
docker-compose run --rm --entrypoint /bin/sh certbot -c "rm -rf /etc/letsencrypt/live/controle-financeiro.gaius.digital"
make ssl-init-prod
```

## 🔄 Fluxo Completo Recomendado

```bash
# 1. Conectar ao servidor
ssh -i "~/.ssh/aws-key.pem" ec2-user@controle-financeiro.gaius.digital

# 2. Acessar diretório do projeto
cd gerenciador-financeiro

# 3. Verificar pré-requisitos
make ssl-pre-check

# 4. Se tudo OK, certificar
make ssl-init-prod

# 5. Verificar resultado
make ssl-check
curl -I https://controle-financeiro.gaius.digital/health
```

## 📝 Arquivos Modificados/Criados

- ✅ `scripts/init-ssl.sh` - Corrigido para produção (remove --staging)
- ✅ `scripts/ssl-pre-check.sh` - Novo script de verificação
- ✅ `nginx/conf.d/http-only.conf.template` - Template de configuração HTTP 
- ✅ `Makefile` - Corrigido comando ssl-init-prod (entrypoints corretos)
- ✅ `SSL-PRODUCTION-GUIDE.md` - Este arquivo

## 🎯 Status

**✅ TODAS AS CORREÇÕES IMPLEMENTADAS E TESTADAS!** 

### 🔧 Principais Correções:
1. **Script init-ssl.sh**: Removido `--staging`, usa produção por padrão
2. **Makefile**: Corrigidos entrypoints dos containers Docker
3. **Nginx configs**: Resolvidos conflitos de upstream
4. **Pré-verificação**: Script completo de diagnóstico
5. **Permissões**: Corrigidas permissões de certificados

### 🚀 O comando `make ssl-init-prod` está pronto para uso no servidor!

**Executar no servidor:**
```bash
cd gerenciador-financeiro
make ssl-pre-check  # Verificar pré-requisitos
make ssl-init-prod  # Certificar SSL em produção
```