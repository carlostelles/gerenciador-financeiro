
# API RESTful para Gerenciador Financeiro

## Tratamento de Erros

```
interface ErrorResponse {
    "message": "string",
    "details"?: "string"
}
```

## Autenticação

POST /auth/login
POST /auth/refresh
POST /auth/logout

## Usuários

* POST /usuarios
    * Resposta 201 (Created) em caso de sucesso
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Cria um novo usuário
    * Apenas usuários com role "ADMIN" podem atualizar outros usuários
    * Um usuário pode atualizar apenas seus próprios dados, exceto o campo "role"
    * O campo "role" só pode ser alterado por usuários com role "ADMIN"
    * O campo "ativo" não pode ser alterado via este endpoint
    * A senha deve ser criptografada
    * Validações:
        * O campo "email" deve ser um email válido e único
        * O campo "telefone" deve ser um telefone válido e único (DDI + DDD + NUMERO) sem traço, parenteses ou espaço
        * O campo "senha" deve ser alfanumérico e conter no mínimo 8 dígitos e no máximo 16 dígitos

* GET /usuarios
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar a lista de usuários
    * Lista todos os usuários
    * Apenas usuários com role "ADMIN" podem listar todos os usuários

* GET /usuarios/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar o detalhe do usuário
    * Resposta 404 (Not Found) se o usuário não existir
    * Obtém os detalhes de um usuário específico
    * Apenas usuários com role "ADMIN" podem atualizar outros usuários
    * Um usuário pode atualizar apenas seus próprios dados, exceto o campo "role"

* PUT /usuarios/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o usuário não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar o usuário específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Atualiza um usuário específico
    * Apenas usuários com role "ADMIN" podem atualizar outros usuários
    * Um usuário pode atualizar apenas seus próprios dados, exceto o campo "role"
    * O campo "role" só pode ser alterado por usuários com role "ADMIN"
    * O campo "ativo" não pode ser alterado via este endpoint
    * A senha deve ser criptografada
    * Validações:
        * O campo "email" não pode ser alterado por usuário com role "USER"
        * O campo "email" apenas pode ser alterado por usuário com role "ADMIN"
        * O campo "telefone" deve ser um telefone válido e único (DDI + DDD + NUMERO) sem traço, parenteses ou espaço
        * O campo "senha" deve ser alfanumérico e conter no mínimo 8 dígitos e no máximo 16 dígitos

* DELETE /usuarios/{id}
    * Resposta 204 (No Content) em caso de sucesso
    * Resposta 404 (Not Found) se o usuário não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar o usuário específico
    * Altera o campo ativo de um usuário específico para false (desativação)
    * Não remove o usuário do banco de dados
    * Apenas usuários com role "ADMIN" podem desativar outros usuários
    * Um usuário não pode desativar a si mesmo

### Interface Usuário

```
enum UserRole {
    "ADMIN",
    "USER"
}

interface Usuario {
    "nome": "string",
    "email": "string",
    "senha": "string",
    "telefone": "string",
    "role": "UserRole",
    "ativo": "boolean"
}
```

## Categorias

* POST /categorias
    * Resposta 201 (Created) em caso de sucesso
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Criar uma nova categoria
    * Validações:
        * O campo "nome" é obrigatório
        * O campo "tipo" é obrigatório
        * Não é possível cadastrar uma categoria de mesmo nome e tipo para um mesmo usuário

* GET /categorias
    * Resposta 200 (OK) em caso de sucesso
    * Lista as categorias cadastradas para o usuário autenticado
    * O usuário apenas pode ver suas próprias categorias

* GET /categorias/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar o detalhe da lista
    * Resposta 404 (Not Found) se a categoria não existir
    * Obtém detalhes de uma categoria específica
    * O usuário apenas pode ver suas próprias categorias

* PUT /categorias/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se a categoria não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar a categoria específica
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Atualiza uma categoria específica
    * O usuário logado pode alterar apenas as categorias na qual estiver vinculado
    * Validações:
        * O campo "nome" é obrigatório
        * O campo "tipo" é obrigatório
        * Não é possível cadastrar uma categoria de mesmo nome e tipo para um mesmo usuário

* DELETE /categorias/{id}
    * Resposta 204 (No Content) em caso de sucesso
    * Resposta 404 (Not Found) se a categoria não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para excluir a categoria específica
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Excluia categoria específica
    * Apenas o usuário vinculado a categoria pode excluir
    * Validações:
        * A categoria só pode ser excluída se não estiver vinculada a um OrcamentoItem ou Reserva

### Interface Categoria

```
enum CategoriaTipo {
    "RECEITA",
    "DESPESA",
    "RESERVA"
}

interface Categoria {
    "id": "string",
    "usuarioId": "number",
    "nome": "string",
    "descricao": "string",
    "tipo": "CategoriaTipo",
}
```

## Orçamentos

* POST /orcamentos
    * Resposta 201 (Created) em caso de sucesso
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Cria um novo orçamento
    * O campo "usuarioId" deve ser preenchido automaticamente com o identificador do usuário autenticado
    * Validações:
        * O campo "periodo" é obrigatório
        * O campo "periodo" deve corresponder ao padrão "yyyy-mm"
        * O campo "descricao" é obrigatório
        * Não é possível cadastrar um orçamento de mesmo período para um mesmo usuário

* GET /orcamentos
    * Resposta 200 (OK) em caso de sucesso
    * Lista os orçamentos cadastrados para o usuário autenticado
    * O usuário apenas pode ver seus próprios orçamentos

* GET /orcamentos/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar o detalhe do orçamento
    * Resposta 404 (Not Found) se o orçamento não existir
    * Obtém detalhes de um orçamento específico
    * O usuário apenas pode ver seus próprios orçamentos

* PUT /orcamentos/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar o orçamento específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Atualiza um orçamento específico
    * O usuário apenas pode alterar seus próprios orçamentos
    * O campo "usuarioId" não pode ser alterado
    * Validações:
        * O campo "periodo" é obrigatório
        * O campo "periodo" deve corresponder ao padrão "yyyy-mm"
        * O campo "descricao" é obrigatório
        * Não é possível cadastrar um orçamento de mesmo período para um mesmo usuário

* DELETE /orcamentos/{id}
    * Resposta 204 (No Content) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para excluir o orçamento específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Exclui um orçamento específico
    * O usuário apenas pode excluir seus próprios orçamentos
    * Validações:
        * O orçamento só pode ser excluído se não possuir movimentações ou itens vinculados

* POST /orcamento/{id}/clonar/{periodo}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar o orçamento específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Clona um orçamento espeífico
    * Um orçamento só pode ser clonar pelo usuário vinculado a ele
    * O campo "periodo" do orcamento clonado deve corresponder ao parâmetro da URL
    * Deve clonar também todos os itens vinculados ao orçamento informado, vinculando ao novo orçamento criado
    * Validações:
        * O campo "periodo" é obrigatório
        * O campo "periodo" deve corresponder ao padrão "yyyy-mm"
        * Não é possível cadastrar um orçamento de mesmo período para um mesmo usuário

### Interface Orcamento

interface Orcamento {
    "id": "number",
    "usuarioId": "number",
    "periodo": "string",
    "descricao": "string",
    "items": "OrcamentoItem[]"
}

## Itens de Orçamento

* POST /orcamentos/{id}/itens
    * Resposta 201 (Created) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para adicionar itens ao orçamento específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Cria um novo item para o orçamento específico
    * O usuário apenas pode adicionar itens aos seus próprios orçamentos
    * O campo "orcamentoId" deve ser preenchido automaticamente com o parâmetro da URL
    * Validações:
        * O campo "descricao" é obrigatório
        * O campo "valor" deve ser um número positivo
        * O campo "categoriaId" deve referenciar uma categoria existente e vinculada ao usuário logado

* GET /orcamentos/{id}/itens
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar os itens do orçamento específico
    * Lista os itens cadastrados para o orçamento específico
    * O usuário apenas pode ver itens dos seus próprios orçamentos

* GET /orcamentos/{id}/itens/{itemId}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento ou item não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar o detalhe do item
    * Obtém detalhes de um item específico do orçamento
    * O usuário apenas pode ver itens dos seus próprios orçamentos

* PUT /orcamentos/{id}/itens/{itemId}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento ou item não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar o item específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Atualiza um item específico do orçamento
    * O usuário apenas pode alterar itens dos seus próprios orçamentos
    * O campo "orcamentoId" não pode ser alterado
    * Validações:
        * O campo "descricao" é obrigatório
        * O campo "valor" deve ser um número positivo
        * O campo "categoriaId" deve referenciar uma categoria existente e vinculada ao usuário logado

* DELETE /orcamentos/{id}/itens/{itemId}
    * Resposta 204 (No Content) em caso de sucesso
    * Resposta 404 (Not Found) se o orçamento ou item não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para excluir o item específico
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Exclui um item específico do orçamento
    * O usuário apenas pode excluir itens dos seus próprios orçamentos
    * Validações:
        * O item só pode ser excluído se não possuir movimentações vinculadas

### Interface OrcamentoItem

```
interface OrcamentoItem {
    "id": "number",
    "orcamentoId": "number",
    "descricao": "string",
    "valor": "number",
    "categoriaId": "number"
}
```

## Movimentações

* POST /movimentacoes/{periodo}
    * Resposta 201 (Created) em caso de sucesso
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Cria uma nova movimentação para o período especificado
    * O campo "usuarioId" deve ser preenchido automaticamente com o identificador do usuário autenticado
    * O campo "periodo" deve corresponder ao parâmetro da URL
    * Validações:
        * O campo "periodo" deve corresponder ao padrão "yyyy-mm"
        * O campo "data" é obrigatório e deve estar dentro do período especificado
        * O campo "descricao" é obrigatório
        * O campo "valor" deve ser um número positivo
        * O campo "orcamentoItemId" deve referenciar um item de orçamento existente e vinculado ao usuário logado

* GET /movimentacoes/{periodo}
    * Resposta 200 (OK) em caso de sucesso
    * Lista as movimentações cadastradas para o período especificado do usuário autenticado
    * O usuário apenas pode ver suas próprias movimentações

* GET /movimentacoes/{periodo}/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar o detalhe da movimentação
    * Resposta 404 (Not Found) se a movimentação não existir
    * Obtém detalhes de uma movimentação específica do período
    * O usuário apenas pode ver suas próprias movimentações

* PUT /movimentacoes/{periodo}/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se a movimentação não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar a movimentação específica
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Atualiza uma movimentação específica do período
    * O usuário apenas pode alterar suas próprias movimentações
    * O campo "usuarioId" não pode ser alterado
    * O campo "periodo" não pode ser alterado
    * Validações:
        * O campo "data" é obrigatório e deve estar dentro do período especificado
        * O campo "descricao" é obrigatório
        * O campo "valor" deve ser um número positivo
        * O campo "orcamentoItemId" deve referenciar um item de orçamento existente e vinculado ao usuário logado

* DELETE /movimentacoes/{periodo}/{id}
    * Resposta 204 (No Content) em caso de sucesso
    * Resposta 404 (Not Found) se a movimentação não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para excluir a movimentação específica
    * Exclui uma movimentação específica do período
    * O usuário apenas pode excluir suas próprias movimentações

### Interface Movimento

```
interface Movimento {
    "id": "number",
    "usuarioId": "number",
    "periodo": "string",
    "data": "string",
    "descricao": "string",
    "valor": "number",
    "orcamentoItemId": "number"
}
```

## Reservas

* POST /reservas
    * Resposta 201 (Created) em caso de sucesso
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Cria uma nova reserva
    * O campo "usuarioId" deve ser preenchido automaticamente com o identicado do usuário autenticado
    * Validações:
        * O campo "data" é obrigatório e deve estar dentro do período especificado
        * O campo "descricao" é obrigatório
        * O campo "valor" deve ser um número positivo
        * O campo "categoriaId" deve referenciar uma categoria existente do tipo "RESERVA" e vinculada ao usuário logado

* GET /reservas
    * Resposta 200 (OK) em caso de sucesso
    * Lista as reservas cadastradas para o usuário autenticado
    * O usuário apenas pode ver suas próprias reservas

* GET /reservas/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar o detalhe da reserva
    * Resposta 404 (Not Found) se a reserva não existir
    * Obtém detalhes de uma reserva específica
    * O usuário apenas pode ver suas próprias reservas

* PUT /reservas/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se a reserva não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para atualizar a reserva específica
    * Resposta 412 (Precondition Failed) caso alguma das validações não seja cumprida (retorna o objeto ErrorResponse)
    * Atualiza uma reserva específica
    * O usuário apenas pode alterar suas próprias reservas
    * O campo "usuarioId" não pode ser alterado
    * o campo "data" não pode ser alterado
    * Validações:
        * O campo "descricao" é obrigatório
        * O campo "valor" deve ser um número positivo
        * O campo "categoriaId" deve referenciar uma categoria existente do tipo "RESERVA"

* DELETE /reservas/{id}
    * Resposta 204 (No Content) em caso de sucesso
    * Resposta 404 (Not Found) se a reserva não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para excluir a reserva específica
    * Exclui uma reserva específica
    * O usuário apenas pode excluir suas próprias reservas

### Interface Reserva

```
interface Reserva {
    "id": "number",
    "usuarioId": "number",
    "data": "string",
    "descricao": "string",
    "valor": "number",
    "categoriaId": "number"
}
```

## Logs

* GET /logs
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar os logs
    * Lista os logs cadastrado
    * Apenas usuário com role "ADMIN" podem consultar os logs

* GET /logs/{id}
    * Resposta 200 (OK) em caso de sucesso
    * Resposta 404 (Not Found) se o log não existir
    * Resposta 403 (Forbidden) se o usuário autenticado não tiver permissão para visualizar os logs
    * Lista um log específico
    * Apenas usuário com role "ADMIN" podem consultar os logs

### Interface Log

```
enum LogAcao {
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT"
}

interface Log {
    "id": "number",
    "data": "string",
    "usuarioId": "number",
    "descricao": "string",
    "acao": "LogAcao"
}
```
