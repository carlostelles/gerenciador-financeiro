import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
  ValidateIf,
  IsBoolean,
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

  @ApiPropertyOptional({
    description: 'ID do item de orçamento (opcional se categoriaId for informado)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O orcamentoItemId deve ser um número' })
  orcamentoItemId?: number;

  @ApiPropertyOptional({
    description: 'ID da categoria (opcional se orcamentoItemId for informado)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O categoriaId deve ser um número' })
  categoriaId?: number;

  @ApiPropertyOptional({
    description: 'Indica se a movimentação é parcelada',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo parcelado deve ser um booleano' })
  parcelado?: boolean;

  @ValidateIf((o) => o.parcelado === true)
  @ApiPropertyOptional({
    description: 'Número de parcelas (obrigatório se parcelado for true)',
    example: 3,
  })
  @IsNumber({}, { message: 'O número de parcelas deve ser um número' })
  @IsPositive({ message: 'O número de parcelas deve ser um número positivo' })
  parcelas?: number;
}