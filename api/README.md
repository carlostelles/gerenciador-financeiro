# Gerenciador Financeiro API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)

![Tests](https://img.shields.io/badge/tests-228%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Language](https://img.shields.io/badge/language-Portuguese-green)

Uma API RESTful robusta para gerenciamento financeiro desenvolvida com NestJS, oferecendo funcionalidades completas de controle de orçamentos, movimentações financeiras, reservas e sistema de auditoria. O projeto conta com uma arquitetura moderna, testes abrangentes (228 testes) e documentação completa em português.

## 🚀 Tecnologias Utilizadas

- **Framework**: NestJS
- **Linguagem**: TypeScript  
- **Banco de Dados Principal**: MySQL (entidades principais)
- **Banco de Dados de Logs**: MongoDB
- **ORM**: TypeORM (MySQL) e Mongoose (MongoDB)
- **Autenticação**: JWT com refresh token
- **Validação**: class-validator
- **Documentação**: Swagger/OpenAPI
- **Testes**: Jest
- **Containerização**: Docker & Docker Compose

## 📋 Funcionalidades

### Autenticação
- Login com JWT
- Refresh token
- Logout com log de auditoria
- Middleware de autorização por roles

### Gestão de Usuários
- CRUD completo de usuários
- Roles: ADMIN e USER
- Validação de email e telefone únicos
- Hash de senhas com bcrypt
- Desativação (soft delete)

### Categorias
- CRUD de categorias por usuário
- Tipos: RECEITA, DESPESA, RESERVA
- Validação de nome único por tipo/usuário

### Orçamentos
- CRUD de orçamentos por período (yyyy-mm)
- Itens de orçamento vinculados a categorias
- Clonagem de orçamentos para novos períodos

### Movimentações
- CRUD de movimentações financeiras
- Vinculação a itens de orçamento
- Organização por período
- Upload de comprovante em imagem/PDF com análise por IA
- Salvamento do comprovante em bucket S3 com vínculo ao movimento

### Reservas
- CRUD de reservas financeiras
- Vinculação a categorias tipo RESERVA

### Logs
- Auditoria automática de todas as operações
- Armazenamento em MongoDB
- Acesso restrito a administradores
- **27 testes E2E específicos** para validar funcionalidades de auditoria

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
src/
├── common/                 # Compartilhado entre módulos
│   ├── decorators/         # Decorators customizados (@CurrentUser, @Roles)
│   ├── guards/            # Guards de autenticação/autorização
│   ├── interceptors/      # Interceptors globais (logging)
│   └── types/             # Tipos e enums (UserRole, TipoCategoria)
├── config/                # Configurações de banco de dados
│   ├── database.config.ts # MySQL/TypeORM
│   └── mongodb.config.ts  # MongoDB/Mongoose
├── modules/               # Módulos funcionais (7 módulos)
│   ├── auth/              # Autenticação JWT (16 testes E2E)
│   ├── usuarios/          # Gestão de usuários (25 testes E2E)
│   ├── categorias/        # Gestão de categorias (21 testes E2E)
│   ├── orcamentos/        # Gestão de orçamentos (29 testes E2E)
│   ├── movimentacoes/     # Gestão de movimentações (23 testes E2E)
│   ├── reservas/          # Gestão de reservas (27 testes E2E)
│   └── logs/              # Sistema de logs (27 testes E2E)
├── test/                  # Testes E2E (148 testes)
│   ├── auth.e2e-spec.ts
│   ├── usuarios.e2e-spec.ts
│   ├── categorias.e2e-spec.ts
│   ├── orcamentos.e2e-spec.ts
│   ├── movimentacoes.e2e-spec.ts
│   ├── reservas.e2e-spec.ts
│   └── logs.e2e-spec.ts
└── main.ts                # Bootstrap da aplicação
```

### Camadas da Aplicação

1. **Controllers**: Recebem requisições HTTP e retornam respostas
2. **Services**: Contêm a lógica de negócio
3. **Entities**: Definem o modelo de dados (TypeORM/Mongoose)
4. **DTOs**: Validação e transformação de dados
5. **Guards**: Autenticação e autorização
6. **Interceptors**: Logging e transformação de respostas

## ✨ Diferenciais do Projeto

### Qualidade de Código
- **100% TypeScript** - Type safety completo
- **161 testes E2E automatizados** - Cobertura completa de integração
- **80 testes unitários** - Validação de componentes individuais  
- **Relatórios de cobertura** - Métricas detalhadas de testes
- **Testes em português** - Melhor legibilidade para equipes brasileiras
- **Arquitetura modular** - Fácil manutenção e extensão
- **Documentação Swagger** - API auto-documentada
- **Logs de auditoria** - Rastreabilidade completa

### Segurança
- **JWT com refresh tokens** - Autenticação robusta
- **Autorização por roles** - Controle granular de acesso
- **Validação rigorosa** - Proteção contra dados inválidos
- **Hash de senhas** - bcrypt para máxima segurança
- **Isolamento de dados** - Usuários acessam apenas seus dados

### Performance
- **Dual database** - MySQL para dados relacionais, MongoDB para logs
- **TypeORM** - ORM eficiente com lazy loading
- **Mongoose** - ODM otimizado para MongoDB
- **Containerização** - Deploy simplificado com Docker
- **Ambiente de desenvolvimento** - Setup rápido com Docker Compose

### Desenvolvimento
- **Hot reload** - Desenvolvimento ágil
- **Testes automatizados** - CI/CD ready
- **Relatórios de cobertura** - Análise visual e métricas detalhadas
- **Ambiente dockerizado** - Consistência entre ambientes
- **Documentação completa** - Fácil onboarding
- **Estrutura padronizada** - Best practices do NestJS

### Relatórios de Cobertura
- **Múltiplos formatos** - HTML, LCOV, JSON, Clover, Text
- **Cobertura E2E** - Métricas de integração completa
- **Cobertura unitária** - Análise de componentes individuais
- **Thresholds configuráveis** - Qualidade garantida
- **Relatórios visuais** - Interface HTML interativa

## 🛠️ Stack Tecnológica
- **TypeScript**: Linguagem principal
- **TypeORM**: ORM para MySQL
- **Mongoose**: ODM para MongoDB
- **JWT**: Autenticação stateless
- **Bcrypt**: Hash de senhas
- **Class-validator**: Validação de dados
- **Swagger**: Documentação da API
- **Jest**: Framework de testes
- **Docker**: Containerização

## 📦 Instalação

### Pré-requisitos

- Node.js (v18+)
- Docker e Docker Compose
- MySQL 8.0
- MongoDB 7.0

### Configuração

1. **Clone o repositório**
```bash
git clone https://github.com/carlostelles/gerenciador-financeiro-api.git
cd gerenciador-financeiro-api
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Execute com Docker (Recomendado)**
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Produção
docker-compose -f docker-compose.prod.yml up -d
```

### Execução Local

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## 🔧 Variáveis de Ambiente

```env
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=gerenciador_financeiro

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/gerenciador_financeiro_logs

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=5m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=development
PORT=3000

# S3 Configuration for movement receipt uploads
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET_NAME=gerenciador-financeiro-comprovantes
AWS_S3_ACCESS_KEY_ID=your-access-key-id
AWS_S3_SECRET_ACCESS_KEY=your-secret-access-key

# AI Configuration for receipt analysis
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
MOVIMENTO_COMPROVANTE_MAX_SIZE_BYTES=10485760
```

## 🧾 Comprovantes de Movimentação

O módulo de movimentações suporta o envio de comprovantes em imagem (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`) ou PDF (`application/pdf`).

### Fluxo da Integração

1. O frontend envia o arquivo para `POST /movimentacoes/comprovantes/analisar` assim que o usuário seleciona um comprovante.
2. A API valida tipo e tamanho do arquivo.
3. O arquivo é salvo no bucket S3 configurado, em uma chave organizada por usuário e ano/mês.
4. O mesmo arquivo é enviado ao modelo multimodal configurado para extração dos dados.
5. A IA retorna uma sugestão estruturada contendo:
   - `data`
   - `valor`
   - `descricao`
   - `categoriaId`
   - `contaId`
6. A API devolve também a lista `camposObrigatoriosFaltantes`, para que o frontend marque os campos obrigatórios que não puderam ser inferidos com segurança.
7. Ao confirmar o formulário, o frontend envia `comprovanteId` junto com a criação da movimentação.
8. A API vincula o comprovante salvo ao primeiro movimento criado.

### Dados Persistidos do Comprovante

Cada comprovante fica registrado na entidade `movimento_comprovantes` com os seguintes campos:

- `movimentoId`: vínculo com a movimentação confirmada
- `usuarioId`: dono do arquivo
- `caminhoArquivo`: caminho completo no S3 (`s3://bucket/key`)
- `nomeArquivo`: nome original enviado pelo usuário
- `tipoArquivo`: MIME type do arquivo
- `tamanhoArquivo`: tamanho em bytes

### Bucket S3

O upload usa as seguintes variáveis:

- `AWS_S3_REGION`
- `AWS_S3_BUCKET_NAME`
- `AWS_S3_ACCESS_KEY_ID`
- `AWS_S3_SECRET_ACCESS_KEY`

Permissões mínimas recomendadas para a credencial usada pela API:

- `s3:PutObject`
- `s3:GetObject` (opcional, caso a aplicação precise servir ou auditar o arquivo depois)

Exemplo de política mínima:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::gerenciador-financeiro-comprovantes/*"
    }
  ]
}
```

### Integração com IA

O projeto usa o modelo `gemini-2.5-flash` por equilibrar latência e qualidade para leitura de comprovantes em imagem e PDF. O nome do modelo pode ser alterado por variável de ambiente em `GEMINI_MODEL`.

Variáveis usadas pela integração:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `MOVIMENTO_COMPROVANTE_MAX_SIZE_BYTES`

#### Lógica de Extração

- O arquivo é enviado ao modelo multimodal como `inlineData`.
- A API envia ao modelo a lista de contas e categorias do usuário, para que a resposta já tente enquadrar o comprovante em `categoriaId` e `contaId` reais do sistema.
- Quando a IA não consegue inferir um campo com segurança, ela retorna `null`.
- A API considera obrigatórios, para autofill confiável, os campos `data`, `valor` e `categoriaId`.
- `descricao` e `contaId` também são inferidos, mas podem permanecer vazios se o comprovante não trouxer evidência suficiente.

#### Como Gerar a Credencial do Gemini

1. Acesse o Google AI Studio: `https://aistudio.google.com/`
2. Entre com a conta Google que será usada para a integração.
3. Abra a seção de API keys.
4. Gere uma nova chave.
5. Copie o valor para `GEMINI_API_KEY` no seu `.env`.
6. Defina opcionalmente `GEMINI_MODEL=gemini-2.5-flash` ou outro modelo multimodal compatível.

Observação: a chave do Gemini deve ser tratada como segredo e nunca commitada no repositório.

## 🧪 Testes

O projeto conta com uma suíte de testes abrangente e completamente traduzida para o português:

### Estatísticas de Testes
- **228 testes totais** - 100% passando ✅
- **80 testes unitários** - Cobertura dos services
- **148 testes E2E** - Cobertura completa dos endpoints
- **Descrições em português** - Melhor legibilidade para equipes brasileiras

### Estrutura de Testes

#### Testes Unitários (`src/**/*.spec.ts`)
- **AuthService**: 8 testes - Autenticação e tokens
- **UsuariosService**: 15 testes - CRUD e permissões
- **CategoriasService**: 11 testes - Gestão de categorias
- **OrcamentosService**: 16 testes - Orçamentos e itens
- **MovimentacoesService**: 12 testes - Movimentações financeiras
- **ReservasService**: 9 testes - Gestão de reservas
- **LogsService**: 9 testes - Sistema de auditoria

#### Testes E2E (`test/**/*.e2e-spec.ts`)
- **AuthController**: 16 testes - Endpoints de autenticação
- **UsuariosController**: 25 testes - Gestão de usuários
- **CategoriasController**: 21 testes - CRUD de categorias
- **OrcamentosController**: 29 testes - Orçamentos e itens
- **MovimentacoesController**: 23 testes - Movimentações
- **ReservasController**: 27 testes - Sistema de reservas
- **LogsController**: 27 testes - Auditoria (admin-only)

### Executar Testes

```bash
# Todos os testes
npm test

# Testes unitários
npm run test:unit

# Testes E2E
npm run test:e2e

# Testes E2E com cobertura
npm run test:e2e:cov

# Testes E2E em modo watch
npm run test:e2e:watch

# Testes E2E com debug
npm run test:e2e:debug

# Testes em modo watch
npm run test:watch

# Cobertura de código unitário
npm run test:cov

# Cobertura completa (unitário + E2E)
npm run test:all:cov

# Testes com relatório detalhado
npm run test:verbose
```

### Relatórios de Cobertura

Os relatórios de cobertura são gerados em múltiplos formatos:

```bash
# Cobertura E2E - gera relatório em coverage-e2e/
npm run test:e2e:cov

# Cobertura unitária - gera relatório em coverage/
npm run test:cov

# Cobertura completa - gera ambos os relatórios
npm run test:all:cov
```

**Formatos de saída:**
- **HTML**: Relatório visual interativo (`coverage-e2e/index.html`)
- **LCOV**: Para integração com IDEs (`coverage-e2e/lcov.info`)
- **JSON**: Para ferramentas de CI/CD (`coverage-e2e/coverage-final.json`)
- **Clover**: Para ferramentas XML (`coverage-e2e/clover.xml`)
- **Text**: Sumário no terminal

### Cenários de Teste Cobertos

#### Funcionalidades Principais
- ✅ Autenticação JWT e refresh tokens
- ✅ Autorização por roles (ADMIN/USER)
- ✅ CRUD completo para todas as entidades
- ✅ Validações de dados e regras de negócio
- ✅ Tratamento de erros e exceções
- ✅ Isolamento de dados por usuário
- ✅ Sistema de auditoria e logs

#### Casos de Erro
- ✅ Validação de dados inválidos
- ✅ Recursos não encontrados (404)
- ✅ Conflitos de dados (409)
- ✅ Acesso não autorizado (401/403)
- ✅ Erros de validação (400)
- ✅ Falhas de conexão com banco de dados
- ✅ Operações concorrentes e conflitos

#### Regras de Negócio
- ✅ Períodos de orçamento únicos por usuário
- ✅ Movimentações dentro do período correto
- ✅ Categorias específicas por tipo e usuário
- ✅ Orçamentos não podem ser removidos se tiverem itens
- ✅ Usuários só acessam seus próprios dados
- ✅ Admins têm acesso completo ao sistema

## 📝 Padrão de Commits

O projeto utiliza **Commits Semânticos** com validação automática para manter o histórico organizado:

### Configuração Automatizada
- **CommitLint**: Validação de formato de commit
- **Husky**: Git hooks para automação
- **Pre-commit**: Execução automática de testes
- **Lint-staged**: Processamento otimizado de arquivos

### Formato de Commit
```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos Permitidos
- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Documentação
- **style**: Formatação (sem mudança de código)
- **refactor**: Refatoração de código
- **perf**: Melhoria de performance
- **test**: Adição ou correção de testes
- **build**: Mudanças no sistema de build
- **ci**: Mudanças na configuração de CI
- **chore**: Tarefas de manutenção
- **revert**: Reversão de commit

### Exemplos de Commits Válidos
```bash
feat(auth): adiciona autenticação por biometria
fix(api): corrige erro 500 no endpoint de usuários
docs(readme): atualiza instruções de instalação
test(auth): adiciona testes para login social
refactor(database): otimiza queries de relatórios
```

### Validação Automática
```bash
# ✅ Hook pre-commit executa automaticamente:
# 1. Testes unitários (80 testes)
# 2. Testes E2E (148 testes) 
# 3. Lint e formatação de código

# ✅ Hook commit-msg valida:
# 1. Formato do commit
# 2. Tipo permitido
# 3. Tamanho da descrição
```

### Scripts de Commit
```bash
# Commit com validação manual
npm run commitlint

# Executar apenas pre-commit hooks
npm run pre-commit

# Verificar todos os commits do branch
npx commitlint --from=origin/main --to=HEAD
```

### Documentação Completa
Para detalhes sobre tipos, exemplos e troubleshooting, consulte: [`COMMITS.md`](./COMMITS.md)Padrão de Commits

## 📚 Documentação da API

Após iniciar a aplicação, acesse:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs-json

### Exemplos de Endpoints

#### Autenticação

```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "senha": "password123"
}

# Refresh Token
POST /auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Logout
POST /auth/logout
Authorization: Bearer <token>
```

#### Usuários

```bash
# Criar usuário
POST /usuarios
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "password123",
  "telefone": "5511999999999",
  "role": "USER"
}

# Listar usuários (Admin apenas)
GET /usuarios
Authorization: Bearer <token>

# Buscar usuário
GET /usuarios/1
Authorization: Bearer <token>

# Atualizar usuário
PUT /usuarios/1
Authorization: Bearer <token>
{
  "nome": "João Santos"
}

# Desativar usuário (Admin apenas)
DELETE /usuarios/1
Authorization: Bearer <token>
```

#### Categorias

```bash
# Criar categoria
POST /categorias
Authorization: Bearer <token>
{
  "nome": "Alimentação",
  "descricao": "Gastos com comida",
  "tipo": "DESPESA"
}

# Listar categorias do usuário
GET /categorias
Authorization: Bearer <token>
```

## 🔒 Segurança

### Autenticação JWT

- Tokens com validade de 5 minutos
- Refresh tokens com validade de 7 dias
- Verificação automática em todos os endpoints protegidos

### Autorização por Roles

- **ADMIN**: Acesso completo ao sistema
- **USER**: Acesso apenas aos próprios dados

### Validações

- Senhas alfanuméricas (8-16 caracteres)
- Emails únicos e válidos
- Telefones únicos (formato DDI + DDD + NUMERO)
- Validação de tipos de categoria

### Logs de Auditoria

- Registro automático de todas as operações CRUD
- Logs de login/logout
- Armazenamento seguro em MongoDB
- Acesso restrito a administradores

## 🐳 Docker

### Desenvolvimento

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Inclui:
- API em modo watch
- MySQL com dados de desenvolvimento
- MongoDB
- PHPMyAdmin (http://localhost:8080)
- Mongo Express (http://localhost:8081)

### Produção

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Inclui:
- API otimizada para produção
- MySQL configurado para performance
- MongoDB com persistência de dados

## 🚀 Deploy

### Build para Produção

```bash
npm run build
```

### Variáveis de Ambiente em Produção

Certifique-se de configurar as seguintes variáveis:

- `JWT_SECRET`: Chave secreta forte
- `JWT_REFRESH_SECRET`: Chave secreta forte (diferente)
- `DB_PASSWORD`: Senha segura do MySQL
- `MONGO_URI`: URI completa do MongoDB

## 📈 Monitoramento

### Logs da Aplicação

- Logs estruturados via NestJS Logger
- Interceptor global para auditoria de requisições
- Logs de erro com stack trace

### Métricas

- Tempo de resposta das requisições
- Status codes de resposta
- Logs de acesso por usuário

## 🚀 Atualizações Recentes

### v1.2.0 - Melhorias de Qualidade (Setembro 2025)

#### � **Suíte de Testes Completa**
- ✅ **228 testes implementados** (80 unitários + 148 E2E)
- ✅ **100% das descrições traduzidas** para português
- ✅ **Cobertura completa** de todos os endpoints e services
- ✅ **Testes de integração** para validação end-to-end

#### 📝 **Tradução Completa**
- ✅ **Descrições de testes** em português brasileiro
- ✅ **Comentários de código** padronizados
- ✅ **Documentação** atualizada e melhorada
- ✅ **Mensagens de erro** mais claras

#### 🏗️ **Melhorias de Arquitetura**
- ✅ **Estrutura de testes** bem definida
- ✅ **Mocks e stubs** padronizados
- ✅ **Separação clara** entre testes unitários e E2E
- ✅ **Configuração Docker** otimizada

#### 🔧 **Configuração de Desenvolvimento**
- ✅ **Scripts npm** organizados
- ✅ **Ambiente de desenvolvimento** com Docker
- ✅ **Hot reload** configurado
- ✅ **Debugging** simplificado

### Próximas Funcionalidades (Roadmap)

#### 📊 **Dashboard e Relatórios**
- 📋 Relatórios financeiros detalhados
- 📈 Gráficos de gastos por categoria
- 📊 Análise de tendências de gastos
- 📋 Exportação para PDF/Excel

#### 🔔 **Notificações**
- 🔔 Alertas de orçamento excedido
- 📧 Relatórios mensais por email
- 📱 Notificações push (futura app mobile)
- ⏰ Lembretes de vencimento

#### 🔐 **Segurança Avançada**
- 🔐 Autenticação de dois fatores (2FA)
- 🔒 Criptografia de dados sensíveis
- 🛡️ Rate limiting avançado
- 📝 Logs de segurança detalhados

#### 🌐 **Integrações**
- 🏦 Integração com bancos (Open Banking)
- 💳 Importação de extratos
- 🔄 Sincronização automática
- 📱 API para aplicativos mobile

## �🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Guidelines de Contribuição

- ✅ **Testes obrigatórios** - Toda nova funcionalidade deve ter testes
- ✅ **Descrições em português** - Manter padrão de idioma
- ✅ **TypeScript strict** - Seguir tipagem rigorosa
- ✅ **Documentação atualizada** - Manter README e Swagger atualizados

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

## 📞 Suporte

Para suporte e dúvidas:

- **Repository**: [GitHub Repository](https://github.com/carlostelles/gerenciador-financeiro-api)
- **Issues**: [GitHub Issues](https://github.com/carlostelles/gerenciador-financeiro-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/carlostelles/gerenciador-financeiro-api/discussions)
- **Wiki**: [Documentação Completa](https://github.com/carlostelles/gerenciador-financeiro-api/wiki)

---

**Desenvolvido com ❤️ por [Carlos Telles](https://github.com/carlostelles)**

*Utilizando NestJS, TypeScript e as melhores práticas de desenvolvimento*