# Recuperação de senha

## Contrato e experiência

- `POST /auth/solicitar-recuperacao-senha`, `{ email }`: `202` com mensagem neutra para conta ativa, inexistente, inativa e limite por destinatário. Somente contas ativas recebem e-mail. Configuração ausente/inválida ou indisponibilidade de persistência: `503` sanitizado.
- `POST /auth/redefinir-senha`, `{ token, novaSenha, confirmarSenha }`: `200` sem JWT/cookie; login manual. `400` para validação ou link inválido/expirado/usado/revogado, sem distinguir esses estados.
- `POST /auth/alterar-senha` continua com o contrato anterior. Agora invalida as sessões anteriores e detecta alteração concorrente da versão validada.
- Senha: 8–16 caracteres ASCII, letras/dígitos ou `!@#$%^&*()_+-=[]{}|?,.:`. Nenhuma combinação de classes obrigatória; sem trim.
- `/esqueci-senha`: só e-mail, resposta neutra, preservação do campo e reenvio manual após cooldown. `/redefinir-senha#token=...`: captura exclusivamente em memória e remove o fragmento imediatamente. **Ao recarregar, reabra o link do e-mail**, pois o token não é salvo em storage. Abertura não consome o link.
- Sucesso encerra a sessão local ainda correspondente à tentativa, sem restaurá-la por respostas antigas de refresh e sem apagar um novo login concorrente. Falha de refresh não redireciona as duas rotas públicas. Os POSTs não recebem retries automáticos ou alertas duplicados dos interceptadores.

## Segurança e persistência

Token: 32 bytes de `crypto.randomBytes`, base64url; SHA-256 em `recuperacoes_senha`. A fila persiste temporariamente token e destinatário **cifrados**, nunca em claro, para permitir envio após reinício. Expiração em 300 segundos desde a emissão, inválido em `agora >= expiresAt`. São usadas datas UTC e milissegundos; mantenha relógios de API/MySQL sincronizados. Tela e e-mail explicitam: **“O link expira 5 minutos após a solicitação. O tempo de entrega conta nesse prazo.”**

`recuperacao_limites` mantém até três timestamps por destinatário na janela móvel de 60 minutos, inclusive inexistentes. Cooldown de 60 segundos. Variações equivalentes de contas existentes na collation MySQL compartilham o endereço canônico cadastrado. Os limites persistem entre conexões/instâncias; uma solicitação suprimida não revoga o link atual.

Aquisição do bucket usa `INSERT ... ON DUPLICATE KEY UPDATE emailDigest = VALUES(emailDigest)`: em duplicata, adquire lock exclusivo diretamente e só reatribui a mesma chave, preservando `admissions`. Não usar `INSERT IGNORE` seguido de promoção de lock compartilhado para exclusivo. Nenhuma repetição automática de transação foi adicionada.

Ordem de locks: limite do destinatário → usuário → recuperações → jobs. Confirmação/alteração de conta começam pelo usuário, nunca fazem o caminho inverso para limites. A busca inicial do digest/conta não bloqueia; a validade é reavaliada sob `pessimistic_write`. Senha bcrypt, consumo, revogação das pendências, cancelamento dos jobs preparatórios e incremento de `usuarios.credenciaisVersao` são atômicos. E-mail alterado/desativação revogam pendências e cancelam jobs na transação; reativação não restaura links. Ambas as entradas de alteração de senha em `UsuariosService` incrementam a versão.

Confirmação rejeita digest inexistente, recuperação consumida/revogada ou expirada já na consulta preliminar, **antes de bcrypt**, com a mesma mensagem de link inválido. O hash continua fora da transação. Essa consulta não autoriza o reset: usuário ativo/versão e recuperação atual/uso único/expiração/revogação são relidos e revalidados sob locks depois do hash, inclusive se o estado mudar durante o cálculo. Falha de lookup/hash/persistência retorna `503` sanitizado.

JWT access/refresh conferem conta ativa e versão atual. Legado sem claim só é aceito na versão zero; null/string/fração/negativo e subject inválido são rejeitados. A emissão usa a versão capturada das credenciais validadas, nunca uma versão nova consultada após bcrypt. Operações já autorizadas antes do commit não são canceladas.

O request valida configuração local uniformemente, persiste admissão + revogação/cancelamento anterior + emissão + enqueue na **mesma transação** e retorna `202`. Não chama/aguarda o SDK, não consulta disponibilidade externa e não dispara Promise de envio. Falha de cifragem/enqueue desfaz inclusive a admissão e preserva o link anterior; persistência indisponível retorna `503` sanitizado. Commit de resultado incerto não é repetido automaticamente. O worker envia independentemente, sem transação/locks de banco durante a rede. Falha/timeout revoga apenas a tentativa correspondente, sem restaurar links antigos nem atingir reenvio posterior. Uma falha posterior ao commit não altera a resposta HTTP já concluída.

Sem token/senha/endereço/digest/ciphertext/segredo no corpo de logs de recuperação; exceções SDK nunca são serializadas. Logging de queries TypeORM fica desabilitado para evitar parâmetros sensíveis. Eventos sanitizados: `password_reset_completed`, `password_reset_persistence_unavailable`, `password_reset_confirmation_unavailable`, `password_reset_worker_unavailable`, `password_reset_finalization_unavailable`, `password_reset_queue`. Não configurar tracing externo para capturar corpos/cabeçalhos dessa integração.

### Enumeração temporal — limitação conhecida

Igualdade de mensagem/status não implica igualdade de duração. Testes com **serviço real/MySQL e provedor simulado bloqueado** comprovam que os requests ativo/inexistente e reenvio concluem sem liberar o envio. Isso remove a espera direta pelo provedor, não diferenças de consultas, locks, cifragem e inserts. **Não há garantia de tempo constante, igualdade artificial de latência ou medição com provedor real.**

## Hostinger SDK 1.19.1

Pacote backend já fixado: `hostinger-mail-api-sdk@1.19.1`. Fontes verificadas: `api.ts`, `configuration.ts`, `docs/V1SendRequest.md` e declarações distribuídas no pacote instalado; referência pública: https://api.mail.hostinger.com/.

| Operação | Contrato verificado |
|---|---|
| SDK | `new SendApi(new Configuration({ accessToken })).sendEmail(mailboxResourceId, payload, options)` |
| HTTP | `POST /api/v1/mailboxes/{mailboxResourceId}/send` |
| Autenticação | `Authorization: Bearer …`, exclusivamente backend |
| Payload usado | `to: string[]`, `subject`, `text`, `html`; sem `from` |
| Remetente | Caixa identificada por mailbox; **não usar MAIL_FROM** |
| Resposta | `204`, sem body/id; aceitação não garante entrega |
| Transporte | Axios do SDK, timeout 5000ms + AbortController/deadline; redirects desabilitados, sem retry |

O gerador de tipos 1.19.1 marca campos documentados opcionais como obrigatórios, inclusive `inReplyTo` e `forwardOf`, mutuamente exclusivos. O adapter usa um `Pick` verificado dos quatro campos de envio e uma asserção isolada na fronteira SDK; não inventa mensagens de origem. Teste executa o serializer real para verificar rota, Bearer e payload. Testes de envio usam spy/mock; nenhum e-mail real foi enviado. Timeout pode ocorrer após aceitação; eventual e-mail tardio pode conter link revogado. A preservação do fragmento no serializer é testada; entrega real, reescrita de links pelo provedor e filtros do destinatário dependem de validação operacional.

## Configuração e ativação (fase de entrega)

Configure somente no backend:

- `HOSTINGER_MAIL_API_TOKEN`: segredo com autorização de envio na caixa.
- `HOSTINGER_MAIL_MAILBOX_ID`: identificador dessa caixa.
- `PASSWORD_RESET_WEB_ORIGIN`: origem pública confiável (ex.: `https://financeiro.example`), sem credenciais/caminho/query/fragmento; HTTPS obrigatório em produção. Nunca derivada de Host ou headers encaminhados.
- `PASSWORD_RESET_ACTIVE_KEY_ID`: identificador da chave ativa, 1–64 caracteres ASCII alfanuméricos, `_` ou `-`.
- `PASSWORD_RESET_KEYRING`: objeto JSON de identificadores para chaves aleatórias de **32 bytes em base64 canônico**. A chave ativa deve existir. Gerar no gerenciador de segredos, nunca reutilizar JWT, token Hostinger ou senha MySQL. Nenhuma chave real é gerada/versionada por esta implementação.
- `PASSWORD_RESET_DELIVERY_ENABLED`: `false` pausa aquisição/despacho, mas **não** expiração/limpeza. Padrão `true`. Pausar não suspende a validade de 300 segundos.
- `TRUSTED_PROXY_CIDRS`: lista explícita de IPs/CIDRs dos proxies controlados, separada por vírgulas; vazio = não confiar em encaminhamento. Não usar `true`, contagem de hops, `/0` ou redes compartilhadas amplas.

Exemplos e ambos os Compose de produção incluem chave ativa/keyring vazios, não segredos fictícios de fallback. Sem configuração completa, solicitação retorna `503` para qualquer endereço, inclusive conta inativa/inexistente/suprimida. Nenhuma configuração Hostinger ou chave da fila vai ao Angular. JSON no arquivo de ambiente deve ser literal, protegido por aspas simples se exigidas pelo parser usado; preservar o padding base64. Não executar `compose config` em logs com ambiente real, pois pode expandir segredos.

API usa Nest Throttler: **5/min/IP por endpoint**, com `429` e `Retry-After` exposto por CORS. O storage IP do Throttler é local à instância; a topologia Compose atual tem uma API. Se escalar horizontalmente, manter limite agregado no ingresso ou storage compartilhado antes de ativar múltiplas instâncias. Limites por e-mail já são compartilhados no MySQL.

Nginx sobrescreve X-Forwarded-For pelo peer observado nos blocos API, inclusive onde a herança de `proxy_set_header` é substituída. Configure o IP controlado do nginx em `TRUSTED_PROXY_CIDRS`; não confiar em todos os peers que possam acessar diretamente a porta publicada da API. Se existir CDN/LB anterior, revise explicitamente a cadeia de confiança e a restrição de acesso; esta configuração não presume CDNs confiáveis. Confirme limites tanto via proxy quanto no acesso direto. HTTP-only serve à inicialização de TLS, não à ativação de recuperação em produção.

API retorna `Cache-Control: no-store` e `Referrer-Policy: no-referrer`, inclusive erros de guard/validação. HTML da SPA usa no-store, meta/no-referrer e cabeçalho nginx; assets imutáveis mantêm cache.

## Migração e operação

Migração registrada explicitamente: `PasswordRecovery1798844400000`, em `api/src/migrations/1798844400000-PasswordRecovery.ts`. Registro comum em `DatabaseConfig`, também usado pelo CLI. `synchronize: false`.

`up`: coluna de versão não nula/default zero, tabelas de limites e recuperações, digest único, índice usuário/revogação, FK de usuário com cascade. `down`: remove tabelas e coluna. O teste MySQL executa **up → down → up** sobre um schema-base mínimo isolado, não sobre o banco da aplicação. DDL MySQL tem commits implícitos: backup, verificação do schema e plano de reparo em falha parcial são necessários.

Na entrega: migrar antes de iniciar o código novo, interromper todas as instâncias antigas que ignorem a versão e só então liberar tráfego. **Não fazer rollback para código antigo ou remover a versão com JWTs antigos ainda válidos**: isso reaceitaria sessões revogadas. Para rollback de segurança, manter verificação da versão ou invalidar/rotacionar todos os segredos JWT e exigir login antes de reverter schema. Não houve migração/deploy no banco de produção nesta fase.

Migração **nova e aditiva**: [1798930800000-PasswordResetDelivery.ts](../api/src/migrations/1798930800000-PasswordResetDelivery.ts), classe `PasswordResetDelivery1798930800000`, registrada depois da base. Cria somente `recuperacao_envios`; `down` remove somente essa tabela, sem tocar a versão de credenciais ou recuperações legadas. MySQL 8.0.16+ é necessário para enforcement do CHECK de envelope. Não alterar/renomear a migração-base `1798844400000`. A migração com timestamp `1788963000000` não estava presente no baseline desta fase.

Migre a fila antes de iniciar o novo código. **Interrompa todos os emissores síncronos antigos** antes de habilitar a nova versão; não misturar protocolos de envio. Não há backfill de recuperações legadas: não existe token bruto para reconstruir seus jobs. Links legados continuam confirmáveis. Rollback da fila exige parar workers e novos emissores primeiro, aceitar a perda dos envios ainda não despachados e manter a proteção de versão JWT. A reversão da migração-base é um procedimento distinto e perigoso, não necessário para reverter a fila.

## ADR — outbox MySQL e resultado externo incerto (aprovado)

Usar MySQL 8/InnoDB existente, sem Redis/BullMQ ou dependência nova. Providers privados em `AuthModule`: `PasswordResetDeliveryStore`, `PasswordResetPayloadCipher`, `PasswordResetDeliveryWorker`. Nenhuma rota/ID/estado público de fila. A emissão permanece no request para preservar início da validade, limites persistentes e último link.

### Envelope e rotação

`AES-256-GCM` nativo, nonce aleatório de 12 bytes e tag de 16 bytes. Payload mínimo `{token,email}`. AAD é um array JSON ordenado com domínio, versão, keyId, jobId, resetId, userId, digest, emissão/expiração ISO UTC e versão de credenciais. Na abertura, autenticar GCM, formato e SHA-256 do token; comparar destinatário à conta sob lock. Adulteração falha fechada e revoga **só essa recuperação**. Chave desconhecida espera correção em `pending` dentro do TTL original, sem consumir orçamento de falhas transitórias de preparação.

Rotação: (1) distribuir nova chave no keyring de **todos** os backends para leitura; (2) trocar o identificador ativo para escrita; (3) manter as chaves antigas enquanto houver envelopes que as referenciem; (4) removê-las segundo a política de backups. Alterar env exige reinício controlado. Não reutilizar identificadores para valores diferentes. Nenhuma etapa renova validade.

**Risco aprovado:** acesso conjunto a banco e keyring recupera temporariamente tokens. Proteger keyring separadamente dos backups, restringir acessos e evitar dumps/logs de ambiente. Exclusão de envelope no banco ativo não apaga páginas antigas, binlogs, réplicas ou backups. Retenção/criptografia de backups e descarte de chaves devem considerar isso.

### Estados, locks e crashes

`pending → leased → dispatching → accepted`; terminais alternativos `failed`, `cancelled`, `expired`, `unknown`. Diagnósticos são enumerações fechadas, não mensagens do SDK/driver. `recuperacaoId` é FK UNIQUE com cascade, permitindo 0..1 job por recuperação. Índices cobrem disponibilidade, leases e conclusão. CHECK exige envelope completo preparatório e nulo nos demais estados.

- Claim usa `FOR UPDATE SKIP LOCKED`, transação curta só em jobs, lease de 30s no horário MySQL e incremento de owner/version/attempts. Libera lock antes de buscar usuário. Preparação/finalização voltam na ordem usuário → recuperação → job. Toda autorização verifica estado, owner, versão e lease válida sob lock; stale owner não despacha/finaliza/renova.
- Polling interno sem sobreposição, concorrência local 1, intervalo base 1s após o ciclo; indisponibilidade usa backoff até 30s. Renovação preparatória a cada 10s. Até 3 preparações; retry seguro pré-despacho em 1/4s + jitter até 250ms. Crash em `leased` permite retomada após lease + backoff; aquisições esgotadas encerram sem SDK.
- Antes do marcador: verificar conta, e-mail, versão, consumo/revogação, digest e prazo restante **maior que 5s**. Persistir `dispatching`/deadline e **eliminar envelope antes do SDK**. Commit falho/incerto não autoriza rede. Depois do commit, conferir novamente prazo e cancelamento local; transporte limitado ao deadline persistido, no máximo 5s, com abort/sem redirects.
- `204` registra `accepted` (aceitação, não entrega). `401/403/422` são falha final. Timeout, abort, erro de conexão, `429`, `5xx` ou resposta inesperada são `unknown`. **Zero retries externos**, inclusive depois de reinício. Depois de `204`, até três tentativas de **escrita da finalização**, nunca novo envio; se impossível gravar, manutenção encerra `dispatching` vencido como `unknown`.
- Crash entre o marcador e a chamada pode resultar em nenhum e-mail. Crash após possível aceitação também não provoca reenvio. Essa escolha é intencional: **não há exactly-once nem garantia de entrega**.
- Alteração/reenvio cancela preparatórios; despacho já iniciado pode entregar link obsoleto/expirado posteriormente. A confirmação rejeita esse link. Nenhum lock de conta é mantido esperando rede para tentar impedir entrega tardia.

### Retenção, observabilidade e shutdown

Cada ciclo limpa lotes de até 50 candidatos por categoria, mesmo com despacho desabilitado/chaves ausentes. Envelope é removido ao despachar/cancelar/expirar/falhar; `dispatching` com deadline vencido vira `unknown`. Metadados de recuperação/job encerrados permanecem por 24h; exclusão revalida sob locks e respeita conclusão mais recente do job. Recuperações legadas são incluídas. Buckets só são removidos se **todas** as admissões forem estritamente anteriores à última hora, reavaliadas sob lock. Limpeza nunca define/renova validade.

`password_reset_queue` agrega backlog, idade máxima, chaves indisponíveis, expirados, indeterminados e falhas, no máximo uma vez/minuto por worker. Erros de banco/configuração e finalização têm eventos sanitizados; erros repetidos de polling são limitados. Monitorar também diagnósticos `payload_invalid` e aquisições com `leaseVersion > 1` no banco (incluem retries, não somente crashes), sem exportar linhas/envelopes. Alertar sobre qualquer adulteração, `unknown`, backlog próximo de 300s ou indisponibilidade de chave. Métricas agregadas são visibilidade operacional, não confirmação de entrega.

Nest habilita hooks SIGTERM/SIGINT. Worker para aquisição, devolve apenas lease preparatória com fencing e drena até 10s; aborta transporte pendente e nunca devolve `dispatching` a `pending`. Compose concede 20s ao backend. Transação de banco bloqueada não é magicamente cancelada pelo abort HTTP: se o processo for encerrado abruptamente, vale o protocolo persistente de recuperação. O worker não envia após observar shutdown.

## Verificação reproduzível

Na raiz:

```sh
npm --prefix api test -- --runInBand
npm --prefix api run test:e2e -- --runInBand --coverage=false
npm --prefix web test -- --runInBand
node --test scripts/dependency-security.test.cjs scripts/password-reset-config.test.cjs
npm --prefix api run build
npm --prefix web run build
npm --prefix api audit
npm --prefix web audit
git diff --check
```

Web mantém a convenção `npm ci --legacy-peer-deps` usada pelo CI/Docker; nenhum upgrade major Taiga foi feito. Warnings conhecidos de bundle não são falha de compilação.

O teste MySQL é opt-in, fixado em `127.0.0.1:13367`, schema `password_reset_test`, credencial **exclusivamente descartável** e sem leitura de `.env`. Ele recria somente esse schema-base: não aponte outros serviços para essa porta/banco. Para repetir, crie um container MySQL 8.0 novo, sem volume, com `MYSQL_DATABASE=password_reset_test`, `MYSQL_ROOT_PASSWORD=disposable-test-only`, bind `127.0.0.1:13367:3306`; então:

```sh
PASSWORD_RESET_MYSQL_TEST=1 npm --prefix api run test:e2e -- --runInBand --coverage=false --testPathPattern=password-reset
```

Remova apenas o container descartável após a execução. Sem opt-in, casos MySQL são explicitamente pulados, não apresentados como testes reais. Os demais e2e preexistentes usam mocks em diversas dependências; os 6 testes HTTP usam Nest/validação/rate limiter reais e serviço mock. Casos MySQL usam TypeORM/MySQL/bcrypt/JWT/AES-GCM reais e envio/auditoria externa simulados. Datas de negócio são controladas em testes de limites; leases continuam no relógio MySQL. Triggers e spies injetam falhas de cifragem/enqueue/finalização. Concorrência usa conexões/transações independentes; crashes são simulados por abandono de estado persistido e novas instâncias/conexões, não por SIGKILL ou falhas reais no provedor. O teste de dump é um snapshot SQL das duas tabelas de recuperação/fila, não um backup/binlog completo. Frontend usa componentes Taiga renderizados em jsdom e HTTP simulado, não um navegador real.

### Evidências TDD — baseline síncrono (histórico)

- RED inicial API: 2 suítes novas sem módulos, 179 testes existentes passando.
- RED JWT: `npm --prefix api test -- --runInBand --testPathPattern='password-reset|auth.service.spec'`: 2 falhas / 38 passados (payload sem versão e refresh antigo aceito).
- RED frontend: `npm --prefix web test -- --runInBand --testPathPatterns='esqueci-senha|redefinir-senha|auth.service.spec|error.interceptor.spec'`: 4 suítes falharam, 9 testes falharam / 20 passaram (tela antiga, redirecionamento, retry/alerta, componente ausente).
- RED collation no MySQL: 268/269 e2e passaram, caso de acento equivalente enviou 2 vezes em vez de 1. Corrigido usando bucket canônico da conta.
- RED subject inválido de refresh: 5 falhas / 42 passados. Corrigido antes da consulta TypeORM.
- Resultados finais devem ser conferidos no resumo da implementação; nenhum envio real, commit, push, PR ou deploy é parte desta fase.

### GREEN — baseline síncrono (histórico, anterior à fila)

| Comando na raiz | Resultado |
|---|---|
| `npm --prefix api test -- --runInBand` | 26 suítes, 247 testes passados |
| `PASSWORD_RESET_MYSQL_TEST=1 npm --prefix api run test:e2e -- --runInBand --coverage=false` | 10 suítes, 278 testes passados, incluindo 24 casos MySQL reais e 6 casos HTTP novos |
| `npm --prefix web test -- --runInBand` | 20 suítes, 128 testes passados |
| `node --test scripts/dependency-security.test.cjs scripts/password-reset-config.test.cjs` | 16 testes passados (12 preexistentes + 4 novos) |
| `npm --prefix api run build` / `npm --prefix web run build` | Sucesso; warning conhecido de orçamento do bundle Angular |
| `npm --prefix api audit --json` / `npm --prefix web audit --json` | Zero vulnerabilidades em cada projeto |
| As mesmas auditorias com `--omit=dev` | Zero vulnerabilidades em cada projeto |
| `git diff --check` | Sem erros de whitespace |

Configuração nginx do web validada com `nginx -t` em container isolado, sem portas expostas. Configurações do proxy têm testes estáticos e resolução de IP tem teste HTTP/Express real; não foi executado smoke test do proxy TLS implantado. Builds acima são das aplicações, não publicação de imagens.

## Manifesto do baseline síncrono (preexistente à fase assíncrona)

**API — alterados:**

- `api/src/modules/auth/auth.service.ts`, `api/src/modules/auth/auth.module.ts`.
- `api/src/modules/usuarios/usuarios.service.ts`, `api/src/modules/usuarios/entities/usuario.entity.ts`.
- `api/src/common/guards/jwt-auth.guard.ts`, `api/src/common/interceptors/logging.interceptor.ts`.
- `api/src/config/database.config.ts`, `api/src/data-source.ts`, `api/src/main.ts`.

**API — criados:**

- `api/src/config/http-security.ts`.
- `api/src/migrations/1798844400000-PasswordRecovery.ts`.
- Em `api/src/modules/auth/password-reset/`: `password-reset.controller.ts`, `password-reset.service.ts`, `password-reset.dto.ts`, `password-reset.entity.ts`, `password-reset.rules.ts`, `hostinger-mail.service.ts`.

**Web — alterados:**

- `web/src/app/app.routes.ts`, `web/src/app/core/services/auth.service.ts`, `web/src/app/core/interceptors/error.interceptor.ts`.
- `web/src/app/pages/esqueci-senha/esqueci-senha.ts`, `.html`, `.scss`; `web/src/index.html`.

**Web — criados:** `web/src/app/pages/redefinir-senha/redefinir-senha.ts` e `.html`.

**Testes alterados:** `api/src/modules/auth/auth.service.spec.ts`, `api/src/modules/usuarios/usuarios.service.spec.ts`, `web/src/app/core/services/auth.service.spec.ts`, `web/src/app/core/interceptors/error.interceptor.spec.ts`.

**Testes criados:**

- `api/src/common/guards/jwt-auth.guard.spec.ts`, `api/src/common/interceptors/logging.interceptor.spec.ts`.
- `api/src/config/http-security.spec.ts`, `api/src/config/password-reset-config.spec.ts`.
- `api/src/modules/auth/password-reset/password-reset.rules.spec.ts`, `api/src/modules/auth/password-reset/hostinger-mail.service.spec.ts`.
- `api/test/password-reset.http.e2e-spec.ts`, `api/test/password-reset.mysql.e2e-spec.ts`.
- `web/src/app/pages/esqueci-senha/esqueci-senha.spec.ts`, `web/src/app/pages/redefinir-senha/redefinir-senha.spec.ts`.
- `scripts/password-reset-config.test.cjs`.

**Configuração/documentação:** `.env.example`, `api/.env.example`, `docker-compose.yml`, `api/docker-compose.prod.yml`, `nginx/conf.d/default.conf`, `nginx/conf.d/http-only.conf`, `nginx/conf.d/http-only.conf.template`, `web/nginx.conf` e este documento.

**Preexistentes preservados, não atribuídos à feature:** os quatro manifests/lockfiles de API/web; as alterações de upload em `api/src/modules/movimentacoes/dto/analisar-comprovante-request.dto.ts`, `api/src/modules/movimentacoes/movimentacoes.controller.ts`, `api/test/movimentacoes.e2e-spec.ts`; e `scripts/dependency-security.test.cjs`. Branch continua `main`, HEAD `4c67f6a8bf1ff3ef614a93d0526a7b41480b029a`.

## Fase 2 — evidências e manifesto do envio assíncrono

### Red → green executado nesta fase

1. API: 2 suítes novas falharam ao compilar (cipher ausente/contrato de serviço ainda síncrono), com 76 testes existentes passando. Web: 1 falha de microcopy, 1 passado. Implementados cipher e enqueue transacional; 18 novos testes passaram, worker ainda ausente (RED separado).
2. Worker implementado: API completa 272 testes; 30 e2e de recuperação incluindo 24 MySQL; web alterado 2 testes, todos verdes.
3. Matriz ampliada: 71 unitários focados e 61 e2e de recuperação verdes. Configuração: 2 falhas esperadas (keyring/grace period ausentes), corrigidas nos exemplos/Compose.
4. Shutdown durante claim: 1 falha / 8 passados; reproduzida ausência de liberação preparatória e corrigida com retry persistente fenced. Dois novos casos MySQL revelaram vazamento de flag de configuração entre fixtures; cada fixture agora explicita habilitação.
5. CHECK do envelope: RED MySQL demonstrou que remover ciphertext preparatório era aceito. A migração nova agora rejeita envelope incompleto e retenção de envelope pós-preparação; suite completa verde abaixo.

### Resultado final executado (2026-09-09)

| Verificação | Resultado |
|---|---|
| `npm --prefix api test -- --runInBand` | **29 suítes / 285 testes passados**, zero skipped |
| `PASSWORD_RESET_MYSQL_TEST=1 npm --prefix api run test:e2e -- --runInBand --coverage=false` | **10 suítes / 314 testes passados**, incluindo **60 MySQL reais**, zero skipped |
| `npm --prefix web test -- --runInBand` | **20 suítes / 128 testes passados** |
| Scripts dependency-security + password-reset-config | **17 testes passados** |
| Builds API/web | Sucesso; Angular mantém warning de bundle inicial 836,74 kB / orçamento 500 kB |
| Auditorias API/web completas e `--omit=dev` | **0 vulnerabilidades nas quatro auditorias**, sem audit fix/alteração de dependências |
| `git diff --check` | Sem erros |

Cobertura adicionada: request real sem espera/rede, atomicidade e rollback preservando admissão/link anterior, configuração uniforme, lease/renew/fencing/SKIP LOCKED, crashes antes/depois do marcador/204, retry apenas de escrita, três preparações/backoff, prazo original e janela de transporte, tamper/troca de envelopes/rotação, cancelamento e rollback de alterações de conta, retenção sob locks, migração aditiva `up → down → up`, serializer/abort/outcomes SDK, shutdown e polling. As regressões de collation, cooldown, uso único, senha legada, JWT/refresh e proteções do frontend permanecem executadas.

**Arquivos criados nesta fase:**

- [Migração aditiva](../api/src/migrations/1798930800000-PasswordResetDelivery.ts).
- [Entidade da fila](../api/src/modules/auth/password-reset/password-reset-delivery.entity.ts).
- [Store MySQL](../api/src/modules/auth/password-reset/password-reset-delivery.store.ts).
- [Cipher](../api/src/modules/auth/password-reset/password-reset-payload.cipher.ts) e [testes crypto](../api/src/modules/auth/password-reset/password-reset-payload.cipher.spec.ts).
- [Worker](../api/src/modules/auth/password-reset/password-reset-delivery.worker.ts) e [testes de lifecycle/coordenação](../api/src/modules/auth/password-reset/password-reset-delivery.worker.spec.ts).
- [Testes unitários do serviço real](../api/src/modules/auth/password-reset/password-reset.service.spec.ts).

**Arquivos atualizados incrementalmente nesta fase:**

- [Serviço de recuperação e invalidação compartilhada](../api/src/modules/auth/password-reset/password-reset.service.ts).
- [Adapter Hostinger](../api/src/modules/auth/password-reset/hostinger-mail.service.ts) e [testes](../api/src/modules/auth/password-reset/hostinger-mail.service.spec.ts).
- [AuthModule](../api/src/modules/auth/auth.module.ts), [bootstrap](../api/src/main.ts), [DatabaseConfig](../api/src/config/database.config.ts) e [teste de registro](../api/src/config/password-reset-config.spec.ts).
- [Regressões MySQL](../api/test/password-reset.mysql.e2e-spec.ts) e [mock transacional de usuários](../api/src/modules/usuarios/usuarios.service.spec.ts). A implementação de `UsuariosService` foi lida e preservada; seu helper compartilhado agora cancela jobs na mesma transação.
- [Microcopy](../web/src/app/pages/esqueci-senha/esqueci-senha.html) e [teste de tela](../web/src/app/pages/esqueci-senha/esqueci-senha.spec.ts).
- [Exemplo raiz](../.env.example), [exemplo API](../api/.env.example), [Compose raiz](../docker-compose.yml), [Compose API](../api/docker-compose.prod.yml), [testes estáticos](../scripts/password-reset-config.test.cjs) e este documento.

Migração-base, DTOs/regras/controller, entidades de recuperação/usuário, lógica JWT/refresh, remediação de dependências e upload preexistentes preservados. Nenhuma dependência adicionada. Sem envio real, banco de produção, leitura de `.env` real, commit, push, PR ou deploy. Testes usaram apenas o container descartável `gf-password-reset-async-test-249dd81c`, com label `purpose=password-reset-async-tests`, sem volume persistente de aplicação. Não foi validada entrega real, smoke TLS implantado ou injeção de crash do sistema operacional.

## Fase 3 — revisão independente (2026-09-09)

**Registro histórico anterior ao retorno autorizado à Fase 2 abaixo.** O bloqueio e as evidências originais são preservados; as correções posteriores não equivalem a aprovação independente do gate.

**Gate BLOQUEADO: devolver B1 à Fase 2.** A suíte existente verde não cobre a disputa descrita abaixo. Não foram alteradas implementações, migrações, dependências, DTOs ou uploads por esta revisão. As decisões aprovadas de AES-GCM/chave exclusiva, prazo original, entrega tardia inválida, não repetição externa após resultado incerto e ausência de exactly-once/tempo constante permanecem intactas.

Baseline inspecionado: branch `main`, HEAD `4c67f6a8bf1ff3ef614a93d0526a7b41480b029a`, alterações não commitadas. Revisados request/confirm, auth/usuarios/JWT, migrações base e aditiva, cipher/store/worker/adapter, frontend/interceptadores, configurações de proxy/logging e manifests/lockfiles relevantes. Releituras confirmaram a lógica atual de autenticação, mutação de credenciais e admissão.

### B1 — bloqueante: deadlock em bucket de destinatário já existente

Local: [admissão e lock do bucket](../api/src/modules/auth/password-reset/password-reset.service.ts#L67-L78).

- **Causa:** `INSERT IGNORE` sobre chave duplicada adquire lock compartilhado InnoDB. Duas transações podem concluir esse insert antes de ambas tentarem promovê-lo a exclusivo no `SELECT ... FOR UPDATE`. A ordem limite → usuário → recuperação → job não impede esse ciclo dentro da mesma linha.
- **Evidência:** serviço compilado real, TypeORM e MySQL descartável; criar previamente o bucket de um destinatário inexistente, chamar `request` duas vezes em transações independentes e usar uma barreira após os dois inserts reais, antes do próximo select. Resultado: dois inserts concluídos, um retorno neutro equivalente a **202**, uma exceção **503**, driver **`ER_LOCK_DEADLOCK`**. Nenhum provedor participa. O teste comprova a intercalação, não sua frequência em produção.
- **Impacto:** concorrência normal de solicitações, inclusive suprimidas pelo cooldown, produz indisponibilidade evitável em banco saudável. Não foi observado bypass de limite, emissão duplicada ou perda de atomicidade; a transação vítima é revertida.
- **Correção solicitada à Fase 2:** eliminar a promoção concorrente compartilhado → exclusivo na criação/aquisição do bucket, preservando admissões existentes, ordem de locks e enqueue atômico. Não resolver com retry cego da transação: commit de resultado incerto continua sem repetição automática.
- **Regressão necessária:** bucket já existente; duas ou mais conexões sincronizadas nessa intercalação; ambas respostas neutras, nenhuma falha de driver, contagem de admissões correta e link/job anterior preservado em supressão. Repetir também bucket inicialmente ausente e admissões elegíveis. O teste existente de dois requests sobre bucket inicialmente ausente não exercita essa disputa específica.

### D1 — desejável: bcrypt antes de rejeitar token inexistente

Local: [hash antes da busca do digest](../api/src/modules/auth/password-reset/password-reset.service.ts#L126-L134).

Sondagem do serviço real com bcrypt nativo e lookup simulado sempre ausente: **20 tokens aleatórios sintaticamente válidos → 20 hashes → 20 consultas → 20 respostas 400**; aproximadamente **1.460 ms de CPU agregada / 371 ms de parede** na primeira execução (Node 24.9.0). A consulta de inexistência ocorre depois do trabalho caro. Não se trata de benchmark HTTP: o throttler não foi exercitado nessa sondagem e não foi demonstrada indisponibilidade sob o limite de 5/min/IP.

Recomendação: buscar e rejeitar estados definitivamente inválidos antes do bcrypt, mantendo bcrypt fora da transação e a revalidação completa sob locks antes de consumir o link. Adicionar regressões que comprovem ausência de hash para tokens inexistentes/expirados/consumidos/revogados. **Risco de amplificação de CPU identificado, não abrangido pelas decisões arquiteturais aceitas:** se mantido, confirmar explicitamente com o usuário o tratamento/aceite desse risco residual; não confundir ausência de tempo constante com necessidade de executar bcrypt em token inexistente.

### D2 — desejável: LIMIT limita exclusões, não o trabalho das buscas de retenção

Locais: [retenção de recuperações](../api/src/modules/auth/password-reset/password-reset-delivery.store.ts#L371-L374) e [retenção de buckets](../api/src/modules/auth/password-reset/password-reset-delivery.store.ts#L399-L402).

`EXPLAIN ANALYZE` no MySQL descartável, com histórico sintético ainda dentro da retenção:

| Consulta | Trabalho observado | Duração local |
|---|---|---|
| `COALESCE(consumedAt, revokedAt, expiresAt)` | scan do índice primário, **20.000 linhas**, 0 candidatas | **12,2 ms** |
| Expiração via expressão JSON de `admissions` | table scan, **20.002 linhas**, 0 candidatas | **12,1 ms** |

Essas buscas participam do ciclo do worker, cujo intervalo base é 1s. O lote de 50 não torna a descoberta de candidatos limitada a 50 leituras. Não foi demonstrado gargalo na carga real; não houve otimização/migração especulativa. Acompanhar duração/linhas examinadas e dimensionar uma busca indexável se o volume justificar. O plano de cancelamento por usuário observado usa `IDX_reset_usuario_revoked` seguido de `UQ_delivery_reset`; não foi encontrada inversão de locks nesse plano.

### Validação efetivamente executada

| Verificação independente | Resultado |
|---|---|
| API unitária | 29 suítes / **285 passados** |
| E2E completa com opt-in MySQL | 10 suítes / **314 passados**, incluindo **60 MySQL reais** |
| Web | 20 suítes / **128 passados** |
| Scripts de dependências/configuração, execução explícita com reporter spec | **17 passados** |
| Total da suíte existente | **744 passados**, zero skipped |
| Builds API e web | Sucesso; warning Angular de bundle inicial **836,74 kB / 500 kB** |
| Auditorias API/web completas e `--omit=dev` | **0 vulnerabilidades nas quatro** |
| Diff whitespace | Sem erros |

Reexecução final dos dois builds e de todos os **744 testes** também passou. Fingerprints agregados de API/src, API/test e web/src, antes e depois dessa reexecução, foram idênticos: `829a627856d3d6109c1d0b3bba5681be29cd1c5ba2bacf805e48b3b456735567`.

Sondagens adversariais são evidência adicional, não testes de regressão incorporados nem aprovação do comportamento B1. Uma repetição do script de sondagem parou ao reinserir a fixture já existente (chave primária 99001); os planos acima foram obtidos depois por consultas somente leitura. Essa falha de fixture não foi contabilizada como falha/passagem de suíte.

As mudanças de lockfile inspecionadas preservam as majors remediadas; SDK Hostinger 1.19.1 fixado; nenhum host de resolução fora de `registry.npmjs.org`. Os engines declarados dos pacotes alterados não introduzem exigência superior ao mínimo Node declarado pela API. Execução local em **Node 24.9.0 / npm 11.6.0**, não uma matriz de runtimes nem instalação limpa adicional. Web conserva `--legacy-peer-deps` para instalação.

### Garantias verificadas e limites operacionais

- Testes reais de MySQL/crypto cobrem enqueue atômico e rollback, SHA-256/AAD, alteração/troca de envelope, rotação, fencing/SKIP LOCKED, revogação/versionamento JWT, uso único, TTL, cancelamento com exclusão do envelope, retries preparatórios limitados, marcador durável antes da rede, crashes simulados e retenção. O request real termina enquanto o provedor simulado permanece bloqueado: comprova desacoplamento, não equivalência temporal entre contas.
- Erros SDK são sanitizados, logging SQL está desabilitado, não há segredo da fila no Angular. Testes frontend cobrem fragmento em memória, remoção da URL, dois campos de senha/Taiga UI, rotas públicas e respostas antigas de refresh. Não houve navegador real, envio Hostinger real, falha real de rede externa ou SIGKILL.
- Manter MySQL 8.0.16+, relógios API/MySQL sincronizados, keyring separado de backups e rotação em todas as instâncias. Exclusão de envelope não promete apagar binlogs/backups.
- Na entrega: aplicar migrações antes do código, parar emissores síncronos/instâncias antigas, manter validação de versão no rollback, configurar proxy confiável restrito e origem pública HTTPS. Validar CORS/topologia TLS e limites via ingresso e acesso direto; não escalar o throttler local sem limite agregado. Estes pré-requisitos não substituem a correção B1.
- Container exclusivo desta revisão: `gf-password-reset-quality-249dd81c`, label `purpose=password-reset-quality`, bind `127.0.0.1:13367`, sem volume de aplicação. Container e volume descartável **removidos ao final**, após conferir nome, label e ID; remoção com exit 0. Nenhum banco de produção, segredo real, envio real, commit, push, PR, deploy ou alteração alheia foi autorizado/executado pela revisão.

## Retorno à Fase 2 — B1/D1 autorizados (2026-09-09)

**Implementação corrigida e validada; encaminhar para nova Fase 3 independente.** Não declarar o gate aprovado nesta fase. Baseline reconfirmado: `main`, HEAD `4c67f6a8bf1ff3ef614a93d0526a7b41480b029a`, sem commit/publicação. D2 permanece acompanhamento, sem otimização de scans, migração, dependência ou mudança arquitetural.

### Correções e regressões

- **B1:** substituir `orIgnore()` por `orUpdate(['emailDigest'])` no insert do bucket. O upsert adquire lock exclusivo sem zerar admissões; mantém a transação admissão → usuário → revogação → emissão → enqueue e seu rollback. Teste adicional de resultado incerto de commit comprova uma única invocação de transação/enqueue, sem retry.
- **D1:** lookup e rejeição preliminar de inexistência/consumo/revogação/expiração antes de bcrypt; mensagem inválida preservada. Falha de lookup não calcula hash e retorna `503` sanitizado. A revalidação completa sob locks permanece depois do hash.
- **Seis casos B1 MySQL:** bucket existente de inexistente, cooldown, reenvio elegível, cota de três admissões, bucket inicialmente ausente e bucket criado antes do signup. Nos casos com conta, variação acentuada resolve pela collation real para o mesmo bucket. Verificam respostas neutras, ausência de erro do driver, admissões exatas, preservação integral do link/job em supressão e apenas uma recuperação/job pendente na emissão.
- A barreira segura o primeiro INSERT real após a execução; aguarda o segundo INSERT concluir (implementação antiga) **ou** observa a segunda conexão esperando lock real em `performance_schema.data_lock_waits/data_locks`, antes de liberar. Dois `CONNECTION_ID()` distintos são conferidos. Não há sleep de duração arbitrária ou mock de resultado SQL. A observação é limitada a 5s e os recursos são liberados em `finally`. Requer `performance_schema` habilitado no MySQL descartável.
- **Seis casos D1 MySQL/bcrypt reais:** após a consulta preliminar, suspender o retorno de bcrypt nativo e persistir expiração/consumo/revogação/mudança de versão/inativação/exclusão antes de liberar a confirmação. Todos rejeitam sem sobrescrever senha/versão ou consumir indevidamente. Teste unitário separado confere explicitamente a ordem dos locks usuário → digest e hash fora da transação.

### RED → GREEN observado

1. **RED unitário D1:** 6 falhas / 3 passados. Vinte tokens inexistentes produziam 20 chamadas de hash; expirados/consumidos/revogados também não eram rejeitados preliminarmente. O teste de ordem detectou hash antes do lookup.
2. **Ajustes do harness, não falhas atribuídas à aplicação:** primeira execução não reconheceu o espaço duplo de `INSERT IGNORE` gerado pelo TypeORM; depois, o controle de bucket ausente esgotou o prazo de observação ao usar identificação do bloqueador/snapshot de transações. Sondagem MySQL mostrou lock implícito materializado com `BLOCKING_THREAD_ID` do solicitante. A barreira final consulta o solicitante e o lock da tabela diretamente.
3. **RED MySQL com harness final:** **5 falhas `ER_LOCK_DEADLOCK` / 7 passados**, com 60 casos fora do filtro. Os cinco buckets existentes produziram deadlock; o bucket ausente e as seis revalidações D1 passaram (caracterização da proteção TOCTOU preexistente).
4. **GREEN focado:** 10 unitários do serviço e **72 MySQL reais** passados. Três execuções adicionais independentes do filtro B1: **6/6 passados em cada**, 66 casos fora do filtro em cada execução. Essas repetições não são somadas ao total de testes distintos.

### Validação completa após as correções

| Verificação | Resultado |
|---|---|
| API unitária | **29 suítes / 292 passados** |
| E2E completa com opt-in MySQL | **10 suítes / 326 passados**, incluindo **72 MySQL reais** |
| Web | **20 suítes / 128 passados** |
| Scripts dependency-security + password-reset-config | **17 passados** |
| Total distinto | **763 passados, zero skipped** nas suítes completas; **19 testes adicionados** (7 unitários + 12 MySQL) |
| Builds API/web | Sucesso; warning Angular preexistente **836,74 kB / 500 kB** |
| Auditorias API/web completas e `--omit=dev` | **0 vulnerabilidades nas quatro**, sem alterações de dependências |
| `git diff --check` | Sem erros |

Os **254 e2e restantes não são apresentados como integração MySQL real**: incluem os seis HTTP com serviço simulado e os testes legados com mocks. Envio Hostinger/log externo/espaço pessoal no teste de signup são simulados; TypeORM, locks, transações, migrações, collation, AES-GCM, bcrypt e JWT dos casos MySQL usam implementações reais. Frontend permanece jsdom/HTTP simulado, não navegador real. Não houve e-mail real, uso de `.env` real, banco de produção, deploy, commit, push ou PR.

### Arquivos desta correção e preservação

Somente quatro arquivos alterados em relação ao início deste retorno:

- [Serviço](../api/src/modules/auth/password-reset/password-reset.service.ts).
- [Testes unitários](../api/src/modules/auth/password-reset/password-reset.service.spec.ts).
- [Testes MySQL](../api/test/password-reset.mysql.e2e-spec.ts).
- Este documento.

Snapshot SHA-256 de **419 arquivos** no início permite conferir a preservação das alterações recentes e dos arquivos preexistentes; a conferência final encontrou somente os quatro arquivos acima divergentes. Configurações, serviços de usuário/auth, workers/store/cipher, migrações, JWT/logging, DTOs, dependências/lockfiles e upload não foram restaurados nem modificados neste retorno.

Ambiente: MySQL **8.0.46**, container próprio `gf-password-reset-b1d1-249dd81c`, ID com prefixo `b8f819ea3481`, label `purpose=password-reset-b1d1`, bind `127.0.0.1:13367`, credencial/schema exclusivamente descartáveis conforme procedimento acima. Nenhum volume de aplicação ou container dev foi utilizado. Container/volume descartável removidos ao final com exit 0 após conferir ID/nome/label; ausência confirmada. Os containers dev MySQL/MongoDB permaneceram ativos e intocados.

**Pendências/riscos:** nova avaliação independente de B1/D1 ainda necessária; não foi identificado novo bloqueio técnico nas verificações desta implementação. A mudança não promete ausência de qualquer deadlock futuro nem tempo constante. D2 não é gargalo comprovado e permanece fora do escopo. Entrega tardia de link inválido, não repetição após resultado externo incerto e ausência de exactly-once continuam riscos aprovados, não novos achados. Mantêm-se os pré-requisitos operacionais de produção já documentados.

## Fase 3 — revisão independente final de B1/D1 (2026-09-09)

**Gate APROVADO — nenhum bloqueante pendente no escopo revisado.** Este registro sucede o bloqueio histórico e o retorno à Fase 2 acima, sem apagar suas evidências. Não constitui deploy nem dispensa os pré-requisitos operacionais.

Baseline: `main`, HEAD `4c67f6a8bf1ff3ef614a93d0526a7b41480b029a`. Relidos os critérios/ADRs aprovados, skills de revisão/segurança/performance, diff tracked (incluindo manifests/lockfiles) e arquivos novos relevantes. Inspecionados serviço/testes B1/D1 e suas integrações com auth/usuários/JWT, controller/DTOs, migrações, store/cipher/worker/SDK, frontend e proteções de HTTP/logging. Dependências e upload preexistentes não foram atribuídos às correções nem alterados.

### Achados classificados e decisão

- **B1 — bloqueante anterior, resolvido:** o [upsert do bucket](../api/src/modules/auth/password-reset/password-reset.service.ts#L67-L83) atualiza somente `emailDigest`, não substitui `admissions`. Elimina a promoção compartilhado → exclusivo do antigo `INSERT IGNORE`, sem adicionar retry de transação. Mantém ordem limite → usuário → recuperações → jobs e enqueue na mesma transação. A [barreira MySQL](../api/test/password-reset.mysql.e2e-spec.ts#L78-L173) intercepta a execução real, observa espera em `performance_schema` em conexões distintas e libera os concorrentes; não simula resultado SQL. Os seis cenários passaram na suíte completa e em **três repetições adicionais de 6/6**: inexistente com bucket existente, cooldown, reenvio elegível, cota, bucket ausente e bucket anterior ao signup. Asserções verificam admissões exatas, collation acentuada da conta e preservação integral de recuperações/jobs quando suprimidos. Isso comprova esses interleavings, não ausência universal de deadlocks.
- **D1 — desejável anterior, resolvido:** a [pré-validação](../api/src/modules/auth/password-reset/password-reset.service.ts#L134-L151) rejeita inexistência, consumo, revogação e expiração antes de bcrypt. O hash permanece fora da transação; [releitura e autorização sob locks](../api/src/modules/auth/password-reset/password-reset.service.ts#L153-L180) continuam obrigatórias. Unitários verificam ausência de hash para inválidos, sanitização de falha de lookup e ordem das chamadas. Os [seis casos TOCTOU MySQL/bcrypt](../api/test/password-reset.mysql.e2e-spec.ts#L175-L207) passaram na suíte completa e em repetição focada **6/6**: expiração, consumo, revogação, versão, inativação e exclusão da recuperação entre lookup e locks. Senha/versão/consumo não são sobrescritos indevidamente. Mocks comprovam chamadas/ramificações, **não locks nem atomicidade**; estas evidências vêm dos testes MySQL.
- **D2 — desejável, acompanhamento mantido:** scans de retenção continuam sujeitos ao volume. Não foi repetido o benchmark histórico de 20 mil linhas/~12 ms, nem demonstrado gargalo de produção nesta revisão. Acompanhar duração e linhas examinadas; sem otimização especulativa ou novo bloqueio.
- **Novos bloqueantes/riscos arquiteturais:** nenhum identificado no escopo inspecionado. Entrega tardia inválida, não repetição externa de resultado incerto, ausência de exactly-once e ausência de tempo constante permanecem decisões aprovadas, não reabertas.

### Validação executada nesta revisão, não apenas herdada da Fase 2

| Comando na raiz | Resultado verificado |
|---|---|
| `npm --prefix api test -- --runInBand` | exit 0; **29 suítes / 292 passados** |
| `PASSWORD_RESET_MYSQL_TEST=1 npm --prefix api run test:e2e -- --runInBand --coverage=false` | exit 0; **10 suítes / 326 passados**, incluindo **72 MySQL reais** |
| `npm --prefix web test -- --runInBand` | exit 0; **20 suítes / 128 passados** |
| `node --test --test-reporter=spec scripts/dependency-security.test.cjs scripts/password-reset-config.test.cjs` | exit 0; **17 passados** |
| Total distinto das suítes completas | **763 passados, zero skipped** |
| `PASSWORD_RESET_MYSQL_TEST=1 npm --prefix api run test:e2e -- --runInBand --coverage=false --testPathPattern=password-reset.mysql --testNamePattern=B1` | **3 execuções**, exit 0 em todas; **6 passados / 66 fora do filtro** em cada |
| Mesmo comando focado com `--testNamePattern=D1` | exit 0; **6 passados / 66 fora do filtro** |
| `npm --prefix api run build` e `npm --prefix web run build` | Ambos exit 0; warning Angular conhecido: **836,74 kB / orçamento 500 kB** |
| `npm --prefix api audit --json` e `npm --prefix web audit --json`, também ambos com `--omit=dev` | Quatro exit 0; **zero vulnerabilidades em cada auditoria** |
| `git diff --check` e checagem individual dos 31 arquivos untracked | Sem diagnósticos de whitespace; no-index retorna 1 pela diferença contra `/dev/null`, não por falha de teste |

As repetições focadas não são somadas aos 763 testes distintos. Os outros **254 e2e não são apresentados como integração MySQL real**. Foram reexecutadas as regressões de atomicidade/rollback (emissão, enqueue, senha/consumo/versão e cancelamento), TTL na fronteira de 300s, uso único, revogação/JWT/refresh/legado, limites/collation, leases/fencing/SKIP LOCKED, adulteração/rotação, marcador durável, finalização sem replay, retenção e frontend. Diagnósticos do editor nos três arquivos de implementação/testes B1/D1: nenhum erro.

Ambiente verificado: **Node 24.9.0, npm 11.6.0, MySQL 8.0.46, `performance_schema=1`**. A inicialização do container e uma consulta auxiliar sem senha precisaram de nova execução; não foram contabilizadas como testes da aplicação. Os resultados acima foram conferidos nos logs efetivos após readiness, não inferidos de comandos planejados. Não houve instalação limpa adicional, matriz de runtimes, lint global ou builds/publicação de imagens Docker.

### Preservação, limpeza e limites do gate

Snapshot SHA-256 de **419 arquivos tracked/untracked não ignorados**, incluindo os dois exemplos de ambiente e excluindo ambientes reais: antes deste registro, **zero alterações/adições/exclusões** em relação ao início da revisão. A única edição desta Fase 3 é o acréscimo desta seção a este documento; implementações, testes, dependências, configurações e alterações do usuário foram preservados. Nenhuma correção de código ou refatoração foi necessária nesta revisão.

Container exclusivo `gf-password-reset-final-249dd81`, ID `d1d2c2683a174d93ca4c7a9a63645751913695597ac4047be98964adbef3753f`, label `purpose=password-reset-final`, bind `127.0.0.1:13367`. Nome/ID/label/porta/volume anônimo foram conferidos antes de `docker rm -fv`; container e seu volume descartável foram removidos e sua ausência confirmada. MySQL/MongoDB de desenvolvimento permaneceram ativos e intocados.

Envio/auditoria externa são simulados; frontend usa jsdom/HTTP simulado. Crashes são abandono de estados persistidos, não SIGKILL. Sem envio Hostinger real, teste em navegador, smoke TLS implantado, benchmark de produção, acesso ao banco de produção ou leitura de ambiente/segredo real. Auditorias sem CVEs reportados não provam ausência de vulnerabilidades desconhecidas.

Na entrega, continuam obrigatórios: MySQL compatível e relógios sincronizados; migrações antes do código e interrupção de emissores/instâncias antigos; proteção de versão JWT no rollback; keyring separado dos backups e rotação coordenada; origem HTTPS/proxy confiável restrito; verificação de CORS/TLS e limites pelo ingresso/acesso direto; limite IP agregado antes de escalar horizontalmente. Nenhum commit, push, PR ou deploy foi realizado.

## Fase 4 — preparação da entrega (2026-09-09)

O gate funcional independente acima permanece **APROVADO**. Nesta fase, somente documentação foi editada; implementação, migrações, testes, dependências e configurações aprovados foram preservados. Publicação para revisão não autoriza merge ou deploy. Há uma **pendência de lint** descrita abaixo; manter o PR em draft até seu tratamento na fase de Qualidade.

### Escopo de versionamento e verificações pré-commit

- As remediações autorizadas incluem os manifests/lockfiles API/web e [regressões offline](../scripts/dependency-security.test.cjs): Multer 2.3.0, mysql2 3.24.4, fast-uri 3.1.7, browserslist/baseline-browser-mapping e transitivas, mantendo o SDK Hostinger 1.19.1. O manifesto/lock da API contém tanto a remediação quanto o SDK; ambos pertencem ao escopo autorizado e serão versionados juntos, sem reconstruir artificialmente versões intermediárias do lockfile.
- O diff de [MovimentacoesController](../api/src/modules/movimentacoes/movimentacoes.controller.ts) limita `fieldArrayIndexLimit` a zero nos dois uploads, com referência a GHSA-535w-7cp7-47q4; os [testes multipart](../api/test/movimentacoes.e2e-spec.ts) verificam essa proteção e compatibilidade. São parte da remediação, não mudanças alheias de negócio.
- A alteração de [AnalisarComprovanteRequestDto](../api/src/modules/movimentacoes/dto/analisar-comprovante-request.dto.ts) é exclusivamente uma quebra de linha final. Sem atribuição comprovada, fica preservada no working tree e **fora dos commits**.
- Nenhum código foi corrigido nesta fase. Não executar formatadores com escrita para ocultar a pendência de lint nem diminuir regras/gates.

| Reexecução local nesta fase | Resultado |
|---|---|
| API unitária | exit 0; **292 passados**, 29 suítes |
| API e2e, sem opt-in MySQL | exit 0; **254 passados / 72 skipped**, 9 suítes passadas / 1 skipped |
| Web | exit 0; **128 passados**, 20 suítes |
| Scripts dependency-security + password-reset-config | exit 0; **17 passados**, zero skipped |
| Total executado nesta fase | **691 passados / 72 skipped**; os **763/763**, incluindo MySQL real, são evidência independente da Fase 3, não uma nova execução MySQL |
| Builds API/web | exit 0 em ambos; warning Angular conhecido **836,74 kB / 500 kB** |
| Audits completos e produção de API/web | quatro exit 0; **0 vulnerabilidades reportadas** |
| ESLint API, sem escrita | exit 1; **871 erros**: 855 `prettier/prettier`, 16 `@typescript-eslint/no-unused-vars`; zero warnings |

Lint executado diretamente com `cd api && ./node_modules/.bin/eslint '{src,apps,libs,test}/**/*.ts' --no-fix`, pois `npm run lint` inclui `--fix`. Há diagnósticos tanto em arquivos legados quanto em arquivos da feature; não atribuir todos ao baseline. A Fase 3 explicitamente não executou lint global. O web não declara script de lint. Encaminhar o resultado para Qualidade antes de marcar o PR pronto; qualquer correção de código requer testes e nova revisão. Instalações limpas, builds de imagens e validações operacionais não foram repetidos nesta fase.

### Bloqueio operacional antes de merge

O [workflow Deploy](../.github/workflows/deploy.yml) atual é disparado por **push em `main`** ou `workflow_dispatch` e termina em SSH/produção. Ele não aplica migrações, não executa toda a matriz acima e contém checkout forçado e `docker system prune -a --volumes`. **Não usar esse fluxo para ativar esta entrega.** Não executar `make prod-rebuild` como substituto da sequência de migração.

Antes de qualquer merge, o responsável deve bloquear o deploy automático desse workflow no GitHub e confirmar que não há execução pendente, ou preparar/revisar um pipeline que imponha a migração e a janela operacional. Não confiar que o nome `environment: production` implique aprovação obrigatória: a proteção deve ser verificada no GitHub. Nenhuma configuração remota foi alterada por esta entrega. Push da branch de feature e abertura de PR não correspondem ao gatilho `push/main` desse workflow; não fazer merge automático.

### Ativação manual coordenada — somente instruções, não executada

Procedimento para o [Compose da raiz](../docker-compose.yml), a partir de um checkout limpo do **SHA aprovado** no host de destino, nunca deste working tree com alteração preservada. O [Compose API alternativo](../api/docker-compose.prod.yml) é outra topologia; não combinar os dois. Primeiro ensaiar em homologação. Não executar os comandos abaixo sem autorização operacional separada.

1. Confirmar backup restaurável do MySQL, imagens/configuração anteriores preservadas e plano de falha parcial de DDL. Verificar MySQL 8.0.16+, relógios UTC sincronizados, volumes existentes e histórico de migrações. Não imprimir ambiente, tokens, keyring ou dumps; não usar `compose config` com segredos reais.
2. Provisionar no cofre/ambiente backend os sete parâmetros descritos em **Configuração e ativação**. Usar exatamente `PASSWORD_RESET_DELIVERY_ENABLED=false` inicialmente; o worker compara a string `false`. Definir também JWTs fortes, `CORS_ORIGIN` público HTTPS e credenciais de banco da topologia. Keyring exclusivo, 32 bytes/base64 canônico por chave, chave ativa presente. Não usar `MAIL_FROM`, chave de exemplo, segredo JWT como chave da fila ou configuração no Angular.
3. Construir as imagens novas **sem iniciar os serviços**:

	```sh
	docker compose -f docker-compose.yml build api web nginx
	```

4. Bloquear o ingresso e o acesso externo direto à API no firewall/LB. Parar nginx/web/API desta topologia, preservando bancos e volumes, e confirmar que **todas** as instâncias/emissores antigos em outros hosts também pararam:

	```sh
	docker compose -f docker-compose.yml stop nginx web api
	```

5. Com MySQL existente saudável, conferir as migrações usando a imagem nova, sem bootstrap Nest/worker:

	```sh
	docker compose -f docker-compose.yml run --rm --no-deps api ./node_modules/.bin/typeorm migration:show -d dist/data-source.js
	```

	O CLI usa o mesmo registro explícito de `DatabaseConfig`. Para esta entrega, as pendentes esperadas são `PasswordRecovery1798844400000` e depois `PasswordResetDelivery1798930800000`; se a base já foi aplicada, somente a fila. **Se houver migrações anteriores pendentes, schema divergente ou nomes/timestamps diferentes, parar e reconciliar o histórico**: `migration:run:prod` aplica todas as pendentes, não apenas a fila. Não renomear, apagar, executar novamente manualmente ou marcar migrations como aplicadas para contornar divergências.

6. Somente após aprovação dessa lista, aplicar e conferir o histórico novamente:

	```sh
	docker compose -f docker-compose.yml run --rm --no-deps api npm run migration:run:prod
	docker compose -f docker-compose.yml run --rm --no-deps api ./node_modules/.bin/typeorm migration:show -d dist/data-source.js
	```

	Confirmar coluna `usuarios.credenciaisVersao`, tabelas `recuperacao_limites`, `recuperacoes_senha`, `recuperacao_envios`, FKs/índices/CHECK e ausência de pendentes. DDL MySQL tem commit implícito: se falhar, manter tráfego bloqueado e reparar com DBA; não repetir cegamente nem executar `synchronize`.

7. Iniciar somente a versão nova com despacho pausado; manter o bloqueio externo:

	```sh
	docker compose -f docker-compose.yml up -d --no-deps api web
	docker compose -f docker-compose.yml up -d --no-deps nginx
	docker compose -f docker-compose.yml exec -T nginx nginx -t
	docker compose -f docker-compose.yml ps
	curl --fail --silent --show-error http://127.0.0.1:3000/health
	```

	O health check não atesta credenciais Hostinger, entrega nem correção do rollout. Validar TLS/origem/CORS, `Retry-After`, `no-store`/`no-referrer`, proxy restrito e limites via ingresso e acesso direto controlado. Pausa impede novos claims, **não solicitações/enqueue nem expiração/limpeza**; despacho já iniciado não é desfeito. Não abrir o tráfego público como teste de fila pausada.
8. Após os checks, alterar no ambiente protegido `PASSWORD_RESET_DELIVERY_ENABLED=true` e recriar apenas a API para reler o ambiente:

	```sh
	docker compose -f docker-compose.yml up -d --no-deps --force-recreate api
	```

	Aguardar health e ausência de instâncias antigas; executar smoke controlado autorizado (conta de teste, login/refresh, recuperação, uso único, revogação das sessões antigas, movimentação/saldo) e só então liberar tráfego. Envio real exige autorização própria. No navegador, confirmar remoção do fragmento, ausência de token em storage e reabertura do e-mail após reload. Nenhum desses checks operacionais foi executado nesta entrega.

### Pausa, retomada, rollback e acompanhamento

- **Pausa/retomada:** definir `false`/`true` e recriar a API como acima, com shutdown de até 20s concedido pelo Compose. Um simples restart não incorpora alteração no ambiente do container. Limpeza continua com despacho pausado. Não mover `unknown`/`dispatching` de volta a `pending`, não reconstruir payloads nem repetir envio externo; o usuário pode solicitar outro link respeitando cooldown/cota.
- **TTL e backlog:** os 300s começam na emissão, não no envio/retomada. Backlog antigo expira normalmente; entrega tardia pode conter link inválido. Não renovar prazos para esvaziar fila. `accepted` significa apenas HTTP 204 do provedor, não entrega; não há exactly-once nem garantia temporal.
- **Chave indisponível:** corrigir o keyring em todos os backends e reiniciar coordenadamente, mantendo chaves antigas para envelopes/backups conforme política. Não trocar o valor de um identificador existente. Recuperação só ocorre dentro do TTL original; expiração continua mesmo sem chave/configuração.
- **Observabilidade sanitizada:** `password_reset_queue` contém `backlog`, `oldestSeconds`, `keyUnavailable`, `expired`, `unknown`, `failed`. Os três últimos são contagens dos registros ainda retidos, não contadores cumulativos; podem diminuir com a limpeza após 24h. Alertar sobre `unknown`, chave indisponível, `payload_invalid` e idade próxima de 300s; acompanhar os eventos de indisponibilidade/finalização. Não coletar linhas SQL, ciphertext, digest, destinatário, token ou exceção SDK. D2 continua acompanhamento de duração/linhas examinadas das buscas de retenção; lote de 50 não limita o scan a 50 leituras.
- **Rollback preferido:** manter schema e proteção de versão JWT, pausar despacho e corrigir adiante. Não iniciar código antigo que ignore `credenciaisVersao`. Se for inevitável, bloquear tráfego/parar todas as instâncias e invalidar/rotacionar **ambos** `JWT_SECRET` e `JWT_REFRESH_SECRET`, removendo confiança nas chaves antigas e exigindo login. Restaurar backup também pode restaurar versões antigas: a mesma proteção se aplica.
- **Rollback somente da fila:** parar workers e emissores novos, usar exclusivamente versão compatível sem fila que ainda valide a versão JWT, aceitar a perda dos envios preparatórios e confirmar que a última migração aplicada é `PasswordResetDelivery1798930800000` antes de uma única reversão aprovada. `migration:revert:prod` reverte a última migração, não aceita escolher pelo nome; não executá-lo cegamente ou duas vezes. Não remover a migração-base/coluna de versão para reverter somente a fila.

**Pendências para liberação:** triagem/correção do lint com nova revisão se houver edição de código; controle do workflow antes de merge; ensaio de imagens/migrações e validação operacional autorizada em homologação. Envio Hostinger real, browser real, TLS implantado e SIGKILL continuam não executados. Nenhum deploy, migração de produção, leitura de segredo real ou envio real faz parte desta preparação.