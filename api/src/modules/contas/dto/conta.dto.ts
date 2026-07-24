import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContaDto {
  @ApiProperty({
    description: 'Nome da conta',
    example: 'Conta Corrente',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  nome: string;

  @ApiPropertyOptional({
    description: 'Tags da conta separadas por vírgula',
    example: 'pessoal,principal,cartão',
  })
  @IsOptional()
  @IsString({ message: 'Tags devem ser uma string' })
  tags?: string | null;
}

export class UpdateContaDto extends PartialType(CreateContaDto) {}

export class ContaResponseDto {
  @ApiProperty({ description: 'ID da conta', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  usuarioId: number;

  @ApiProperty({ description: 'Nome da conta', example: 'Conta Corrente' })
  nome: string;

  @ApiPropertyOptional({ description: 'Tags da conta separadas por vírgula' })
  tags: string | null;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
