import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength, MaxLength } from 'class-validator';

const SAFE_PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|?,.:]+$/;

export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email deve ser um email válido' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'password123',
    minLength: 8,
    maxLength: 16,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(16, { message: 'Senha deve ter no máximo 16 caracteres' })
  @Matches(SAFE_PASSWORD_PATTERN, {
    message: 'Senha contém caracteres não permitidos',
  })
  senha: string;
}

export class AlterarSenhaDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email deve ser um email válido' })
  email: string;

  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'SenhaAtual1!',
    minLength: 8,
    maxLength: 16,
  })
  @IsString({ message: 'Senha atual deve ser uma string' })
  @MinLength(8, { message: 'Senha atual deve ter no mínimo 8 caracteres' })
  @MaxLength(16, { message: 'Senha atual deve ter no máximo 16 caracteres' })
  @Matches(SAFE_PASSWORD_PATTERN, {
    message: 'Senha atual contém caracteres não permitidos',
  })
  senhaAtual: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'NovaSenha1!',
    minLength: 8,
    maxLength: 16,
  })
  @IsString({ message: 'Nova senha deve ser uma string' })
  @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
  @MaxLength(16, { message: 'Nova senha deve ter no máximo 16 caracteres' })
  @Matches(SAFE_PASSWORD_PATTERN, {
    message: 'Nova senha contém caracteres não permitidos',
  })
  novaSenha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'NovaSenha1!',
    minLength: 8,
    maxLength: 16,
  })
  @IsString({ message: 'Confirmação de senha deve ser uma string' })
  @MinLength(8, { message: 'Confirmação de senha deve ter no mínimo 8 caracteres' })
  @MaxLength(16, { message: 'Confirmação de senha deve ter no máximo 16 caracteres' })
  @Matches(SAFE_PASSWORD_PATTERN, {
    message: 'Confirmação de senha contém caracteres não permitidos',
  })
  confirmarSenha: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token deve ser uma string' })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de refresh',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Tipo do token',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Tempo de expiração em segundos',
    example: 300,
  })
  expiresIn: number;
}