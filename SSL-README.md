# 🔒 Configuração SSL/HTTPS - Gerenciador Financeiro

Este documento descreve a configuração completa de SSL/HTTPS com certificados Let's Encrypt para o sistema de Gerenciamento Financeiro.

## 📋 Pré-requisitos

### Servidor
- [x] Docker e Docker Compose instalados
- [x] Portas 80 e 443 abertas no firewall
- [x] Acesso root ou sudo

### DNS
- [x] Domínio `controle-financeiro.gaius.digital` apontando para o servidor
- [x] Propagação DNS completa (teste com `dig controle-financeiro.gaius.digital`)

### Email
- [x] Altere o email em `scripts/init-ssl.sh` para receber notificações do Let's Encrypt

## 🚀 Deploy Automático

### 1. Clone e Configure
```bash
git clone <repository>
cd gerenciador-financeiro

# Ajustar email para Let's Encrypt
nano scripts/init-ssl.sh  # Altere EMAIL="admin@gaius.digital"
```

### 2. Deploy Completo via Makefile
```bash
# Deploy automático completo com SSL
make ssl-deploy
```

Este comando irá:
- ✅ Construir todas as imagens Docker
- ✅ Iniciar serviços base
- ✅ Obter certificado SSL automaticamente
- ✅ Configurar HTTPS
- ✅ Ativar auto-renovação

### 3. Verificar Deploy
```bash
# Status completo (containers + SSL)
make status

# Verificação específica de SSL
make ssl-check

# Logs do sistema
make logs

# Informações completas
make info
```

## 🔧 Configuração Manual (Alternativa)

### 1. Iniciar Serviços Base
```bash
# Construir e iniciar serviços
make build
make prod-up

# Aguardar inicialização
sleep 30
```

### 2. Obter Certificado SSL
```bash
# Obter certificado inicial
make ssl-init
```

### 3. Verificar e Monitorar
```bash
# Verificar status SSL
make ssl-check

# Monitoramento contínuo
make monitor
```

## 🔄 Renovação de Certificados

### Automática
- ✅ **Cron diário**: Executa às 2:00 AM todos os dias
- ✅ **Verificação inteligente**: Só renova se expira em < 30 dias
- ✅ **Reload automático**: Nginx é recarregado após renovação
- ✅ **Logs**: Salvos em `/var/log/certbot-renewal.log`

### Manual
```bash
# Forçar renovação
make ssl-force-renew

# Verificar status
make ssl-check

# Ver logs de SSL
make logs-ssl
```

## 📊 Monitoramento

### Verificar Certificado
```bash
# Status completo via Makefile
make ssl-check

# Status via comando direto
make status

# Informações detalhadas
make info
```

### Logs Importantes
```bash
# Logs gerais
make logs

# Logs específicos de SSL
make logs-ssl

# Monitoramento contínuo
make monitor
```

## 🛠️ Comandos Principais do Makefile

### SSL e Deploy
```bash
make ssl-deploy        # Deploy completo com SSL automático
make ssl-init          # Obter certificado SSL inicial  
make ssl-renew         # Renovar certificado
make ssl-check         # Verificar status SSL
make ssl-force-renew   # Forçar renovação
```

### Gerenciamento
```bash
make prod-up           # Iniciar produção
make prod-down         # Parar produção  
make status            # Status containers + SSL
make logs              # Ver logs
make logs-ssl          # Logs específicos SSL
make monitor           # Monitoramento contínuo
```

### Utilitários
```bash
make backup            # Backup completo
make clean             # Limpeza
make info              # Informações do sistema
make health            # Verificar saúde
make help              # Ajuda completa
```

## 🛠️ Solução de Problemas

### Certificado não obtido
```bash
# Verificar DNS
dig controle-financeiro.gaius.digital

# Verificar status completo
make status

# Ver logs SSL específicos
make logs-ssl

# Tentar novamente
make ssl-init
```

### Nginx não inicia com SSL
```bash
# Verificar saúde do sistema
make health

# Ver logs nginx específicos  
make logs-ssl

# Reiniciar produção
make prod-down && make prod-up
```

### Renovação falha
```bash
# Executar renovação manual
make ssl-renew

# Ver logs de renovação
make logs-ssl

# Forçar renovação se necessário
make ssl-force-renew
```

## 🔧 Estrutura dos Arquivos

```
nginx/
├── Dockerfile              # Container nginx com SSL
├── nginx.conf              # Configuração principal
└── conf.d/
    └── default.conf         # Virtual host com HTTPS

scripts/
├── deploy-ssl.sh            # Deploy automático completo
├── init-ssl.sh              # Obtenção inicial do certificado
└── renew-cert.sh            # Renovação automática

docker-compose.yml           # Orquestração com certbot
```

## 🛡️ Configurações de Segurança

### Headers SSL implementados:
- ✅ `Strict-Transport-Security` (HSTS)
- ✅ `X-Frame-Options` (Clickjacking)
- ✅ `X-Content-Type-Options` (MIME sniffing)
- ✅ `X-XSS-Protection` (XSS)
- ✅ `Referrer-Policy` (Privacy)

### Criptografia:
- ✅ TLS 1.2 e 1.3 apenas
- ✅ Ciphers seguros (ECDHE-RSA-AES256-GCM)
- ✅ OCSP Stapling ativo
- ✅ Session tickets desabilitados

### Rate Limiting:
- ✅ API: 10 req/s com burst de 20
- ✅ Login: 1 req/s com burst de 5

## 📞 Suporte

Em caso de problemas:

1. **Verificar logs**: `docker-compose logs -f`
2. **Testar conectividade**: `curl -I http://controle-financeiro.gaius.digital`
3. **Verificar DNS**: `dig controle-financeiro.gaius.digital`
4. **Validar certificado**: Scripts de verificação incluídos

## 🎯 URLs do Sistema

- **Produção HTTPS**: https://controle-financeiro.gaius.digital
- **API HTTPS**: https://controle-financeiro.gaius.digital/api
- **Health Check**: https://controle-financeiro.gaius.digital/health

---

*Sistema configurado com certificados SSL automáticos e renovação contínua* 🔒