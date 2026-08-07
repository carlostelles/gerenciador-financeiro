---
name: debugging-systematic
description: 'Diagnosticar e corrigir bugs sistematicamente usando evidências (logs, stack traces, reprodução) em vez de suposições. Use quando: investigar um erro, comportamento inesperado, teste falhando, crash, ou bug reportado na API ou no app web.'
---

# Depuração Sistemática

## Quando Usar
- Um erro, exceção ou comportamento inesperado é reportado
- Um teste está falhando e a causa não é óbvia
- Algo funcionava antes e agora não funciona mais (regressão)
- O comportamento difere entre ambientes (local vs. Docker vs. produção)

## Procedimento

1. **Reproduzir primeiro** — não corrija o que você não consegue observar. Encontre os passos/entrada exatos que disparam o problema. Se não conseguir reproduzir, reúna mais evidências (logs, mensagens de erro, ferramenta `get_errors`, ferramenta `testFailure`) antes de alterar o código.
2. **Reunir fatos, não suposições**:
   - Leia o stack trace/mensagem de erro completa — identifique o arquivo e a linha exatos.
   - Use `grep_search`/`semantic_search` para encontrar onde vive o caminho de código que está falhando.
   - Verifique alterações recentes (`git log`, `git diff`) se for uma regressão.
3. **Formular uma hipótese** baseada em evidências, e então verificá-la — ex.: adicione um log/breakpoint temporário, ou escreva um teste mínimo que isole o comportamento.
4. **Reduzir o escopo** — faça bisseção: é a camada de BD, a lógica do serviço, o controller, ou a renderização/estado do frontend? Verifique uma camada por vez.
5. **Corrigir a causa raiz**, não apenas o sintoma. Evite patches que suprimem o erro (ex.: try/catch genérico) sem entender por que ele ocorreu.
6. **Adicionar um teste de regressão** que teria detectado esse bug, para que ele não reapareça silenciosamente.
7. **Verificar a correção** reexecutando os passos originais de reprodução e a suíte de testes relevante completa.

## Boas Práticas
- Prefira a ferramenta `get_errors` e a saída dos testes em vez de buscar manualmente por `console.log` no terminal, quando a ferramenta estiver disponível.
- Ao depurar entre `api/` e `web/`, verifique primeiro o formato da requisição/resposta de rede — muitos "bugs de frontend" são na verdade incompatibilidades de contrato de API.
- Para problemas relacionados a Docker/nginx (este repositório tem vários documentados em `docs/`), consulte a documentação existente (`docs/NGINX-*.md`, `docs/SSL-*.md`) antes de rediagnosticar do zero — o problema já pode estar documentado.

## Armadilhas Comuns
- Alterar código especulativamente sem confirmar a causa raiz ("depuração no escuro").
- Corrigir o primeiro código que parece suspeito em vez de rastrear o caminho real da falha.
- Não adicionar um teste de regressão, permitindo que o mesmo bug ressurja depois.
- Ignorar diferenças de ambiente (variáveis de ambiente, rede do Docker, fuso horário) como possível causa.
