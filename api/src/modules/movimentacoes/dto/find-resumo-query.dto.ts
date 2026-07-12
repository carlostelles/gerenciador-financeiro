import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class FindResumoQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar resumo por conta',
    example: '1',
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O contaId deve ser um número' })
  contaId?: string;
}
