# 🐳 Gerenciador Financeiro - Docker Setup

Configuração Docker completa para o projeto Gerenciador Financeiro com API NestJS, Frontend Angular, e proxy reverso Nginx.

## 📋 Índice

- [🏗️ Arquitetura](#️-arquitetura)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Configuração](#️-configuração)
- [🔧 Ambientes](#-ambientes)
- [📊 Monitoramento](#-monitoramento)
- [🔒 Segurança](#-segurança)
- [🧪 Desenvolvimento](#-desenvolvimento)
- [🚨 Troubleshooting](#-troubleshooting)

## 🏗️ Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                  ┌───▼────┐
                  │ Nginx  │ :80
                  │ Proxy  │
                  └────┬───┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼───┐    ┌────▼────┐   ┌────▼────┐
    │   Web  │    │   API   │   │  Health │
    │Angular │    │ NestJS  │   │ Checks  │
    │  :80   │    │  :3000  │   │         │
    └────────┘    └────┬────┘   └─────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐   ┌────▼─────┐      │
    │  MySQL  │   │ MongoDB  │      │
    │  :3306  │   │  :27017  │      │
    └─────────┘   └──────────┘      │
```

### Serviços

| Serviço | Porta | Função | Tecnologia |
|---------|-------|--------|------------|
| **nginx** | 80, 443 | Proxy reverso e servidor web | Nginx Alpine |
| **web** | 80 (interno) | Frontend Angular SPA | Node 20 + Nginx |
| **api** | 3000 (interno) | Backend REST API | Node 20 + NestJS |
| **mysql** | 3306 | Banco de dados principal | MySQL 8.0 |
| **mongodb** | 27017 | Banco de logs e analytics | MongoDB 7.0 |

## 🚀 Quick Start

### Produção (Recomendado)

```bash
# 1. Clonar o repositório
git clone <repository-url>
cd gerenciador-financeiro

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Iniciar todos os serviços
make prod-up

# 4. Acessar a aplicação
open http://localhost
```

### Desenvolvimento

```bash
# 1. Iniciar apenas bancos de dados para desenvolvimento local
make dev-up

# 2. A API e Frontend rodam localmente com hot-reload
# API: npm run start:dev (porta 3000)
# Web: npm start (porta 4200)
```

## 🛠️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Banco de Dados MySQL
DB_ROOT_PASSWORD=rootpassword123
DB_NAME=gerenciador_financeiro
DB_USER=gf_user
DB_PASSWORD=gf_password123

# Banco de Dados MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=adminpassword123
MONGO_DB=gerenciador_logs

# JWT Secrets (ALTERE EM PRODUÇÃO!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-in-production-min-32-chars

# CORS
CORS_ORIGIN=http://localhost

# Swagger (false para produção)
ENABLE_SWAGGER=false
```

### Estrutura de Arquivos

```
📁 gerenciador-financeiro/
├── 📄 docker-compose.yml          # Produção
├── 📄 docker-compose.dev.yml      # Desenvolvimento  
├── 📄 Makefile                    # Comandos úteis
├── 📄 .env.example               # Variáveis de ambiente
├── 📁 api/                       # Backend NestJS
│   ├── 📄 Dockerfile
│   └── 📁 src/
├── 📁 web/                       # Frontend Angular
│   ├── 📄 Dockerfile
│   ├── 📄 nginx.conf
│   └── 📁 src/
└── 📁 nginx/                     # Proxy reverso
    ├── 📄 Dockerfile
    ├── 📄 nginx.conf
    └── 📁 conf.d/
```

## 🔧 Ambientes

### Produção (`docker-compose.yml`)

**Características:**
- ✅ Otimizado para performance
- ✅ Multi-stage builds
- ✅ Usuários não-root
- ✅ Health checks
- ✅ Logs centralizados
- ✅ Swagger desabilitado
- ✅ Proxy reverso completo

**Comandos:**
```bash
make prod-up      # Iniciar produção
make prod-down    # Parar produção
make prod-logs    # Ver logs
make prod-rebuild # Rebuild containers
```

**URLs de Produção:**
- 🌐 **Aplicação**: http://localhost
- 🔗 **API**: http://localhost/api
- 📊 **Health Check**: http://localhost/health

### Desenvolvimento (`docker-compose.dev.yml`)

**Características:**
- ✅ Hot reload habilitado
- ✅ Volumes de desenvolvimento
- ✅ Swagger habilitado
- ✅ Logs detalhados
- ✅ Apenas bancos de dados em containers

**Comandos:**
```bash
make dev-up       # Iniciar desenvolvimento
make dev-down     # Parar desenvolvimento
make dev-logs     # Ver logs
```

**URLs de Desenvolvimento:**
- 🔗 **API**: http://localhost:3000
- 📚 **Swagger**: http://localhost:3000/api/docs
- 📊 **MySQL**: localhost:3306
- 🍃 **MongoDB**: localhost:27017

## 📊 Monitoramento

### Health Checks

Todos os serviços possuem health checks configurados:

```bash
# Verificar status de todos os containers
make health

# Status específico
docker-compose ps
```

### Logs

```bash
# Todos os logs
make logs

# Logs específicos por ambiente
make prod-logs    # Produção
make dev-logs     # Desenvolvimento

# Logs de um serviço específico
docker-compose logs -f api
docker-compose logs -f nginx
```

### Métricas

```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df

# Informações dos containers
make status
```

## 🔒 Segurança

### Implementações de Segurança

✅ **Usuários não-root** em todos os containers  
✅ **Secrets** via variáveis de ambiente  
✅ **Network isolation** entre serviços  
✅ **CORS** configurado adequadamente  
✅ **Rate limiting** no Nginx  
✅ **Security headers** configurados  
✅ **Swagger** desabilitado em produção  

### Configurações Nginx

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Security headers
add_header X-Frame-Options SAMEORIGIN always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Recomendações para Produção

1. **Altere todas as senhas padrão** no `.env`
2. **Use HTTPS** com certificados SSL/TLS
3. **Configure firewall** apropriadamente
4. **Monitore logs** regularmente
5. **Faça backups** periódicos dos bancos
6. **Atualize** imagens regularmente

## 🧪 Desenvolvimento

### Workflow de Desenvolvimento

```bash
# 1. Iniciar apenas bancos
make dev-up

# 2. Desenvolver API localmente
cd api
npm install
npm run start:dev

# 3. Desenvolver Frontend localmente  
cd web
npm install
npm start

# 4. Testar produção localmente
make prod-up
```

### Debug e Acesso aos Containers

```bash
# Shell nos containers
make shell-api      # Container da API
make shell-web      # Container do web
make shell-nginx    # Container do Nginx

# Conectar aos bancos
make db-mysql       # MySQL CLI
make db-mongo       # MongoDB Shell
```

### Rebuild Durante Desenvolvimento

```bash
# Rebuild specific service
docker-compose build api
docker-compose up -d api

# Rebuild tudo
make rebuild
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 🔴 Container não inicia

```bash
# Verificar logs
docker-compose logs <service-name>

# Verificar saúde
make health

# Restart específico
docker-compose restart <service-name>
```

#### 🔴 Porta já em uso

```bash
# Verificar portas ocupadas
netstat -tulpn | grep :80
netstat -tulpn | grep :3000

# Parar todos os containers
make prod-down
make dev-down
```

#### 🔴 Problema de conexão com banco

```bash
# Verificar se bancos estão rodando
docker-compose ps

# Verificar logs do banco
docker-compose logs mysql
docker-compose logs mongodb

# Testar conexão
make db-mysql
make db-mongo
```

#### 🔴 Nginx não consegue acessar upstream

```bash
# Verificar configuração
docker-compose exec nginx nginx -t

# Verificar conectividade
docker-compose exec nginx ping api
docker-compose exec nginx ping web

# Restart do Nginx
docker-compose restart nginx
```

#### 🔴 Frontend não carrega

```bash
# Verificar se build foi bem sucedido
docker-compose logs web

# Verificar arquivos estáticos
docker-compose exec web ls -la /usr/share/nginx/html

# Verificar configuração do Nginx
docker-compose exec web cat /etc/nginx/conf.d/default.conf
```

### Limpeza e Reset

```bash
# Limpeza básica
make clean

# Reset completo (CUIDADO: remove todos os dados!)
make clean-all

# Rebuild completo
docker-compose down
docker-compose up --build
```

### Comandos de Diagnóstico

```bash
# Informações do sistema
make info

# Status detalhado
make status

# Verificar configurações
docker-compose config

# Verificar networks
docker network ls
docker network inspect gerenciador-financeiro
```

## 📚 Referências

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [NestJS Docker](https://docs.nestjs.com/recipes/docker)
- [Angular Docker](https://angular.io/guide/deployment#docker)

---

## 🤝 Suporte

Para problemas específicos do Docker:

1. **Verificar logs**: `make logs`
2. **Verificar saúde**: `make health`
3. **Consultar documentação** dos serviços específicos
4. **Abrir issue** no repositório com logs relevantes

---

<div align="center">

**🐳 Dockerized com ❤️ para máxima portabilidade**

</div>