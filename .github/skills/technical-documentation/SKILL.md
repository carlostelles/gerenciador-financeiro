---
name: technical-documentation
description: 'Escrever documentação técnica clara: READMEs, documentação de API, comentários de código, e notas de arquitetura. Use quando: documentar uma nova feature, atualizar README/CONTRIBUTING, escrever docstrings para lógica complexa, ou explicar uma decisão não óbvia.'
---

# Documentação Técnica

## Quando Usar
- Adicionar uma nova feature que precisa de uma atualização de README/uso
- Escrever documentação para um módulo, script, ou config não óbvio
- Explicar lógica de negócio complexa (ex.: regras de cálculo financeiro) via comentários inline
- Atualizar `CONTRIBUTING.md` ou arquivos README de nível de módulo após uma mudança estrutural

## Procedimento

1. **Escreva para o leitor que não tem seu contexto** — assuma que ele conhece o domínio mas não esta implementação específica.
2. **Prefira código autoexplicativo primeiro**: nomenclatura clara e funções pequenas reduzem a necessidade de comentários. Adicione comentários apenas para explicar *por quê*, não *o quê* (o código já mostra o quê).
3. **Para READMEs**, inclua: propósito, instruções de configuração/execução, scripts/comandos principais, e links para documentação mais aprofundada (este repositório já tem uma pasta `docs/` rica — aponte para ela em vez de duplicar).
4. **Para documentação de API**, mantenha-a próxima ao código (DTOs, decorators de controller) para que permaneça sincronizada; evite documentos separados que podem se desatualizar em relação à implementação.
5. **Crie novos arquivos de documentação apenas quando solicitado ou claramente necessário** — não crie arquivos markdown documentando cada mudança por padrão (isso incha o repositório, que já tem muitos arquivos `docs/*.md`).
6. **Atualize a documentação existente em vez de criar novas sobrepostas** — verifique primeiro `docs/` e os arquivos `README.md`/`*.md` de nível de módulo para ver se o tópico já está coberto.

## Boas Práticas
- Mantenha a documentação próxima ao código que ela descreve (README/comentários colocalizados em vez de um documento distante estilo wiki).
- Use exemplos concretos (exemplo de request/response, exemplo de comando) em vez de descrições abstratas.
- Atualize a documentação no mesmo PR que a mudança de código que ela descreve, não como uma reflexão tardia.

## Armadilhas Comuns
- Criar um novo arquivo markdown para cada mudança pequena em vez de atualizar a documentação existente (este repositório já mostra sinais de proliferação de docs em `docs/`).
- Documentação que reafirma o código linha a linha em vez de explicar a intenção/racional.
- Documentação desatualizada e inconsistente com o código após uma refatoração.
