import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { LogsService } from '../logs/logs.service';
import { LogAcao } from '../../common/types';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logsService: LogsService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, senha } = loginDto;

    const usuario = await this.usuariosService.findByEmail(email);
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Log da ação de login
    await this.logsService.create({
      data: new Date(),
      usuarioId: usuario.id,
      descricao: `Login realizado para o usuário ${usuario.email}`,
      acao: LogAcao.LOGIN,
    });

    return this.generateTokens(usuario.id, usuario.email, usuario.role);
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      Logger.log(`Payload: ${JSON.stringify(payload)}`, 'AuthService');
      const usuario = await this.usuariosService.findOne(payload.sub);
      if (!usuario || !usuario.ativo) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      return this.generateTokens(usuario.id, usuario.email, usuario.role);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: number): Promise<void> {
    const usuario = await this.usuariosService.findOne(userId);
    
    // Log da ação de logout
    await this.logsService.create({
      data: new Date(),
      usuarioId: userId,
      descricao: `Logout realizado para o usuário ${usuario.email}`,
      acao: LogAcao.LOGOUT,
    });
  }

  private async generateTokens(
    userId: number,
    email: string,
    role: string,
  ): Promise<AuthResponseDto> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 300, // 5 minutes
    };
  }
}