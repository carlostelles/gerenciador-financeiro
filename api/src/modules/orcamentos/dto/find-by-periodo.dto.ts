import { CategoriaTipo } from '../../../common/types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class FindByPeriodoParamDto {
  @ApiProperty({
    description: 'Período do orçamento (formato yyyy-mm)',
    example: '2024-01',
  })
  @IsString({ message: 'Período deve ser uma string' })
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Período deve estar no formato yyyy-mm',
  })
  periodo: string;
}

export class CategoriaResponseDto {
  @ApiProperty({ description: 'ID da categoria', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome da categoria', example: 'Alimentação' })
  nome: string;

  @ApiProperty({ description: 'Tipo da categoria', example: 'DESPESA' })
  tipo: CategoriaTipo;
}

export class OrcamentoItemWithCategoriaDto {
  @ApiProperty({ description: 'ID do item', example: 1 })
  id: number;

  @ApiProperty({ description: 'Descrição do item', example: 'Supermercado mensal' })
  descricao: string;

  @ApiProperty({ description: 'Valor do item', example: 500.00 })
  valor: number;

  @ApiProperty({ description: 'Categoria vinculada', type: CategoriaResponseDto })
  categoria: CategoriaResponseDto;
}

export class OrcamentoByPeriodoResponseDto {
  @ApiProperty({ description: 'ID do orçamento', example: 1 })
  id: number;

  @ApiProperty({ description: 'Período do orçamento', example: '2024-01' })
  periodo: string;

  @ApiProperty({ description: 'Descrição do orçamento', example: 'Orçamento de Janeiro 2024' })
  descricao: string;

  @ApiProperty({ 
    description: 'Itens do orçamento com categorias', 
    type: [OrcamentoItemWithCategoriaDto] 
  })
  items: OrcamentoItemWithCategoriaDto[];

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
