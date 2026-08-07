import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { WhatsappWebhookEvent } from './entities/whatsapp-webhook-event.entity';
import {
  WhatsappInboundMessageType,
  WhatsappInboundProcessingStatus,
  WhatsappIntentType,
} from './whatsapp.types';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Movimento } from '../movimentacoes/entities/movimento.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { MovimentacoesService } from '../movimentacoes/movimentacoes.service';
import { WhatsappIntentParserService } from './services/whatsapp-intent-parser.service';
import { ListWhatsappInboundQueryDto } from './dto/list-whatsapp-inbound-query.dto';
import { WhatsappInboundMessage } from './entities/whatsapp-inbound-message.entity';
import { CategoriaTipo } from '../../common/types';

@Injectable()
export class WhatsappService {
  constructor(
    @InjectRepository(WhatsappWebhookEvent)
    private readonly webhookEventRepository: Repository<WhatsappWebhookEvent>,
    @InjectRepository(WhatsappInboundMessage)
    private readonly inboundMessageRepository: Repository<WhatsappInboundMessage>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Movimento)
    private readonly movimentoRepository: Repository<Movimento>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    private readonly movimentacoesService: MovimentacoesService,
    private readonly intentParser: WhatsappIntentParserService,
  ) {}

  async listarInbound(
    usuarioId: number,
    query: ListWhatsappInboundQueryDto,
  ): Promise<WhatsappInboundMessage[]> {
    const where = {
      usuarioId,
      ...(query.status ? { statusProcessamento: query.status } : {}),
    };

    return this.inboundMessageRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit || 50,
    });
  }

  async verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
  ): Promise<string> {
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

    if (mode !== 'subscribe' || !expectedToken || token !== expectedToken) {
      throw new BadRequestException(
        'Falha na verificacao do webhook do WhatsApp',
      );
    }

    return challenge;
  }

  async processWebhookPayload(
    payload: any,
    signatureHeader?: string,
    rawBody?: Buffer,
  ): Promise<void> {
    this.verifyWebhookSignature(signatureHeader, rawBody, payload);

    const entryList = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entryList) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value || {};

        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const status of statuses) {
          const idempotencyKey = this.hashJson('status', {
            id: status?.id,
            status: status?.status,
            timestamp: status?.timestamp,
            recipient_id: status?.recipient_id,
          });

          await this.saveWebhookEventIfNew(
            idempotencyKey,
            'status',
            status?.id || null,
            status,
          );
        }

        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const message of messages) {
          const idempotencyKey = this.hashJson('message', {
            id: message?.id,
            from: message?.from,
            timestamp: message?.timestamp,
            type: message?.type,
            text: message?.text?.body,
          });

          const inserted = await this.saveWebhookEventIfNew(
            idempotencyKey,
            'message',
            message?.id || null,
            message,
          );

          if (inserted) {
            await this.processarMensagemRecebida(message);
          }
        }
      }
    }
  }

  private async processarMensagemRecebida(message: any): Promise<void> {
    const telefoneOrigem = this.normalizarTelefone(message?.from || '');
    const providerMessageId = String(message?.id || '').trim();

    if (!telefoneOrigem || !providerMessageId) {
      return;
    }

    const tipoMensagem = this.mapTipoMensagem(message);
    const texto = this.extractTextoMensagem(message);
    const mediaId = this.extractMediaId(message);
    const mimeType = this.extractMimeType(message);
    const nomeArquivo = this.extractNomeArquivo(message);

    const usuario = await this.findUsuarioByTelefone(telefoneOrigem);

    const inbound = await this.inboundMessageRepository.save(
      this.inboundMessageRepository.create({
        usuarioId: usuario?.id || null,
        telefoneOrigem,
        providerMessageId,
        tipoMensagem,
        intentDetectada:
          tipoMensagem === WhatsappInboundMessageType.IMAGE ||
          tipoMensagem === WhatsappInboundMessageType.DOCUMENT
            ? WhatsappIntentType.COMPROVANTE
            : WhatsappIntentType.DESCONHECIDA,
        statusProcessamento: WhatsappInboundProcessingStatus.RECEBIDA,
        mediaId,
        mimeType,
        nomeArquivo,
        movimentoId: null,
        periodoReferencia: null,
        texto: texto || null,
        erroProcessamento: null,
        detalhesProcessamento: {
          providerTimestamp: message?.timestamp || null,
          messageType: message?.type || null,
        },
      }),
    );

    if (!usuario) {
      await this.marcarFalhaProcessamento(
        inbound,
        'Usuario nao identificado para o telefone informado',
      );
      return;
    }

    if (tipoMensagem === WhatsappInboundMessageType.AUDIO) {
      inbound.statusProcessamento =
        WhatsappInboundProcessingStatus.IGNORADA_NAO_SUPORTADA;
      inbound.erroProcessamento = 'Audio nao suportado no fluxo inbound';
      inbound.detalhesProcessamento = {
        ...(inbound.detalhesProcessamento || {}),
        motivo: 'audio_nao_suportado',
      };
      await this.inboundMessageRepository.save(inbound);
      return;
    }

    if (tipoMensagem === WhatsappInboundMessageType.UNSUPPORTED) {
      inbound.statusProcessamento =
        WhatsappInboundProcessingStatus.IGNORADA_NAO_SUPORTADA;
      inbound.erroProcessamento = 'Tipo de mensagem nao suportado';
      await this.inboundMessageRepository.save(inbound);
      return;
    }

    if (
      tipoMensagem === WhatsappInboundMessageType.IMAGE ||
      tipoMensagem === WhatsappInboundMessageType.DOCUMENT
    ) {
      const mimeNormalizado = (mimeType || '').toLowerCase();
      const documentoSuportado =
        mimeNormalizado.startsWith('image/') ||
        mimeNormalizado === 'application/pdf';

      if (!documentoSuportado) {
        inbound.statusProcessamento =
          WhatsappInboundProcessingStatus.IGNORADA_NAO_SUPORTADA;
        inbound.erroProcessamento =
          'Apenas anexos de imagem ou PDF sao suportados';
        await this.inboundMessageRepository.save(inbound);
        return;
      }

      const movimento = await this.criarMovimentacaoPorComprovante(
        usuario.id,
        message,
        texto,
        mimeType || '',
        nomeArquivo || '',
      );
      inbound.intentDetectada = WhatsappIntentType.COMPROVANTE;
      inbound.statusProcessamento = WhatsappInboundProcessingStatus.PROCESSADA;
      inbound.movimentoId = movimento.id;
      inbound.periodoReferencia = movimento.periodo;
      inbound.detalhesProcessamento = {
        ...(inbound.detalhesProcessamento || {}),
        acao: 'movimentacao_criada_automaticamente',
      };
      await this.inboundMessageRepository.save(inbound);
      return;
    }

    const intent = this.intentParser.parse(texto || '');
    inbound.intentDetectada = intent.type;

    if (intent.type === WhatsappIntentType.NOVA_MOVIMENTACAO) {
      try {
        const movimento = await this.processarIntentNovaMovimentacao(
          usuario.id,
          intent.payload,
        );
        inbound.statusProcessamento =
          WhatsappInboundProcessingStatus.PROCESSADA;
        inbound.movimentoId = movimento.id;
        inbound.periodoReferencia = movimento.periodo;
        inbound.detalhesProcessamento = {
          ...(inbound.detalhesProcessamento || {}),
          acao: 'movimentacao_criada_por_texto',
        };
      } catch (error: any) {
        await this.marcarFalhaProcessamento(
          inbound,
          error?.message || 'Falha ao criar movimentacao',
        );
        return;
      }

      await this.inboundMessageRepository.save(inbound);
      return;
    }

    if (intent.type === WhatsappIntentType.EXTRATO) {
      const periodo = intent.payload.periodoInicio || this.getPeriodoAtual();
      inbound.statusProcessamento = WhatsappInboundProcessingStatus.PROCESSADA;
      inbound.periodoReferencia = periodo;
      inbound.detalhesProcessamento = {
        ...(inbound.detalhesProcessamento || {}),
        acao: 'solicitacao_extrato_registrada',
        periodoInicio: periodo,
        periodoFim: periodo,
        notificacaoApp: false,
      };
      await this.inboundMessageRepository.save(inbound);
      return;
    }

    inbound.statusProcessamento =
      WhatsappInboundProcessingStatus.IGNORADA_NAO_SUPORTADA;
    inbound.erroProcessamento = 'Intencao nao reconhecida';
    await this.inboundMessageRepository.save(inbound);
  }

  private async processarIntentNovaMovimentacao(
    usuarioId: number,
    payload: {
      valor?: number;
      data?: string;
      categoriaNome?: string;
      descricao?: string;
      tipoMovimento?: 'RECEITA' | 'DESPESA';
    },
  ): Promise<Movimento> {
    if (!payload.valor || !payload.data || !payload.categoriaNome) {
      throw new BadRequestException(
        'Dados insuficientes para criar movimentacao por texto. Informe valor, data e categoria.',
      );
    }

    const categorias = await this.categoriaRepository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });

    const categoria = categorias.find((item) => {
      const nome = item.nome.toLowerCase();
      const alvo = payload.categoriaNome!.toLowerCase();
      return nome.includes(alvo) || alvo.includes(nome);
    });

    if (!categoria) {
      throw new BadRequestException(
        `Categoria \"${payload.categoriaNome}\" nao encontrada.`,
      );
    }

    const periodo = payload.data.slice(0, 7);

    return this.movimentacoesService.create(
      periodo,
      {
        data: payload.data,
        valor: payload.valor,
        categoriaId: categoria.id,
        descricao: payload.descricao || 'Movimentacao criada via WhatsApp',
        revisado: false,
      },
      usuarioId,
    );
  }

  private async saveWebhookEventIfNew(
    idempotencyKey: string,
    tipo: string,
    providerMessageId: string | null,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const existing = await this.webhookEventRepository.findOne({
      where: { idempotencyKey },
    });

    if (existing) {
      return false;
    }

    try {
      await this.webhookEventRepository.save(
        this.webhookEventRepository.create({
          idempotencyKey,
          tipo,
          providerMessageId,
          payload,
        }),
      );
    } catch (error: any) {
      if (this.isDuplicateKeyError(error)) {
        return false;
      }
      throw error;
    }

    return true;
  }

  private hashJson(prefix: string, payload: Record<string, unknown>): string {
    return createHash('sha256')
      .update(`${prefix}:${JSON.stringify(payload)}`)
      .digest('hex')
      .slice(0, 64);
  }

  private verifyWebhookSignature(
    signatureHeader: string | undefined,
    rawBody: Buffer | undefined,
    payload: unknown,
  ): void {
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';

    if (!appSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException(
          'Segredo do webhook WhatsApp nao configurado',
        );
      }
      return;
    }

    if (!signatureHeader?.startsWith('sha256=')) {
      throw new BadRequestException(
        'Assinatura do webhook ausente ou invalida',
      );
    }

    const signature = signatureHeader.slice('sha256='.length);
    const bodyBuffer = rawBody || Buffer.from(JSON.stringify(payload || {}));
    const expected = createHmac('sha256', appSecret)
      .update(bodyBuffer)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Assinatura do webhook invalida');
    }
  }

  private isDuplicateKeyError(error: any): boolean {
    const code = error?.code;
    const message = String(error?.message || '');
    return code === 'ER_DUP_ENTRY' || message.includes('Duplicate entry');
  }

  private async findUsuarioByTelefone(
    telefone: string,
  ): Promise<Usuario | null> {
    const candidatos = new Set<string>([telefone]);
    if (telefone.startsWith('55')) {
      candidatos.add(telefone.slice(2));
    }
    if (telefone.length === 11) {
      candidatos.add(`55${telefone}`);
    }

    return this.usuarioRepository.findOne({
      where: { telefone: In([...candidatos]) },
      select: ['id', 'telefone'],
    });
  }

  private async criarMovimentacaoPorComprovante(
    usuarioId: number,
    message: any,
    texto: string,
    mimeType: string,
    nomeArquivo: string,
  ): Promise<Movimento> {
    const data = this.resolveMessageDate(message?.timestamp);
    const periodo = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

    const categoriaPreferencial = await this.categoriaRepository.findOne({
      where: { usuarioId, tipo: CategoriaTipo.DESPESA },
      order: { id: 'ASC' },
    });
    const categoriaFallback =
      categoriaPreferencial ||
      (await this.categoriaRepository.findOne({
        where: { usuarioId },
        order: { id: 'ASC' },
      }));

    const descricao = [
      'Comprovante recebido via WhatsApp',
      nomeArquivo ? `Arquivo: ${nomeArquivo}` : null,
      mimeType ? `Tipo: ${mimeType}` : null,
      texto ? `Observacao: ${texto}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return this.movimentoRepository.save(
      this.movimentoRepository.create({
        usuarioId,
        periodo,
        data,
        descricao,
        valor: null,
        categoriaId: categoriaFallback?.id || null,
        revisado: false,
      }),
    );
  }

  private resolveMessageDate(timestamp: string | undefined): Date {
    const parsed = Number(timestamp || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return new Date();
    }
    return new Date(parsed * 1000);
  }

  private mapTipoMensagem(message: any): WhatsappInboundMessageType {
    const type = String(message?.type || '').toLowerCase();

    if (type === 'text') {
      return WhatsappInboundMessageType.TEXT;
    }
    if (type === 'image') {
      return WhatsappInboundMessageType.IMAGE;
    }
    if (type === 'document') {
      return WhatsappInboundMessageType.DOCUMENT;
    }
    if (type === 'audio' || type === 'voice') {
      return WhatsappInboundMessageType.AUDIO;
    }

    return WhatsappInboundMessageType.UNSUPPORTED;
  }

  private extractTextoMensagem(message: any): string {
    return String(
      message?.text?.body ||
        message?.image?.caption ||
        message?.document?.caption ||
        '',
    ).trim();
  }

  private extractMediaId(message: any): string | null {
    return (
      message?.image?.id || message?.document?.id || message?.audio?.id || null
    );
  }

  private extractMimeType(message: any): string | null {
    return (
      message?.image?.mime_type ||
      message?.document?.mime_type ||
      message?.audio?.mime_type ||
      null
    );
  }

  private extractNomeArquivo(message: any): string | null {
    return message?.document?.filename || null;
  }

  private async marcarFalhaProcessamento(
    inbound: WhatsappInboundMessage,
    erro: string,
  ): Promise<void> {
    inbound.statusProcessamento = WhatsappInboundProcessingStatus.FALHA;
    inbound.erroProcessamento = erro;
    await this.inboundMessageRepository.save(inbound);
  }

  private normalizarTelefone(telefone: string): string {
    const digits = (telefone || '').replace(/\D/g, '');

    if (!digits) {
      return '';
    }

    if (digits.startsWith('55')) {
      return digits;
    }

    if (digits.length === 11) {
      return `55${digits}`;
    }

    return digits;
  }

  private getPeriodoAtual(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
