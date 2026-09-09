import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_PATTERN } from './password-reset.rules';

export class SolicitarRecuperacaoDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class RedefinirSenhaDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message: 'Nova senha deve ter de 8 a 16 caracteres permitidos',
  })
  novaSenha: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message: 'Confirmação deve ter de 8 a 16 caracteres permitidos',
  })
  confirmarSenha: string;
}
