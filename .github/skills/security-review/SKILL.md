---
name: security-review
description: 'Auditar código em busca de vulnerabilidades de segurança seguindo o OWASP Top 10 antes de merge ou deploy. Use quando: revisar lógica de autenticação/autorização, lidar com entrada de usuário, trabalhar com dados financeiros, adicionar novos endpoints, ou auditar dependências em busca de vulnerabilidades.'
---

# Revisão de Segurança

## Quando Usar
- Adicionar/modificar autenticação, autorização, ou tratamento de sessão/token
- Qualquer endpoint que aceite entrada de usuário (body, query, params, headers)
- Lidar com dados financeiros sensíveis (movimentações, saldos, dados pessoais)
- Antes de fazer merge de um PR que toca código sensível à segurança
- Auditar dependências ou configuração de Docker/nginx

## Procedimento (checklist alinhado ao OWASP)

1. **Injeção**: Todas as queries de BD usam queries parametrizadas/métodos do ORM (query builder do TypeORM ou métodos de repositório) — nunca SQL concatenado manualmente. Valide/sanitize toda entrada de usuário com DTOs.
2. **Falhas de Autenticação**: Senhas com hash usando um algoritmo forte (bcrypt/argon2), nunca registradas em log ou retornadas nas respostas. Tokens JWT/sessão têm expiração adequada e são validados em toda rota protegida (guards).
3. **Falhas de Controle de Acesso (crítico para este app)**: Toda query filtrada pelo `usuario_id` autenticado — verifique que um usuário não consegue ler/modificar/excluir `movimentacoes`, `orcamentos`, `reservas`, `categorias` de outro usuário manipulando o ID (IDOR). Verifique se guards/decorators são aplicados a todos os novos controllers.
4. **Exposição de Dados Sensíveis**: Nenhum segredo/chave de API/senha de BD fixada no código-fonte — use variáveis de ambiente (verifique se `.env`, `docker-compose*.yml` não vazam segredos no repositório). DTOs de resposta excluem hashes de senha e campos internos.
5. **Configuração Incorreta de Segurança**: CORS configurado para origens específicas (não `*`) em produção. Respostas de erro não vazam stack traces/detalhes internos aos clientes.
6. **XSS**: A sanitização nativa do Angular não é contornada (`bypassSecurityTrust*`, `[innerHTML]`) sem justificativa; conteúdo gerado por usuário é escapado.
7. **Desserialização Insegura / Validação de Entrada**: Todos os DTOs usam `class-validator` com `whitelist: true` e `forbidNonWhitelisted: true` para rejeitar campos inesperados.
8. **Dependências Vulneráveis**: Execute `npm audit` (veja a skill `dependency-management`) periodicamente e antes de adicionar novos pacotes.
9. **Logging Insuficiente**: Eventos relevantes à segurança (logins falhos, negações de autorização) são registrados sem registrar dados sensíveis (senhas, tokens completos).
10. **SSRF/CSRF**: Se o app faz requisições de saída baseadas em entrada de usuário, valide/use allowlist de destinos. Verifique a proteção CSRF para sessões baseadas em cookies.

## Boas Práticas
- Trate toda entrada do cliente como não confiável, incluindo dados vindos do frontend Angular.
- Falhe de forma restritiva: negação por padrão na autorização, regras explícitas de permissão.
- Nunca incorpore segredos ou credenciais em imagens Docker ou configs do nginx versionadas no repositório.

## Armadilhas Comuns
- Confiar no `usuario_id` enviado pelo cliente em vez de derivá-lo da sessão/JWT autenticado.
- Retornar entidades completas do ORM nas respostas da API (vaza hash de senha, timestamps internos).
- Registrar dados sensíveis (tokens, senhas, registros financeiros completos) em logs de texto puro.
- Adicionar um novo endpoint sem verificação de guard/autorização porque "é só para teste".
