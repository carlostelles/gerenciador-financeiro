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
GEMINI_MODEL=gemini-3.1-flash-lite
MOVIMENTO_COMPROVANTE_MAX_SIZE_BYTES=10485760

# WhatsApp Cloud API Configuration
WHATSAPP_API_VERSION=vXX.X
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
WHATSAPP_APP_SECRET=your-whatsapp-app-secret
WHATSAPP_MEDIA_MAX_SIZE_BYTES=10485760
WHATSAPP_HTTP_TIMEOUT_MS=15000
WHATSAPP_WORKER_ENABLED=true
WHATSAPP_WORKER_POLL_INTERVAL_MS=1000
WHATSAPP_WORKER_LEASE_SECONDS=300
```

### Operação do Webhook WhatsApp (Inbound-Only)

#### Escopo Atual da Integração

A integração WhatsApp desta API está em modo **inbound-only**:

- recebe eventos de mensagens e status enviados pela Meta WhatsApp Cloud API;
- processa mensagens de texto e anexos (imagem/PDF) no fluxo interno;
- **não envia mensagens outbound** para números de clientes nesta implementação atual.

#### Variáveis de Ambiente

Obrigatórias para o fluxo inbound:

- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: token de verificação usado no `GET /whatsapp/webhook` (deve ser idêntico ao configurado no App da Meta).
- `WHATSAPP_API_VERSION`: versão da Graph API no formato `vNN.N`. Defina no deploy uma versão suportada, consultando a documentação oficial da Meta; o projeto não fixa uma versão presumida como atual.
- `WHATSAPP_PHONE_NUMBER_ID`: identificador validado contra o payload antes de baixar mídia.
- `WHATSAPP_ACCESS_TOKEN`: token Bearer usado somente nas chamadas server-to-server à Meta.

Obrigatória em produção e recomendada em qualquer ambiente:

- `WHATSAPP_APP_SECRET`: usada para validar a assinatura `x-hub-signature-256` do `POST /whatsapp/webhook`.

Limites e operação do worker:

- `WHATSAPP_MEDIA_MAX_SIZE_BYTES`: limite validado nos metadados e nos bytes baixados.
- `WHATSAPP_HTTP_TIMEOUT_MS`: timeout de cada chamada à Graph API.
- `WHATSAPP_WORKER_ENABLED`: habilita o consumidor da fila MySQL no processo.
- `WHATSAPP_WORKER_POLL_INTERVAL_MS`: intervalo de busca por jobs prontos.
- `WHATSAPP_WORKER_LEASE_SECONDS`: prazo do lease; jobs interrompidos voltam para retry após expirar.

O POST valida assinatura e estrutura, persiste um job idempotente por `wamid` e responde sem aguardar download, S3 ou IA. O worker usa claim transacional com lease, `FOR UPDATE SKIP LOCKED` e backoff exponencial. Eventos e erros persistidos são sanitizados; tokens e URLs temporárias não são armazenados.

#### Endpoints Expostos

- `GET /whatsapp/webhook`: verificação inicial do webhook pela Meta.
- `POST /whatsapp/webhook`: recebimento de eventos (mensagens/status).
- `GET /whatsapp/inbound` (com autenticação JWT): consulta do histórico de mensagens inbound processadas.

#### Configuração na Meta WhatsApp Cloud API

Os nomes de menus do Portal Meta podem variar, mas os ativos e identificadores abaixo são os mesmos. Não escolha uma versão Graph por cópia deste documento: consulte as versões suportadas no painel/documentação oficial e configure o valor escolhido em `WHATSAPP_API_VERSION`.

1. Em [Meta for Developers](https://developers.facebook.com/), crie ou selecione um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Em **WhatsApp > API Setup**, selecione ou crie a WhatsApp Business Account (WABA) e adicione/verifique o número comercial. Registre separadamente o **WABA ID** e o **Phone Number ID**; `WHATSAPP_PHONE_NUMBER_ID` recebe o segundo, não o número em formato telefônico.
3. No Business Portfolio, crie um **System User** dedicado à integração, atribua a ele o app e a WABA/número com acesso suficiente e gere um token de longa duração para esse app. Selecione somente `whatsapp_business_messaging` e `whatsapp_business_management`; não use token de usuário pessoal nem o token temporário do painel em produção.
4. Guarde o token no cofre de segredos como `WHATSAPP_ACCESS_TOKEN`. Guarde o **App Secret**, obtido em **App settings > Basic**, como `WHATSAPP_APP_SECRET`. Nunca envie esses valores em tickets, logs ou comandos versionados.
5. Gere um valor aleatório independente para `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, configure-o primeiro no ambiente da API e depois informe o mesmo valor no painel. Esse token não é o App Secret nem o access token.
6. Publique a API atrás do nginx com certificado válido. Neste repositório, a rota interna da API é `/whatsapp/webhook`, mas o nginx HTTPS remove o prefixo `/api`; portanto o callback público real é:

  ```text
  https://controle-financeiro.gaius.digital/api/whatsapp/webhook
  ```

  Para outro domínio que use a mesma configuração, substitua apenas o host. Um túnel apontado diretamente para a porta `3000` usa `/whatsapp/webhook`, sem `/api`.
7. Em **WhatsApp > Configuration > Webhook**, informe a Callback URL pública e o verify token. Ao salvar, a Meta envia um `GET` com `hub.mode=subscribe`, `hub.verify_token` e `hub.challenge`; a API deve responder `200` com o challenge.
8. Em **Webhook fields**, assine o campo `messages`. Esse campo entrega mensagens recebidas e também atualizações no array `statuses`; não é necessário assinar um campo `message_status` separado.
9. Confirme que a WABA está inscrita no app. Use a ação de gerenciamento/inscrição da WABA no painel ou consulte `/{WABA_ID}/subscribed_apps` com a versão Graph configurada. A configuração do callback sozinha não substitui a inscrição da WABA.
10. Em modo **Development**, somente números de teste e pessoas com função no app/destinatários permitidos participam do teste. Cadastre e valide o telefone remetente em **API Setup** e envie para o número de teste fornecido pela Meta. Para tráfego real, conclua verificação empresarial, revisão/configuração exigida pela Meta, adicione o número comercial e mude o app para **Live**.

O `POST` valida `x-hub-signature-256: sha256=<hash>` sobre os bytes brutos com HMAC-SHA256 e `WHATSAPP_APP_SECRET`. A assinatura é produzida pela Meta; não desabilite essa validação em produção.

#### Teste Seguro no Portal Meta

1. Faça o handshake pelo botão de salvar/verificar do próprio painel e confirme `200` nos logs de acesso sem registrar a query string, pois ela contém o verify token.
2. No telefone permitido para teste, envie uma mensagem de texto ao número WhatsApp da integração e confirme que surge um job concluído.
3. Envie uma imagem JPEG/PNG suportada e um PDF pequeno, um por vez. Use arquivos sintéticos, sem dados financeiros ou pessoais reais.
4. Confirme no S3 uma nova chave de comprovante e consulte o histórico autenticado em `GET /whatsapp/inbound?limit=20`. O endpoint filtra pelo usuário do JWT; não use credenciais de outro usuário.
5. Consulte apenas IDs, status, contagens e timestamps nas tabelas operacionais. Não imprima `payload`, `dados`, telefone, texto, URLs temporárias, token ou conteúdo do comprovante.

Para testar somente o handshake contra uma API local, sem colocar o verify token no histórico do shell, leia-o de forma silenciosa e faça a chamada direta à porta da API. Evite esse teste contra o nginx público, cujo access log pode registrar a query string:

```bash
read -s VERIFY_TOKEN
curl --get --fail-with-body "http://localhost:3000/whatsapp/webhook" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=${VERIFY_TOKEN}" \
  --data-urlencode "hub.challenge=12345"
unset VERIFY_TOKEN
```

Resposta esperada: `12345`. Para um `POST` real, use o evento enviado pela Meta. Uma simulação manual só é válida se a assinatura HMAC for calculada sobre exatamente os mesmos bytes do body.

#### Deploy e Rollback

O deploy permanece bloqueado enquanto houver vulnerabilidades críticas/altas de runtime sem correção ou aceite formal temporário registrado. O backlog está em `docs/DEPENDENCIAS_VULNERAVEIS_BACKLOG.md`.

1. Confirme testes, lint, build da API e build Docker no commit candidato. Valide também que `NODE_ENV=production` mantém `synchronize=false`.
2. Preencha o `.env` da raiz, consumido por `docker-compose.yml`, usando o `.env.example` da raiz como inventário. Use cofre de segredos e não versione o arquivo. Além das variáveis WhatsApp, valide MySQL, MongoDB, S3, Gemini, JWT e CORS.
3. Defina `WHATSAPP_WORKER_ENABLED=false` durante a janela inicial para impedir consumo antes do schema e dos segredos estarem prontos.
4. Faça backup e valide que o dump não está vazio:

  ```bash
  make backup
  ls -lh backups/*/mysql_backup.sql
  ```

5. Registre a imagem/tag atualmente implantada, faça checkout do commit aprovado e construa a nova imagem sem iniciar a API nova:

  ```bash
  docker compose build api
  ```

6. Execute as migrations em ordem crescente. O TypeORM aplica primeiro `1788134400000` e depois `1798502400000`:

  ```bash
  docker compose run --rm api npm run migration:run:prod
  docker compose run --rm api npm run typeorm -- migration:show -d dist/data-source.js
  ```

7. Suba a API com o worker ainda desabilitado, aguarde o health check e faça o smoke test do handshake e de autenticação:

  ```bash
  docker compose up -d api nginx
  docker compose ps
  curl --fail-with-body https://controle-financeiro.gaius.digital/health
  ```

8. Habilite `WHATSAPP_WORKER_ENABLED=true`, recrie apenas a API e envie texto, imagem e PDF sintéticos pelo número permitido. Confirme job, mensagem inbound, resultado, S3 e movimento/comprovante esperado.
9. Monitore retries, falhas, CPU/memória e respostas do webhook durante a janela de observação antes de encerrar a mudança.

Rollback de aplicação: desabilite o worker, pare a API, restaure a tag anterior e suba a versão anterior. Isso preserva as tabelas novas e é a opção preferida enquanto se investiga.

Rollback de schema: só execute com backup verificado e a API nova parada. Reverta `1798502400000` antes de `1788134400000`, uma chamada por migration:

```bash
docker compose stop api
docker compose run --rm api npm run migration:revert:prod
docker compose run --rm api npm run migration:revert:prod
# Restaure a tag anterior da imagem e mantenha o worker desabilitado.
docker compose up -d api nginx
```

O `down` da migration `1798502400000` reduz novamente comprovante para um único movimento: quando vários movimentos compartilham um comprovante, somente o movimento de menor ID é mantido no vínculo legado. O `down` de `1788134400000` remove jobs e resultados e elimina estados de processamento/retry. Checkpoints são removidos pelo primeiro `down`. Exporte essas tabelas ou restaure o backup se o histórico precisar ser preservado.

#### Observabilidade Operacional

Logs de aplicação úteis e sanitizados:

```bash
docker compose logs --since=30m api | grep -E "WhatsappInboundWorkerService|Lease perdido|Falha ao renovar lease"
docker compose logs --since=30m nginx | grep "/api/whatsapp/webhook"
```

Não compartilhe a linha completa do handshake do access log. Para acompanhar a fila sem consultar payloads:

```sql
SELECT status, COUNT(*) AS quantidade, MIN(createdAt) AS mais_antigo,
     MAX(updatedAt) AS ultima_atualizacao
FROM whatsapp_inbound_jobs
GROUP BY status;

SELECT id, providerMessageId, status, tentativas, maxTentativas,
     proximaTentativaEm, leaseAte, updatedAt, ultimoErro
FROM whatsapp_inbound_jobs
WHERE status IN ('AGUARDANDO_RETRY', 'FALHA')
ORDER BY updatedAt DESC
LIMIT 50;

SELECT statusProcessamento, COUNT(*) AS quantidade
FROM whatsapp_inbound_messages
WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
GROUP BY statusProcessamento;

SELECT inboundMessageId, ordinal, status, movimentoId, comprovanteId, createdAt
FROM whatsapp_inbound_results
ORDER BY id DESC
LIMIT 50;

SELECT etapa, COUNT(*) AS quantidade, MAX(updatedAt) AS ultima_atualizacao
FROM whatsapp_inbound_checkpoints
GROUP BY etapa;
```

Alertas mínimos: crescimento contínuo de `PENDENTE`; qualquer `FALHA`; retries próximos de `maxTentativas`; jobs `PROCESSANDO` com `leaseAte` expirado; ausência de novos `CONCLUIDO` durante tráfego conhecido; aumento de HTTP 4xx/5xx no webhook; falhas de download Meta, S3 ou IA; e divergência entre resultados concluídos e movimentos/comprovantes esperados.

#### Teste Local (ngrok/cloudflared)

1. Inicie a API local (ex.: porta `3000`).
2. Abra um túnel HTTPS para a porta local.

Exemplo com ngrok:

```bash
ngrok http 3000
```

Exemplo com cloudflared:

```bash
cloudflared tunnel --url http://localhost:3000
```

3. Use a URL pública gerada como callback:
   - `https://SEU-TUNEL/whatsapp/webhook`
4. Teste o `GET` de verificação:

```bash
curl -i "https://SEU-TUNEL/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=12345"
```

Resposta esperada: `200` com body `12345`.

5. Teste um `POST` de payload (simulação local):

```bash
curl -i -X POST "https://SEU-TUNEL/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=ASSINATURA_HEX" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "WABA_ID",
        "changes": [
          {
            "field": "messages",
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "5511999999999",
                "phone_number_id": "123456789"
              },
              "contacts": [
                {
                  "wa_id": "5511888888888",
                  "profile": { "name": "Cliente Teste" }
                }
              ],
              "messages": [
                {
                  "from": "5511888888888",
                  "id": "wamid.HBgL...",
                  "timestamp": "1723000000",
                  "type": "text",
                  "text": { "body": "gastei 23,90 no mercado hoje" }
                }
              ]
            }
          }
        ]
      }
    ]
  }'
```

Observação: com `WHATSAPP_APP_SECRET` ativo, a assinatura precisa ser válida para o body enviado; caso contrário, a API retorna erro de assinatura.

#### Troubleshooting Rápido

- **Verify token inválido**
  - Sintoma: falha no handshake de verificação do webhook.
  - Verifique se o token configurado na Meta é exatamente igual a `WHATSAPP_WEBHOOK_VERIFY_TOKEN` da API.

- **Assinatura inválida (`x-hub-signature-256`)**
  - Sintoma: rejeição do `POST /whatsapp/webhook` com erro de assinatura.
  - Verifique `WHATSAPP_APP_SECRET`, o header `sha256=<hash>` e se o cálculo foi feito sobre o body bruto enviado.

- **Telefone sem usuário vinculado**
  - Sintoma: webhook é recebido, mas a mensagem inbound fica com falha de processamento por usuário não identificado.
  - Verifique se existe usuário com telefone cadastrado no formato esperado (com/sem `55`, conforme normalização do sistema).

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
6. Se os campos obrigatórios estiverem presentes, a API já persiste a movimentação na mesma chamada:
  - `201 Created` quando cria nova movimentação
  - `200 OK` quando atualiza movimentação existente (modo edição)
7. Se faltar algum campo obrigatório, a API cria uma movimentação não revisada, retorna `201 Created` com `camposObrigatoriosFaltantes` e permite a complementação manual posterior.
8. Em todos os cenários, o comprovante fica salvo e pode ser compartilhado por mais de uma movimentação do mesmo usuário, como ocorre nos lançamentos extraídos de um extrato.

### Dados Persistidos do Comprovante

Cada comprovante fica registrado na entidade `movimento_comprovantes` com os seguintes campos:

- `idempotencyKey`: chave interna opcional que evita duplicação em retries do worker
- `usuarioId`: dono do arquivo
- `caminhoArquivo`: caminho completo no S3 (`s3://bucket/key`)
- `nomeArquivo`: nome original enviado pelo usuário
- `tipoArquivo`: MIME type do arquivo
- `tamanhoArquivo`: tamanho em bytes

O vínculo canônico fica em `movimentos.comprovanteId` (`ManyToOne`): um comprovante pode estar associado a vários movimentos, e a exclusão de um movimento não remove o arquivo nem os demais vínculos.

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

O projeto usa o modelo `gemini-3.1-flash-lite` por equilibrar latência e qualidade para leitura de comprovantes em imagem e PDF. O nome do modelo pode ser alterado por variável de ambiente em `GEMINI_MODEL`.

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
6. Defina opcionalmente `GEMINI_MODEL=gemini-3.1-flash-lite` ou outro modelo multimodal compatível.

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