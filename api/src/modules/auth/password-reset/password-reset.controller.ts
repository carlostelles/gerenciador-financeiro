import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PasswordResetService } from './password-reset.service';
import {
  RedefinirSenhaDto,
  SolicitarRecuperacaoDto,
} from './password-reset.dto';

@ApiTags('auth')
@Public()
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly reset: PasswordResetService) {}

  @Post('solicitar-recuperacao-senha')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  request(@Body() dto: SolicitarRecuperacaoDto): Promise<{ message: string }> {
    return this.reset.request(dto.email);
  }

  @Post('redefinir-senha')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  confirm(@Body() dto: RedefinirSenhaDto): Promise<{ message: string }> {
    return this.reset.confirm(dto);
  }
}
