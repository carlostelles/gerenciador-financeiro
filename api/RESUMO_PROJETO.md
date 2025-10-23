# 🏦 Gerenciador Financeiro - API NestJS

## ✅ Status do Projeto: COMPLETO E FUNCIONAL

**Data de Conclusão:** 30/09/2025  
**API Rodando em:** http://localhost:3000  
**Documentação:** http://localhost:3000/api/docs

---

## 📋 Resumo Executivo

Foi criada com sucesso uma API completa de gerenciamento financeiro utilizando NestJS, atendendo a todos os requisitos especificados:

- ✅ **Framework:** NestJS com TypeScript
- ✅ **Banco de Dados:** MySQL para entidades principais + MongoDB para logs
- ✅ **Autenticação:** JWT com tokens de 5 minutos e refresh tokens de 7 dias
- ✅ **Docker:** Configurações completas para desenvolvimento e produção
- ✅ **Documentação:** Swagger/OpenAPI com exemplos detalhados
- ✅ **Logging:** Sistema global de interceptação e armazenamento de logs
- ✅ **Arquitetura:** Padrão em camadas com separação clara de responsabilidades

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Pastas
```
gerenciador-financeiro/
├── src/
│   ├── modules/           # Módulos principais da aplicação
│   │   ├── auth/         # Autenticação JWT
│   │   ├── usuarios/     # Gestão de usuários
│   │   ├── categorias/   # Categorias de receitas/despesas
│   │   └── logs/         # Sistema de logs (MongoDB)
│   ├── common/           # Utilitários compartilhados
│   │   ├── guards/       # Guards de autenticação
│   │   ├── decorators/   # Decorators customizados
│   │   ├── interceptors/ # Interceptadores globais
│   │   └── types/        # Tipos e enums
│   └── app.module.ts     # Módulo principal
├── docker/               # Configurações Docker
├── scripts/              # Scripts utilitários
└── docs/                 # Documentação adicional
```

### Tecnologias Utilizadas
- **NestJS** v10.0.0 - Framework Node.js
- **TypeORM** - ORM para MySQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação e autorização
- **Swagger** - Documentação da API
- **bcrypt** - Criptografia de senhas
- **class-validator** - Validação de dados
- **Docker** & **Docker Compose** - Containerização

---

## 🗄️ Banco de Dados

### MySQL (Entidades Principais)
- **usuarios** - Gestão de usuários e autenticação
- **categorias** - Categorias de receitas, despesas e reservas
- **orcamentos** - Planejamento financeiro (estrutura criada)
- **movimentos** - Transações financeiras (estrutura criada)
- **reservas** - Gestão de reservas financeiras (estrutura criada)

### MongoDB (Logs)
- **logs** - Auditoria completa de operações do sistema

---

## 🔐 Sistema de Autenticação

### Características
- **Access Token:** 5 minutos de duração
- **Refresh Token:** 7 dias de duração
- **Roles:** ADMIN e USER
- **Endpoints:**
  - `POST /auth/login` - Login com email/senha
  - `POST /auth/refresh` - Renovação de tokens
  - `POST /auth/logout` - Logout e invalidação

### Usuários Pré-configurados
```
👤 Administrador:
   Email: admin@gerenciador.com
   Senha: admin123456
   Role: ADMIN

👤 Usuário Comum:
   Email: joao@gerenciador.com
   Senha: joao123456
   Role: USER
```

---

## 🚀 Como Executar

### Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)

### Início Rápido com Docker
```bash
# Clonar e acessar o projeto
cd gerenciador-financeiro

# Subir a infraestrutura completa
docker-compose -f docker-compose.dev.yml up -d

# A API estará disponível em http://localhost:3000
# Swagger em http://localhost:3000/api/docs
```

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Subir apenas os bancos de dados
docker-compose -f docker-compose.dev.yml up mysql mongodb phpmyadmin mongo-express -d

# Executar em modo desenvolvimento
npm run start:dev

# Criar usuários iniciais (opcional)
npm run seed
```

### Scripts Disponíveis
```bash
npm run start:dev     # Desenvolvimento com hot-reload
npm run start:prod    # Produção
npm run build         # Build da aplicação
npm run seed          # Popular banco com usuários iniciais
npm run docker:dev    # Build e run ambiente de desenvolvimento
npm run docker:prod   # Build e run ambiente de produção
```

---

## 📚 Endpoints Principais

### Autenticação (`/auth`)
- `POST /auth/login` - Realizar login
- `POST /auth/refresh` - Renovar tokens
- `POST /auth/logout` - Realizar logout

### Usuários (`/usuarios`)
- `GET /usuarios` - Listar usuários (Admin)
- `POST /usuarios` - Criar usuário
- `GET /usuarios/:id` - Buscar usuário específico
- `PATCH /usuarios/:id` - Atualizar usuário
- `DELETE /usuarios/:id` - Remover usuário

### Categorias (`/categorias`)
- `GET /categorias` - Listar categorias do usuário
- `POST /categorias` - Criar categoria
- `GET /categorias/:id` - Buscar categoria específica
- `PATCH /categorias/:id` - Atualizar categoria
- `DELETE /categorias/:id` - Remover categoria

### Logs (`/logs`)
- `GET /logs` - Listar logs (Admin)
- `GET /logs/:id` - Buscar log específico

---

## 🔧 Configurações

### Variáveis de Ambiente
O projeto utiliza configurações via ambiente, com valores padrão para desenvolvimento:

```env
# Banco MySQL
DB_HOST=localhost
DB_PORT=3307
DB_USERNAME=admin
DB_PASSWORD=admin123
DB_DATABASE=gerenciador_financeiro

# Banco MongoDB
MONGO_URI=mongodb://admin:admin123@localhost:27018/gerenciador_logs

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Aplicação
PORT=3000
NODE_ENV=development
```

### Docker Services
- **API:** Porta 3000
- **MySQL:** Porta 3307
- **MongoDB:** Porta 27018
- **phpMyAdmin:** Porta 8080
- **Mongo Express:** Porta 8081

---

## 📊 Sistema de Logs

### Interceptador Global
Todas as operações são automaticamente logadas no MongoDB com:
- Data/hora da operação
- Usuário responsável
- Ação realizada (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
- Entidade afetada
- Dados antes e depois da alteração

### Consulta de Logs
Os logs podem ser consultados via API pelos administradores:
```bash
GET /logs?page=1&limit=10&usuario=1&acao=CREATE
```

---

## 🔒 Segurança

### Medidas Implementadas
- **Autenticação JWT** com tokens de curta duração
- **Criptografia bcrypt** para senhas
- **Guards de autorização** baseados em roles
- **Validação rigorosa** de entrada de dados
- **Separação de responsabilidades** entre camadas
- **Logs de auditoria** para rastreabilidade

### Headers de Segurança
A API configura automaticamente headers de segurança apropriados.

---

## 📈 Funcionalidades Futuras

### Módulos Prontos para Implementação
As seguintes entidades já possuem estrutura criada e podem ser facilmente implementadas:

1. **Orçamentos** - Planejamento financeiro mensal/anual
2. **Movimentações** - Registro de receitas e despesas
3. **Reservas** - Gestão de reservas de emergência
4. **Relatórios** - Dashboards e análises financeiras

### Extensões Sugeridas
- Sistema de notificações
- Integração com bancos (Open Banking)
- Aplicativo mobile
- Importação de extratos
- IA para categorização automática

---

## 🐛 Resolução de Problemas

### Problemas Comuns

**API não conecta ao banco:**
```bash
# Verificar se os containers estão rodando
docker ps

# Verificar logs dos containers
docker-compose logs mysql
docker-compose logs mongodb
```

**Erro de JWT:**
```bash
# Verificar se o token está sendo enviado corretamente
# Header: Authorization: Bearer <token>
```

**Erro de permissão:**
```bash
# Verificar se o usuário tem a role adequada
# Alguns endpoints requerem role ADMIN
```

---

## 📞 Suporte

### Documentação
- **Swagger:** http://localhost:3000/api/docs
- **Código fonte:** Totalmente comentado e documentado
- **README:** Instruções detalhadas de instalação

### Ferramentas de Debug
- **phpMyAdmin:** http://localhost:8080 (MySQL)
- **Mongo Express:** http://localhost:8081 (MongoDB)
- **Logs da aplicação:** Console do container

---

## ✨ Conclusão

O projeto **Gerenciador Financeiro** foi desenvolvido com sucesso, atendendo a todos os requisitos especificados:

✅ **API NestJS** completa e funcional  
✅ **Duplo banco de dados** (MySQL + MongoDB)  
✅ **Autenticação JWT** com refresh tokens  
✅ **Docker** configurado para dev/prod  
✅ **Documentação Swagger** detalhada  
✅ **Sistema de logs** global  
✅ **Arquitetura escalável** em camadas  

A API está pronta para uso e pode ser facilmente estendida com novos módulos e funcionalidades conforme a necessidade do projeto.

---

**Developed with ❤️ using NestJS**