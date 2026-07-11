import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateContaDto {
  @ApiProperty({
    description: 'Nome da conta',
    example: 'Conta Corrente',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  nome: string;
}

export class UpdateContaDto extends PartialType(CreateContaDto) {}

export class ContaResponseDto {
  @ApiProperty({ description: 'ID da conta', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do usuário', example: 1 })
  usuarioId: number;

  @ApiProperty({ description: 'Nome da conta', example: 'Conta Corrente' })
  nome: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}
