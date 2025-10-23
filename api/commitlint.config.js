module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação, ponto e vírgula ausente, etc; sem mudança no código
        'refactor', // Refatoração de código que não corrige bugs nem adiciona funcionalidades
        'perf',     // Melhoria de performance
        'test',     // Adição de testes
        'build',    // Mudanças no sistema de build ou dependências externas
        'ci',       // Mudanças em arquivos de configuração de CI
        'chore',    // Outras mudanças que não modificam src ou test
        'revert',   // Reverter um commit anterior
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
};