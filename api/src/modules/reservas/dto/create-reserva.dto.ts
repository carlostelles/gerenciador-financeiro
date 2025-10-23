import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';

export class CreateReservaDto {
  @ApiProperty({
    description: 'Data da reserva',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'O campo data é obrigatório' })
  @IsDateString({}, { message: 'A data deve estar no formato válido' })
  data: string;

  @ApiProperty({
    description: 'Descrição da reserva',
    example: 'Reserva para emergência',
  })
  @IsNotEmpty({ message: 'O campo descrição é obrigatório' })
  @IsString()
  descricao: string;

  @ApiProperty({
    description: 'Valor da reserva',
    example: 1000.0,
  })
  @IsNotEmpty({ message: 'O campo valor é obrigatório' })
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @IsPositive({ message: 'O valor deve ser um número positivo' })
  valor: number;

  @ApiProperty({
    description: 'ID da categoria de reserva',
    example: 1,
  })
  @IsNotEmpty({ message: 'O campo categoriaId é obrigatório' })
  @IsNumber({}, { message: 'O categoriaId deve ser um número' })
  categoriaId: number;
}