import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { LogAcao } from '../../../common/types';

export class CreateLogDto {
  @ApiProperty({
    description: 'Data do log',
    example: '2023-10-15T10:30:00Z',
  })
  @IsDate()
  data: Date;

  @ApiProperty({
    description: 'ID do usuário que executou a ação',
    example: 1,
  })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({
    description: 'Descrição da ação',
    example: 'Usuário criado: joao@example.com',
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao: string;

  @ApiProperty({
    description: 'Tipo da ação',
    enum: LogAcao,
    example: LogAcao.CREATE,
  })
  @IsEnum(LogAcao, { message: 'Ação deve ser CREATE, UPDATE, DELETE, LOGIN ou LOGOUT' })
  acao: LogAcao;

  @ApiProperty({
    description: 'Nome da entidade afetada',
    example: 'Usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  entidade?: string;

  @ApiProperty({
    description: 'ID da entidade afetada',
    example: '123',
    required: false,
  })
  @IsOptional()
  @IsString()
  entidadeId?: string;

  @ApiProperty({
    description: 'Dados anteriores da entidade',
    required: false,
  })
  @IsOptional()
  dadosAnteriores?: any;

  @ApiProperty({
    description: 'Dados novos da entidade',
    required: false,
  })
  @IsOptional()
  dadosNovos?: any;
}

export class LogResponseDto {
  @ApiProperty({ description: 'ID do log' })
  _id: string;

  @ApiProperty({ description: 'Data do log' })
  data: Date;

  @ApiProperty({ description: 'ID do usuário' })
  usuarioId: number;

  @ApiProperty({ description: 'Descrição da ação' })
  descricao: string;

  @ApiProperty({ description: 'Tipo da ação', enum: LogAcao })
  acao: LogAcao;

  @ApiProperty({ description: 'Nome da entidade', required: false })
  entidade?: string;

  @ApiProperty({ description: 'ID da entidade', required: false })
  entidadeId?: string;

  @ApiProperty({ description: 'Dados anteriores', required: false })
  dadosAnteriores?: any;

  @ApiProperty({ description: 'Dados novos', required: false })
  dadosNovos?: any;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}