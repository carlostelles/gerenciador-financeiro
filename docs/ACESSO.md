# 🔑 Informações de Acesso - Gerenciador Financeiro

## 🌐 URLs de Acesso

- **Frontend**: http://localhost/
- **API**: http://localhost/api/
- **Health Check**: http://localhost/api/health

## 👥 Usuários de Teste

### Administrador
- **Email**: `admin@gerenciador.com`
- **Senha**: `admin123456`
- **Role**: `ADMIN`

### Usuário Comum
- **Email**: `joao@gerenciador.com`
- **Senha**: `joao123456`
- **Role**: `USER`

## 📝 Exemplo de Login via API

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gerenciador.com","senha":"admin123456"}'
```

**Resposta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 300
}
```

## 🔐 Usando Token de Autenticação

Para acessar endpoints protegidos, use o token no header:

```bash
curl -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  http://localhost/api/usuarios
```

## 🐳 Containers em Execução

- **gf-nginx**: Proxy reverso (porta 80)
- **gf-web**: Frontend Angular
- **gf-api**: Backend NestJS (porta 3000)
- **gf-mysql**: Banco MySQL (porta 3306)
- **gf-mongodb**: Banco MongoDB para logs (porta 27017)

## ⚙️ Configurações importantes

- ✅ CORS configurado para `http://localhost`
- ✅ Swagger desabilitado em produção
- ✅ Banco de dados sincronizado e populado
- ✅ SSL/TLS preparado (porta 443)
- ✅ Logs estruturados com MongoDB

## 🚀 Status dos Serviços

Para verificar o status dos containers:
```bash
docker-compose ps
```

Para ver logs de um serviço específico:
```bash
docker-compose logs api
docker-compose logs web
docker-compose logs nginx
```