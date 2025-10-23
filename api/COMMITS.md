# Guia de Commits Semânticos

Este projeto utiliza [Conventional Commits](https://www.conventionalcommits.org/) para padronizar as mensagens de commit e facilitar a geração automática de changelogs.

## 📝 Formato do Commit

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

## 🏷️ Tipos de Commit

### Principais
- **feat**: Nova funcionalidade para o usuário
- **fix**: Correção de bug
- **docs**: Mudanças na documentação
- **style**: Formatação, ponto e vírgula ausente, etc; sem mudança no código
- **refactor**: Refatoração de código que não corrige bugs nem adiciona funcionalidades
- **test**: Adição de testes
- **chore**: Outras mudanças que não modificam src ou test

### Adicionais
- **perf**: Melhoria de performance
- **build**: Mudanças no sistema de build ou dependências externas
- **ci**: Mudanças em arquivos de configuração de CI
- **revert**: Reverter um commit anterior

## 🎯 Exemplos de Commits

### ✅ Commits Válidos

```bash
# Nova funcionalidade
feat: adicionar endpoint de relatórios financeiros
feat(auth): implementar autenticação de dois fatores

# Correção de bug
fix: corrigir cálculo de saldo em movimentações
fix(api): resolver erro 500 na listagem de usuários

# Documentação
docs: atualizar README com instruções de instalação
docs(api): adicionar exemplos de uso dos endpoints

# Testes
test: adicionar testes unitários para AuthService
test(e2e): implementar testes para módulo de orçamentos

# Refatoração
refactor: reorganizar estrutura de pastas dos módulos
refactor(db): otimizar queries de relatórios

# Estilo/Formatação
style: aplicar formatação prettier em todos os arquivos
style: corrigir indentação em arquivos TypeScript

# Build/CI
build: atualizar dependências do NestJS para v10
ci: adicionar workflow de deploy automático

# Outros
chore: configurar husky e commitlint
chore: atualizar gitignore para ignorar logs
```

### ❌ Commits Inválidos

```bash
# Sem tipo
"adicionar nova funcionalidade"

# Tipo inválido
"feature: nova funcionalidade"

# Sem descrição
"feat:"

# Descrição muito longa (>72 caracteres)
"feat: implementar um sistema super complexo de relatórios financeiros com muitas funcionalidades"

# Primeira letra maiúscula na descrição
"feat: Adicionar endpoint de relatórios"

# Ponto final na descrição
"feat: adicionar endpoint de relatórios."
```

## 🔍 Escopos Sugeridos

Para este projeto, você pode usar os seguintes escopos:

- **auth**: Autenticação e autorização
- **users**: Módulo de usuários
- **categories**: Módulo de categorias
- **budgets**: Módulo de orçamentos
- **transactions**: Módulo de movimentações
- **reserves**: Módulo de reservas
- **logs**: Sistema de logs
- **api**: API em geral
- **db**: Banco de dados
- **docker**: Configurações Docker
- **tests**: Configurações de teste

## 🚨 Validação Automática

Este projeto está configurado com:

### CommitLint
- Valida automaticamente o formato dos commits
- Rejeita commits que não seguem o padrão
- Executado no hook `commit-msg`

### Husky Pre-commit
- Executa testes unitários
- Executa testes E2E
- Valida formatação do código
- Bloqueia commits se alguma validação falhar

## 🛠️ Como Usar

### 1. Fazer um commit
```bash
git add .
git commit -m "feat: adicionar endpoint de relatórios financeiros"
```

### 2. Se o commit for inválido
```bash
# O commitlint irá rejeitar e mostrar o erro
⧗   input: adicionar nova funcionalidade
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

### 3. Corrigir e tentar novamente
```bash
git commit -m "feat: adicionar nova funcionalidade de relatórios"
```

## 📚 Recursos Adicionais

- [Conventional Commits](https://www.conventionalcommits.org/)
- [CommitLint Rules](https://commitlint.js.org/#/reference-rules)
- [Husky Documentation](https://typicode.github.io/husky/)

## 💡 Dicas

1. **Seja específico**: Descreva exatamente o que foi alterado
2. **Use o imperativo**: "adicionar" ao invés de "adicionado"
3. **Seja conciso**: Mantenha a descrição curta e clara
4. **Use escopo quando apropriado**: Ajuda a identificar o módulo afetado
5. **Commits pequenos**: Prefira commits menores e mais frequentes

## 🔧 Troubleshooting

### Commit rejeitado por testes
```bash
# Se os testes falharem, corrija-os antes de commitar
npm test
npm run test:e2e
```

### Bypass dos hooks (apenas em emergências)
```bash
# EVITE usar, apenas em casos extremos
git commit -m "feat: emergência" --no-verify
```

### Verificar configuração
```bash
# Testar commitlint manualmente
echo "feat: teste" | npx commitlint

# Verificar hooks do husky
ls -la .husky/
```