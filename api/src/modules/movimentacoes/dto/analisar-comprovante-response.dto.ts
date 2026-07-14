import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalisarComprovanteSalvamentoDto {
  @ApiProperty({
    enum: ['pendente', 'criado', 'atualizado'],
    example: 'criado',
  })
  status: 'pendente' | 'criado' | 'atualizado';

  @ApiPropertyOptional({ example: 123 })
  movimentoId?: number;
}

export class AnaliseComprovanteSugestaoDto {
  @ApiPropertyOptional({ example: '2026-07-13' })
  data: string | null;

  @ApiPropertyOptional({ example: '2026-07' })
  periodo: string | null;

  @ApiPropertyOptional({ example: 129.9 })
  valor: number | null;

  @ApiPropertyOptional({ example: 'Pagamento via PIX para Supermercado XPTO' })
  descricao: string | null;

  @ApiPropertyOptional({ example: 4 })
  categoriaId: number | null;

  @ApiPropertyOptional({ example: 'Alimentação' })
  categoriaNome: string | null;

  @ApiPropertyOptional({ example: 2 })
  contaId: number | null;

  @ApiPropertyOptional({ example: 'Conta Corrente' })
  contaNome: string | null;
}

export class AnalisarComprovanteResponseDto {
  @ApiProperty({ example: 10 })
  comprovanteId: number;

  @ApiProperty({ example: 'comprovante.pdf' })
  nomeArquivo: string;

  @ApiProperty({ example: 'application/pdf' })
  tipoArquivo: string;

  @ApiProperty({ example: 153204 })
  tamanhoArquivo: number;

  @ApiProperty({ example: 's3://meu-bucket/movimentacoes/1/2026/07/abc-comprovante.pdf' })
  caminhoArquivo: string;

  @ApiProperty({ type: AnaliseComprovanteSugestaoDto })
  sugestao: AnaliseComprovanteSugestaoDto;

  @ApiProperty({ type: [String], example: ['data', 'categoriaId'] })
  camposObrigatoriosFaltantes: string[];

  @ApiProperty({ type: AnalisarComprovanteSalvamentoDto })
  salvamento: AnalisarComprovanteSalvamentoDto;
}