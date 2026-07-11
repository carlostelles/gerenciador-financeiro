/**
 * Remove acentuação e caracteres especiais de um texto, convertendo para
 * minúsculas e normalizando espaços em branco. Utilizado para permitir buscas
 * textuais que ignorem acentuação e pontuação (ex: "cafe" encontrar "café").
 */
export function normalizarTexto(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos (acentos)
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // remove caracteres especiais
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Divide um texto normalizado em uma lista de palavras, descartando
 * elementos vazios.
 */
export function extrairPalavras(texto: string): string[] {
  return normalizarTexto(texto)
    .split(' ')
    .filter((palavra) => palavra.length > 0);
}

/**
 * Verifica se todas as palavras informadas na busca aparecem em algum ponto
 * do texto alvo, independentemente da ordem e desconsiderando acentuação e
 * caracteres especiais.
 */
export function contemTodasAsPalavras(
  textoAlvo: string,
  textoBusca: string,
): boolean {
  const palavrasBusca = extrairPalavras(textoBusca);
  if (palavrasBusca.length === 0) {
    return true;
  }

  const textoAlvoNormalizado = normalizarTexto(textoAlvo);
  return palavrasBusca.every((palavra) =>
    textoAlvoNormalizado.includes(palavra),
  );
}
