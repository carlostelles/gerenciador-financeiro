# 🔐 Guia de Configuração SSL/HTTPS

Este guia explica como configurar e usar SSL/HTTPS no projeto Gerenciador Financeiro.

## 📋 Resumo da Implementação

✅ **Concluído com Sucesso:**
- Docker Compose com suporte SSL completo
- Nginx configurado para HTTPS com redirecionamento automático
- Scripts de automação para certificados
- Certificados auto-assinados para desenvolvimento funcionando
- Makefile com comandos integrados
- Sistema de renovação automática via cron

## 🚀 Como Usar

### Para Desenvolvimento (Certificados Auto-assinados)

```bash
# Inicializar SSL para desenvolvimento
make ssl-init

# Ou manualmente:
make down
docker-compose run --rm --entrypoint /bin/sh certbot -c "sh /scripts/generate-dev-certs.sh"
make up
```

**Resultado:**
- ✅ HTTPS funcionando em https://localhost
- ✅ HTTP redirecionando automaticamente para HTTPS
- ⚠️ Navegador mostrará aviso de certificado auto-assinado (aceitar)

### Para Produção (Let's Encrypt)

```bash
# Certificados reais do Let's Encrypt
make ssl-init-prod
```

**Pré-requisitos para produção:**
1. DNS `controle-financeiro.gaius.digital` apontando para seu servidor
2. Portas 80 e 443 abertas no firewall
3. Servidor acessível da internet

## 🌐 URLs Disponíveis

Após a configuração SSL:

- **HTTPS:** https://controle-financeiro.gaius.digital (ou https://localhost para dev)
- **HTTP:** http://controle-financeiro.gaius.digital → redireciona para HTTPS
- **Health Check:** https://localhost/health (sempre responde 200 OK)

## 🔧 Comandos Disponíveis

```bash
# Desenvolvimento
make ssl-init           # Certificados auto-assinados para desenvolvimento
make ssl-deploy         # Deploy completo com SSL

# Produção
make ssl-init-prod      # Certificados Let's Encrypt para produção
make ssl-renew          # Renovar certificados
make ssl-check          # Verificar status dos certificados
make ssl-force-renew    # Forçar renovação

# Utilitários
make up                 # Iniciar aplicação
make down              # Parar aplicação
make logs              # Ver logs
```

## 📁 Estrutura de Arquivos Criados

```
gerenciador-financeiro/
├── docker-compose.yml           # Adicionado: certbot, certbot-cron
├── nginx/conf.d/default.conf    # Configuração HTTPS completa
├── scripts/
│   ├── init-ssl.sh             # Script principal Let's Encrypt
│   ├── generate-dev-certs.sh   # Gerar certificados desenvolvimento
│   ├── renew-cert.sh           # Renovação automática
│   ├── nginx-config.sh         # Alternar HTTP/HTTPS
│   └── check-ssl.sh            # Verificação de certificados
└── Makefile                     # Comandos ssl-* integrados
```

## 🔒 Configuração de Segurança

O nginx está configurado com:

- **HTTP/2** habilitado
- **HSTS** (HTTP Strict Transport Security)
- **TLS 1.2 e 1.3** apenas
- **Perfect Forward Secrecy**
- **OCSP Stapling** (para certificados reais)
- **Security Headers** completos

## 🔄 Renovação Automática

O sistema inclui renovação automática via cron:

- **Frequência:** Diária às 2:00 AM
- **Container:** `certbot-cron`
- **Logs:** Salvos automaticamente
- **Reload:** Nginx recarregado automaticamente após renovação

## ❗ Problemas Conhecidos e Soluções

### 1. Certificados Auto-assinados (Desenvolvimento)

**Problema:** Navegador mostra aviso de segurança
**Solução:** Clicar em "Avançado" → "Prosseguir para localhost (não seguro)"

### 2. Let's Encrypt Challenge Falha

**Problema:** Erro "unauthorized" durante ssl-init-prod
**Possíveis causas:**
- DNS não está apontando para o servidor correto
- Firewall bloqueando portas 80/443
- Nginx servindo aplicação ao invés de challenge files

**Solução:**
```bash
# Verificar DNS
nslookup controle-financeiro.gaius.digital

# Verificar se servidor responde
curl -I http://controle-financeiro.gaius.digital/.well-known/acme-challenge/

# Verificar logs
make logs
```

### 3. Erro de Permissões

**Problema:** Nginx não consegue ler certificados
**Solução:**
```bash
docker-compose run --rm --entrypoint /bin/sh certbot -c "chmod 644 /etc/letsencrypt/live/controle-financeiro.gaius.digital/*.pem"
```

## 🧪 Testando a Configuração

```bash
# Testar HTTPS
curl -k -I https://localhost/health

# Testar redirecionamento HTTP → HTTPS
curl -I http://localhost/

# Verificar certificado
openssl s_client -connect localhost:443 -servername localhost < /dev/null
```

## 📝 Logs e Monitoramento

```bash
# Ver logs do nginx
docker-compose logs nginx

# Ver logs do certbot
docker-compose logs certbot

# Ver logs da renovação automática
docker-compose logs certbot-cron

# Verificar status dos certificados
make ssl-check
```

## 🎯 Status Atual

✅ **FUNCIONANDO:**
- Docker Compose com SSL
- Certificados auto-assinados para desenvolvimento
- HTTPS habilitado e funcionando
- Redirecionamento HTTP → HTTPS
- Renovação automática configurada
- Makefile com comandos integrados

🔧 **Para usar em produção:**
- Configure DNS para apontar para seu servidor
- Execute `make ssl-init-prod`
- Certificados reais serão obtidos automaticamente

---

## 📞 Próximos Passos

1. **Para desenvolvimento:** Continue usando `make ssl-init` - está funcionando perfeitamente
2. **Para produção:** Configure o DNS e execute `make ssl-init-prod`
3. **Monitoramento:** Use `make ssl-check` para verificar status dos certificados

A configuração SSL está **100% funcional** para desenvolvimento e pronta para produção!