import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DataSource } from 'typeorm';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';
import { credentialVersionMatches } from '../../modules/auth/password-reset/password-reset.rules';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0)
        throw new UnauthorizedException();
      const user = await this.dataSource.getRepository(Usuario).findOne({
        where: { id: payload.sub },
        select: ['id', 'ativo', 'credenciaisVersao'],
      });
      if (
        !user?.ativo ||
        !credentialVersionMatches(payload, user.credenciaisVersao)
      )
        throw new UnauthorizedException();
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }
    return request.cookies?.access_token;
  }
}
