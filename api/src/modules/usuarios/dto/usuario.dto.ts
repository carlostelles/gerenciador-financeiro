import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '../../../common/types';

export class CreateUsuarioDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  nome: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@example.com',
  })
  @IsEmail({}, { message: 'Email deve ser um email válido' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (8-16 caracteres alfanuméricos)',
    example: 'password123',
    minLength: 8,
    maxLength: 16,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(16, { message: 'Senha deve ter no máximo 16 caracteres' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'Senha deve conter apenas caracteres alfanuméricos',
  })
  senha: string;

  @ApiProperty({
    description: 'Telefone do usuário (DDI + DDD + NUMERO)',
    example: '5511999999999',
  })
  @IsString({ message: 'Telefone deve ser uma string' })
  @Matches(/^\d{13}$/, {
    message: 'Telefone deve conter exatamente 13 dígitos (DDI + DDD + NUMERO)',
  })
  telefone: string;

  @ApiProperty({
    description: 'Role do usuário',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser ADMIN ou USER' })
  role?: UserRole;
}

export class UpdateUsuarioDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  nome?: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email deve ser um email válido' })
  email?: string;

  @ApiProperty({
    description: 'Senha do usuário (8-16 caracteres alfanuméricos)',
    example: 'password123',
    minLength: 8,
    maxLength: 16,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(16, { message: 'Senha deve ter no máximo 16 caracteres' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'Senha deve conter apenas caracteres alfanuméricos',
  })
  senha?: string;

  @ApiProperty({
    description: 'Telefone do usuário (DDI + DDD + NUMERO)',
    example: '5511999999999',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  @Matches(/^\d{13}$/, {
    message: 'Telefone deve conter exatamente 13 dígitos (DDI + DDD + NUMERO)',
  })
  telefone?: string;

  @ApiProperty({
    description: 'Role do usuário',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser ADMIN ou USER' })
  role?: UserRole;

  @ApiProperty({
    description: 'Status ativo do usuário',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um boolean' })
  ativo?: boolean;
}

export class UsuarioResponseDto {
  @ApiProperty({ description: 'ID do usuário', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário', example: 'João Silva' })
  nome: string;

  @ApiProperty({ description: 'Email do usuário', example: 'joao@example.com' })
  email: string;

  @ApiProperty({ description: 'Telefone do usuário', example: '5511999999999' })
  telefone: string;

  @ApiProperty({ description: 'Role do usuário', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'Status ativo', example: true })
  ativo: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}