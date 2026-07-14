import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class AnalisarComprovanteRequestDto {
  @ApiPropertyOptional({
    description: 'Período alvo para persistência automática (yyyy-mm)',
    example: '2026-07',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'O período deve estar no formato yyyy-mm',
  })
  periodo?: string;

  @ApiPropertyOptional({
    description: 'ID da movimentação para atualização automática (modo edição)',
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O movimentoId deve ser um número inteiro' })
  @Min(1, { message: 'O movimentoId deve ser maior que zero' })
  movimentoId?: number;
}