import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

export class CreateOrcamentoItemDto {
  @ApiProperty({
    description: 'Descrição do item de orçamento',
    example: 'Salário mensal',
  })
  @IsString()
  descricao: string;

  @ApiProperty({
    description: 'Valor do item de orçamento',
    example: 5000.0,
  })
  @IsNotEmpty({ message: 'O campo valor é obrigatório' })
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @IsPositive({ message: 'O valor deve ser um número positivo' })
  valor: number;

  @ApiProperty({
    description: 'ID da categoria',
    example: 1,
  })
  @IsNotEmpty({ message: 'O campo categoriaId é obrigatório' })
  @IsNumber({}, { message: 'O categoriaId deve ser um número' })
  categoriaId: number;
}