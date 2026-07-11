import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class FindMovimentosQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar movimentações por categoria',
    example: '1',
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O categoriaId deve ser um número' })
  categoriaId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar movimentações por conta',
    example: '1',
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O contaId deve ser um número' })
  contaId?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar movimentações por descrição. A busca é dinâmica, considerando a correspondência de qualquer palavra informada, independentemente da ordem, e desconsiderando acentuação e caracteres especiais.',
    example: 'mercado',
  })
  @IsOptional()
  @IsString()
  descricao?: string;
}
