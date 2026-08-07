import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WhatsappService } from './whatsapp.service';
import { ListWhatsappInboundQueryDto } from './dto/list-whatsapp-inbound-query.dto';
import { WhatsappInboundResponseDto } from './dto/whatsapp-inbound-response.dto';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Get('inbound')
  @ApiOperation({
    summary: 'Listar histórico de mensagens recebidas e processamento inbound',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [WhatsappInboundResponseDto] })
  listarInbound(
    @CurrentUser() user: any,
    @Query() query: ListWhatsappInboundQueryDto,
  ) {
    return this.whatsappService.listarInbound(user.sub, query);
  }

  @Public()
  @Get('webhook')
  @ApiOperation({ summary: 'Webhook GET de verificação do WhatsApp Cloud API' })
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challengeParam: string,
    @Res() res: Response,
  ) {
    const challenge = await this.whatsappService.verifyWebhook(
      mode,
      token,
      challengeParam,
    );

    return res.status(200).send(challenge);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'Webhook POST para status e mensagens recebidas do WhatsApp',
  })
  async receiveWebhook(
    @Body() payload: any,
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    const signature = req.headers['x-hub-signature-256'];
    const signatureHeader = Array.isArray(signature) ? signature[0] : signature;

    await this.whatsappService.processWebhookPayload(
      payload,
      signatureHeader,
      req.rawBody,
    );
    return res.status(200).send('EVENT_RECEIVED');
  }
}
