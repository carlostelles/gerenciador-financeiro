import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Matches,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateOrcamentoDto {
  @ApiProperty({
    description: 'Período do orçamento (formato yyyy-mm)',
    example: '2023-10',
  })
  @IsString({ message: 'Período deve ser uma string' })
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Período deve estar no formato yyyy-mm',
  })
  periodo: string;

  @ApiProperty({
    description: 'Descrição do orçamento',
    example: 'Orçamento de Outubro 2023',
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao: string;
}

export class UpdateOrcamentoDto extends PartialType(CreateOrcamentoDto) {}

export class CreateOrcamentoItemDto {
  @ApiProperty({
    description: 'Descrição do item',
    example: 'Supermercado mensal',
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao: string;

  @ApiProperty({
    description: 'Valor do item',
    example: 500.00,
  })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @IsPositive({ message: 'Valor deve ser positivo' })
  valor: number;

  @ApiProperty({
    description: 'ID da categoria',
    example: 1,
  })
  @IsNumber({}, { message: 'ID da categoria deve ser um número' })
  @Min(1, { message: 'ID da categoria deve ser maior que 0' })
  categoriaId: number;
}

export class UpdateOrcamentoItemDto extends PartialType(CreateOrcamentoItemDto) {}

export class OrcamentoItemResponseDto {
  @ApiProperty({ description: 'ID do item', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do orçamento', example: 1 })
  orcamentoId: number;

  @ApiProperty({ description: 'Descrição do item', example: 'Supermercado mensal' })
  descricao: string;

  @ApiProperty({ description: 'Valor do item', example: 500.00 })
  valor: number;

  @ApiProperty({ description: 'ID da categoria', example: 1 })
  categoriaId: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}

export class OrcamentoResponseDto {
  @ApiProperty({ description: 'ID do orçamento', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  usuarioId: number;

  @ApiProperty({ description: 'Período do orçamento', example: '2023-10' })
  periodo: string;

  @ApiProperty({ description: 'Descrição do orçamento', example: 'Orçamento de Outubro 2023' })
  descricao: string;

  @ApiProperty({ description: 'Itens do orçamento', type: [OrcamentoItemResponseDto] })
  items: OrcamentoItemResponseDto[];

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}