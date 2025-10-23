import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { CategoriaTipo } from '../../../common/types';

export class CreateCategoriaDto {
  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Alimentação',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  nome: string;

  @ApiProperty({
    description: 'Descrição da categoria',
    example: 'Gastos com alimentação e restaurantes',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao?: string;

  @ApiProperty({
    description: 'Tipo da categoria',
    enum: CategoriaTipo,
    example: CategoriaTipo.DESPESA,
  })
  @IsEnum(CategoriaTipo, { message: 'Tipo deve ser RECEITA, DESPESA ou RESERVA' })
  tipo: CategoriaTipo;
}

export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}

export class CategoriaResponseDto {
  @ApiProperty({ description: 'ID da categoria', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  usuarioId: number;

  @ApiProperty({ description: 'Nome da categoria', example: 'Alimentação' })
  nome: string;

  @ApiProperty({ 
    description: 'Descrição da categoria', 
    example: 'Gastos com alimentação e restaurantes' 
  })
  descricao: string;

  @ApiProperty({ description: 'Tipo da categoria', enum: CategoriaTipo })
  tipo: CategoriaTipo;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}