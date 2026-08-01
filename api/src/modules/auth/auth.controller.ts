import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AlterarSenhaDto, LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas',
    schema: {
      example: {
        message: 'Credenciais inválidas',
      },
    },
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);
    this.setAuthCookies(response, result);
    return result;
  }

  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({
    status: 200,
    description: 'Token renovado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido',
    schema: {
      example: {
        message: 'Refresh token inválido',
      },
    },
  })
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.refresh(refreshTokenDto);
    this.setAuthCookies(response, result);
    return result;
  }

  @ApiOperation({ summary: 'Alterar senha usando email e senha atual' })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Email ou senha atual inválidos',
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('alterar-senha')
  @HttpCode(HttpStatus.OK)
  async alterarSenha(@Body() alterarSenhaDto: AlterarSenhaDto): Promise<{ message: string }> {
    return this.authService.alterarSenha(alterarSenhaDto);
  }

  @ApiOperation({ summary: 'Realizar logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sub);
    response.clearCookie('access_token', AUTH_COOKIE_OPTIONS);
    response.clearCookie('refresh_token', AUTH_COOKIE_OPTIONS);
    return { message: 'Logout realizado com sucesso' };
  }

  private setAuthCookies(response: Response, tokens: AuthResponseDto): void {
    response.cookie('access_token', tokens.accessToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: tokens.expiresIn * 1000,
    });
    response.cookie('refresh_token', tokens.refreshToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}