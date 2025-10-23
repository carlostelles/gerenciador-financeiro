import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateOrcamentoDto {
  @ApiProperty({
    description: 'Período do orçamento no formato yyyy-mm',
    example: '2024-01',
  })
  @IsNotEmpty({ message: 'O campo período é obrigatório' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'O período deve estar no formato yyyy-mm',
  })
  periodo: string;

  @ApiProperty({
    description: 'Descrição do orçamento',
    example: 'Orçamento pessoal de Janeiro 2024',
  })
  @IsString()
  descricao: string;
}