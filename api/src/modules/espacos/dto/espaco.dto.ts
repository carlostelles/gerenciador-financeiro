import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { EspacoPapel } from '../entities/espaco-membro.entity';
import { EspacoTipo } from '../entities/espaco.entity';

export class CreateEspacoDto {
  @ApiProperty({ example: 'Família' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;
}

export class UpdateEspacoDto extends PartialType(CreateEspacoDto) {}

export class AddEspacoMembroDto {
  @ApiProperty({ example: 'pessoa@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: [EspacoPapel.EDITOR, EspacoPapel.VIEWER],
    default: EspacoPapel.VIEWER,
  })
  @IsOptional()
  @IsIn([EspacoPapel.EDITOR, EspacoPapel.VIEWER])
  papel?: EspacoPapel.EDITOR | EspacoPapel.VIEWER;
}

export class UpdateEspacoMembroDto {
  @ApiProperty({ enum: [EspacoPapel.EDITOR, EspacoPapel.VIEWER] })
  @IsIn([EspacoPapel.EDITOR, EspacoPapel.VIEWER])
  papel: EspacoPapel.EDITOR | EspacoPapel.VIEWER;
}

export class TransferirPropriedadeDto {
  @ApiProperty()
  @IsInt()
  usuarioId: number;
}

export class EspacoResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nome: string;

  @ApiProperty({ enum: EspacoTipo })
  tipo: EspacoTipo;

  @ApiProperty()
  ownerUsuarioId: number;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class EspacoVinculoResponseDto {
  @ApiProperty({ enum: EspacoPapel })
  papel: EspacoPapel;

  @ApiProperty({ type: EspacoResponseDto })
  espaco: EspacoResponseDto;
}

export class EspacoContextoResponseDto extends EspacoVinculoResponseDto {
  @ApiProperty()
  espacoId: number;
}

export class EspacoMembroUsuarioResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  email: string;
}

export class EspacoMembroResponseDto {
  @ApiProperty()
  usuarioId: number;

  @ApiProperty({ enum: EspacoPapel })
  papel: EspacoPapel;

  @ApiPropertyOptional({ type: EspacoMembroUsuarioResponseDto })
  usuario?: EspacoMembroUsuarioResponseDto;
}
