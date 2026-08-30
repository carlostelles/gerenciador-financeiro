import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { EspacoPapel } from '../entities/espaco-membro.entity';

export class CreateEspacoDto {
  @ApiProperty({ example: 'Família' })
  @IsString()
  @Length(1, 120)
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
