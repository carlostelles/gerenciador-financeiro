import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';

export class CreateMovimentoDto {
  @ApiProperty({
    description: 'Data da movimentação',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'O campo data é obrigatório' })
  @IsDateString({}, { message: 'A data deve estar no formato válido' })
  data: string;

  @ApiProperty({
    description: 'Descrição da movimentação',
    example: 'Pagamento de salário',
  })
  @IsString()
  descricao: string;

  @ApiProperty({
    description: 'Valor da movimentação',
    example: 5000.0,
  })
  @IsNotEmpty({ message: 'O campo valor é obrigatório' })
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @IsPositive({ message: 'O valor deve ser um número positivo' })
  valor: number;

  @ApiProperty({
    description: 'ID do item de orçamento',
    example: 1,
  })
  @IsNotEmpty({ message: 'O campo orcamentoItemId é obrigatório' })
  @IsNumber({}, { message: 'O orcamentoItemId deve ser um número' })
  orcamentoItemId: number;
}