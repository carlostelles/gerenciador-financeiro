# 🏦 Gerenciador Financeiro - Full Stack

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

Sistema completo de controle financeiro pessoal com backend NestJS, frontend Angular 20, e infraestrutura Docker production-ready.

## 🚀 Quick Start

### Produção (Docker)
```bash
git clone <repository-url>
cd gerenciador-financeiro
./setup.sh prod
```
**Acesso:** http://localhost

### Desenvolvimento
```bash
git clone <repository-url>
cd gerenciador-financeiro
./setup.sh dev
# Depois rode API e Web localmente
```

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [🏗️ Arquitetura](#️-arquitetura)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Tecnologias](#️-tecnologias)
- [🚀 Instalação](#-instalação)
- [🐳 Docker](#-docker)
- [📊 API](#-api)
- [🌐 Frontend](#-frontend)
- [🧪 Testes](#-testes)
- [📚 Documentação](#-documentação)
- [🤝 Contribuição](#-contribuição)

## 🎯 Visão Geral

O **Gerenciador Financeiro** é uma solução completa para controle de finanças pessoais, desenvolvida com as melhores práticas e tecnologias modernas.

### Características Principais

- 🔐 **Autenticação JWT** completa com refresh token
- 👥 **Espaços Financeiros Compartilhados** com papéis OWNER, EDITOR e VIEWER
- 🏷️ **Gestão de Categorias** para organização financeira
- 💰 **Orçamentos por Período** com controle detalhado
- 📝 **Movimentações Financeiras** com categorização
- 💾 **Sistema de Reservas** para poupança
- 📊 **Dashboard Interativo** com resumos visuais
- 🔒 **Segurança Robusta** com guards e interceptors
- 🐳 **Deploy via Docker** production-ready
- 📱 **Interface Responsiva** com Taiga UI

## 🏗️ Arquitetura

### Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     🌐 Internet                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                ┌─────▼─────┐
                │   Nginx   │ 🔄 Proxy Reverso + SSL
                │   :80     │    Rate Limiting
                └─────┬─────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │   Web   │   │   API   │   │ Health  │
   │ Angular │   │ NestJS  │   │ Checks  │
   │  SPA    │   │ REST    │   │         │
   └─────────┘   └────┬────┘   └─────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌────▼─────┐      │
   │  MySQL  │   │ MongoDB  │      │
   │ Main DB │   │  Logs    │      │
   └─────────┘   └──────────┘      │
```

### Stack Tecnológico

| Camada | Tecnologia | Versão | Função |
|--------|------------|--------|--------|
| **Frontend** | Angular + Taiga UI | 20.3.0 | SPA moderna e responsiva |
| **Backend** | NestJS + TypeScript | 10.x | API REST robusta |
| **Banco Principal** | MySQL | 8.0 | Dados transacionais |
| **Banco de Logs** | MongoDB | 7.0 | Analytics e auditoria |
| **Proxy** | Nginx | Alpine | Load balancer e SSL |
| **Containerização** | Docker + Compose | Latest | Orquestração completa |

## ✨ Funcionalidades

### 🔐 Autenticação e Segurança
- Sistema JWT com access e refresh tokens
- Proteção de rotas com guards personalizados
- Controle de acesso baseado em roles (USER/ADMIN)
- Rate limiting e proteção contra ataques
- Headers de segurança configurados

### 👥 Espaços Financeiros Compartilhados
- Um OWNER por espaço, com transferência obrigatória antes da saída
- Convite e vínculo imediato de membros por e-mail exato
- Papéis EDITOR e VIEWER aplicados aos recursos do espaço
- Contas, categorias, orçamentos, reservas e movimentações compartilhados
- Contexto de espaço ativo explícito, sem acesso implícito para ADMIN

### 🏷️ Gestão de Categorias
- CRUD completo de categorias financeiras
- Tipos: Receita, Despesa, Reserva
- Validação de uso antes da exclusão
- Interface com badges visuais por tipo

### 💰 Controle de Orçamentos
- Orçamentos organizados por período (mês/ano)
- Itens detalhados com categorias e valores
- Funcionalidade de clonagem entre períodos
- Relatórios de execução orçamentária

### 📝 Movimentações Financeiras
- Registro de receitas e despesas
- Associação com categorias e orçamentos
- Visualização por período com resumos
- Cálculo automático de saldos

### 💾 Sistema de Reservas
- Controle de valores poupados
- Categorização por tipo de reserva
- Histórico de crescimento das reservas

### 📊 Dashboard e Relatórios
- Resumos visuais de receitas vs despesas
- Gráficos de distribuição por categoria
- Indicadores de cumprimento orçamentário
- Interface moderna com Taiga UI

## 🛠️ Tecnologias

### Backend (NestJS)
```json
{
  "framework": "NestJS 10.x",
  "language": "TypeScript 5.1",
  "database": {
    "primary": "MySQL 8.0 + TypeORM",
    "logs": "MongoDB 7.0 + Mongoose"
  },
  "authentication": "JWT + Passport",
  "validation": "Class Validator + Class Transformer",
  "documentation": "Swagger/OpenAPI 3.0",
  "testing": "Jest (Unit + E2E)",
  "security": "Bcrypt + CORS + Rate Limiting"
}
```

### Frontend (Angular)
```json
{
  "framework": "Angular 20.3.0",
  "language": "TypeScript 5.9",
  "ui": "Taiga UI 4.58.0",
  "state": "Signals + RxJS 7.8",
  "routing": "Angular Router + Guards",
  "http": "HttpClient + Interceptors",
  "testing": "Jest 30.2.0",
  "build": "Angular CLI + Webpack"
}
```

### DevOps e Infraestrutura
```json
{
  "containerization": "Docker + Docker Compose",
  "web_server": "Nginx (Proxy Reverso)",
  "ci_cd": "GitHub Actions Ready",
  "monitoring": "Health Checks + Logs",
  "security": "Non-root containers + Secrets",
  "networking": "Docker Networks + SSL Ready"
}
```

## 🚀 Instalação

### Pré-requisitos

- **Docker** 20.x ou superior
- **Docker Compose** 2.x ou superior
- **Git** para clone do repositório

### Instalação Automática (Recomendada)

```bash
# 1. Clonar repositório
git clone <repository-url>
cd gerenciador-financeiro

# 2. Setup automático para produção
./setup.sh prod

# 3. Acessar aplicação
open http://localhost
```

### Instalação Manual

```bash
# 1. Configurar ambiente
cp .env.example .env
# Editar variáveis conforme necessário

# 2. Iniciar serviços
docker-compose up -d

# 3. Verificar saúde
make health
```

## 🐳 Docker

### Ambientes Disponíveis

#### Produção (`docker-compose.yml`)
- ✅ Multi-stage builds otimizados
- ✅ Nginx como proxy reverso
- ✅ Health checks em todos os serviços
- ✅ Usuários não-root para segurança
- ✅ Logs centralizados
- ✅ Rate limiting configurado

#### Desenvolvimento (`docker-compose.dev.yml`)  
- ✅ Hot reload habilitado
- ✅ Volumes para desenvolvimento
- ✅ Swagger habilitado
- ✅ Apenas bancos de dados em containers

### Comandos Úteis

```bash
# Produção
make prod-up        # Iniciar produção
make prod-down      # Parar produção
make prod-logs      # Ver logs
make prod-rebuild   # Rebuild containers

# Desenvolvimento  
make dev-up         # Iniciar desenvolvimento
make dev-down       # Parar desenvolvimento
make dev-logs       # Ver logs

# Utilitários
make health         # Verificar saúde
make status         # Status dos containers
make clean          # Limpeza de recursos
make help           # Ajuda completa
```

### Portas e Serviços

| Ambiente | Serviço | Porta Externa | Porta Interna | URL |
|----------|---------|---------------|---------------|-----|
| **Produção** | Nginx | 80, 443 | 80 | http://localhost |
| **Produção** | MySQL | 3306 | 3306 | localhost:3306 |
| **Produção** | MongoDB | 27017 | 27017 | localhost:27017 |
| **Desenvolvimento** | API | 3000 | 3000 | http://localhost:3000 |
| **Desenvolvimento** | Swagger | - | - | http://localhost:3000/api/docs |

## 📊 API

### Endpoints Principais

| Módulo | Endpoint Base | Descrição |
|--------|---------------|-----------|
| **Auth** | `/api/auth` | Autenticação JWT |
| **Usuários** | `/api/usuarios` | Gestão de usuários |
| **Categorias** | `/api/categorias` | CRUD de categorias |
| **Orçamentos** | `/api/orcamentos` | Controle orçamentário |
| **Movimentações** | `/api/movimentacoes` | Transações financeiras |
| **Reservas** | `/api/reservas` | Sistema de reservas |
| **Logs** | `/api/logs` | Auditoria (Admin) |

### Documentação Swagger

- **Desenvolvimento**: http://localhost:3000/api/docs
- **Produção**: Desabilitada por segurança

### Autenticação

```bash
# Login
POST /api/auth/login
{
  "email": "usuario@email.com", 
  "password": "senha"
}

# Resposta
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600
}
```

## 🌐 Frontend

### Características

- **SPA Moderna**: Single Page Application com Angular 20
- **Design System**: Taiga UI para consistência visual
- **State Management**: Signals + RxJS para reatividade
- **Roteamento**: Lazy loading para performance
- **Responsivo**: Adaptável a desktop e mobile

### Estrutura de Rotas

```
/                   # Redirect para /home
├── /login          # Autenticação
├── /signup         # Cadastro
└── / (Protected)   # Layout principal
    ├── /home       # Dashboard
    ├── /categorias # Gestão de categorias  
    ├── /orcamentos # Controle orçamentário
    └── /movimentacoes # Movimentações
```

### Proxy Reverso

O Nginx está configurado para:
- Servir o Angular SPA na raiz (`/`)
- Proxy da API em `/api/*` → `http://api:3000/*`
- Fallback para SPA routing
- Compression e cache otimizados

## 🧪 Testes

### Cobertura Completa

#### Backend (API)
```bash
# Testes unitários
npm run test              # 101 testes

# Testes E2E  
npm run test:e2e          # 234 testes

# Coverage
npm run test:cov          # Relatório HTML
```

#### Frontend (Web)
```bash
# Testes unitários
npm run test              # Jest + Angular Testing Utilities

# Coverage
npm run test:coverage     # Relatório de cobertura
```

### CI/CD Ready

- Configuração Jest para ambos os projetos
- Scripts de teste automatizado
- Coverage reports em HTML
- GitHub Actions ready

## 📚 Documentação

### Documentação Completa

- 📋 **[README Principal](./README.md)** - Este arquivo
- 🐳 **[Docker Guide](./DOCKER_README.md)** - Guia completo Docker
- 🔧 **[API Documentation](./api/README.md)** - Backend NestJS
- 🌐 **[Frontend Guide](./web/README.md)** - Angular + Taiga UI

### Documentação da API

- **Swagger UI**: `/api/docs` (desenvolvimento)
- **Postman Collection**: Disponível no repositório
- **OpenAPI Spec**: Gerada automaticamente

### Guias de Desenvolvimento

```bash
# Ver toda documentação
find . -name "README.md" -o -name "*.md" | head -10

# Documentação específica  
cat DOCKER_README.md      # Docker
cat api/README.md         # API
cat web/README.md         # Frontend
```

## 🤝 Contribuição

### Como Contribuir

1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie** uma branch feature (`git checkout -b feature/nova-funcionalidade`)
4. **Desenvolva** seguindo os padrões estabelecidos
5. **Teste** todas as funcionalidades
6. **Commit** com mensagem semântica (`git commit -m 'feat: adiciona nova funcionalidade'`)
7. **Push** para sua branch (`git push origin feature/nova-funcionalidade`)
8. **Abra** um Pull Request

### Padrões de Desenvolvimento

#### Commits Semânticos
```bash
feat: nova funcionalidade
fix: correção de bug
docs: atualização de documentação
test: adição de testes
refactor: refatoração de código
style: formatação de código
chore: tarefas de manutenção
```

#### Estrutura de Branch
```
main                    # Produção estável
├── develop            # Desenvolvimento
├── feature/*          # Novas funcionalidades  
├── fix/*             # Correções de bugs
└── hotfix/*          # Correções urgentes
```

### Checklist de PR

- [ ] ✅ Código segue padrões estabelecidos
- [ ] ✅ Testes passando (unit + e2e)
- [ ] ✅ Documentação atualizada
- [ ] ✅ Docker build funcionando
- [ ] ✅ Sem warnings de linting
- [ ] ✅ Performance verificada

## 📈 Roadmap

### Próximas Funcionalidades

- [ ] 📊 **Dashboard Avançado** com gráficos interativos
- [ ] 📱 **PWA** para instalação mobile
- [ ] 🔔 **Notificações** push para lembretes
- [ ] 📄 **Relatórios PDF** exportáveis
- [ ] 🔄 **Sync Multi-device** em tempo real
- [ ] 🤖 **IA para Categorização** automática
- [ ] 💳 **Integração Bancária** via Open Banking
- [ ] 🌍 **Internacionalização** (i18n)

### Melhorias Técnicas

- [ ] 🚀 **Performance Optimization**
- [ ] 🔒 **Security Hardening** 
- [ ] 📊 **Monitoring & Alerts**
- [ ] 🧪 **Test Coverage 100%**
- [ ] 📚 **API Documentation V2**

## 🆘 Suporte

### Problemas Comuns

#### Docker não inicia
```bash
make health           # Verificar saúde
make prod-logs        # Ver logs
make clean && make prod-up  # Reset completo
```

#### API não conecta ao banco
```bash
docker-compose logs mysql    # Logs MySQL
docker-compose logs mongodb  # Logs MongoDB
make db-mysql               # Conectar manualmente
```

#### Frontend não carrega
```bash
docker-compose logs web     # Logs do container web
docker-compose logs nginx   # Logs do proxy
curl http://localhost/health # Health check
```

### Canais de Suporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/seu-usuario/gerenciador-financeiro/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/seu-usuario/gerenciador-financeiro/discussions)
- 📧 **Email**: suporte@gerenciadorfinanceiro.com
- 📚 **Docs**: Consulte os READMEs específicos

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">

**🏦 Desenvolvido com ❤️ para simplificar sua vida financeira**

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**[⭐ Dê uma estrela se este projeto te ajudou!](https://github.com/seu-usuario/gerenciador-financeiro)**

</div>