import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
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
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
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
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(refreshTokenDto);
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
  async logout(@CurrentUser() user: any): Promise<{ message: string }> {
    await this.authService.logout(user.sub);
    return { message: 'Logout realizado com sucesso' };
  }
}