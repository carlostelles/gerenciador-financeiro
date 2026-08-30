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
import { WhatsappJobQueueService } from './services/whatsapp-job-queue.service';
import { MetaWhatsappClientService } from './services/meta-whatsapp-client.service';
import { WhatsappInboundResult } from './entities/whatsapp-inbound-result.entity';
import { extname } from 'path';
import {
  WhatsappCheckpointEtapa,
  WhatsappInboundCheckpoint,
} from './entities/whatsapp-inbound-checkpoint.entity';
import { AnaliseArquivoPreparada } from '../movimentacoes/movimentacoes.service';
import { AnalisarComprovanteResponseDto } from '../movimentacoes/dto/analisar-comprovante-response.dto';

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
    private readonly jobQueue: WhatsappJobQueueService,
    private readonly metaClient: MetaWhatsappClientService,
    @InjectRepository(WhatsappInboundResult)
    private readonly inboundResultRepository: Repository<WhatsappInboundResult>,
    @InjectRepository(WhatsappInboundCheckpoint)
    private readonly checkpointRepository: Repository<WhatsappInboundCheckpoint>,
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
    this.verifyWebhookSignature(signatureHeader, rawBody);

    if (
      payload?.object !== 'whatsapp_business_account' ||
      !Array.isArray(payload?.entry)
    ) {
      throw new BadRequestException('Estrutura do webhook WhatsApp invalida');
    }

    const entryList = payload.entry;

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
            {
              id: status?.id || null,
              status: status?.status || null,
              timestamp: status?.timestamp || null,
              recipientId: status?.recipient_id || null,
            },
          );
        }

        const messages = Array.isArray(value.messages) ? value.messages : [];
        if (messages.length) {
          this.metaClient.validateWebhookPhoneNumberId(
            String(value?.metadata?.phone_number_id || ''),
          );
        }
        for (const message of messages) {
          const providerMessageId = String(message?.id || '').trim();
          if (!providerMessageId) {
            throw new BadRequestException('Mensagem WhatsApp sem wamid');
          }
          const sanitized = this.sanitizeInboundMessage(
            message,
            value?.metadata?.phone_number_id,
          );
          await this.jobQueue.enqueue(providerMessageId, sanitized);
          await this.saveWebhookEventIfNew(
            this.hashJson('message', { id: providerMessageId }),
            'message',
            providerMessageId,
            sanitized,
          );
        }
      }
    }
  }

  async processarMensagemRecebida(message: any): Promise<void> {
    const telefoneRecebido = String(message?.from || '').replace(/\D/g, '');
    const telefoneOrigem = this.normalizarTelefone(telefoneRecebido);
    const providerMessageId = String(message?.id || '').trim();

    if (!telefoneOrigem || !providerMessageId) {
      return;
    }

    const tipoMensagem = this.mapTipoMensagem(message);
    const texto = this.extractTextoMensagem(message);
    const mediaId = this.extractMediaId(message);
    const mimeType = this.extractMimeType(message);
    const nomeArquivo = this.extractNomeArquivo(message);

    const existente = await this.inboundMessageRepository.findOne({
      where: { providerMessageId },
    });
    if (
      existente?.statusProcessamento ===
      WhatsappInboundProcessingStatus.PROCESSADA
    ) {
      return;
    }

    const usuario = await this.findUsuarioByTelefone(telefoneRecebido);

    const inbound =
      existente ||
      (await this.inboundMessageRepository.save(
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
      ));

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

      const media = await this.metaClient.downloadMedia(
        mediaId || '',
        String(message?.phoneNumberId || ''),
      );
      const arquivo = {
        originalname: this.sanitizeFileName(
          nomeArquivo,
          providerMessageId,
          media.mimeType,
        ),
        mimetype: media.mimeType,
        size: media.size,
        buffer: media.buffer,
      };
      const uploadCheckpoint = await this.buscarCheckpoint(
        providerMessageId,
        WhatsappCheckpointEtapa.UPLOAD,
        0,
      );
      const analiseCheckpoint = await this.buscarCheckpoint(
        providerMessageId,
        WhatsappCheckpointEtapa.ANALISE,
        0,
      );
      const preparado: Partial<AnaliseArquivoPreparada> = {
        ...(uploadCheckpoint
          ? {
              upload: uploadCheckpoint.dados
                .upload as AnaliseArquivoPreparada['upload'],
            }
          : {}),
        ...(analiseCheckpoint
          ? {
              analise: analiseCheckpoint.dados
                .analise as AnaliseArquivoPreparada['analise'],
            }
          : {}),
      };
      const processamento =
        await this.movimentacoesService.analisarArquivoAutomaticamente(
          arquivo,
          usuario.id,
          texto,
          {
            idempotencyKeyPrefix: `whatsapp:${providerMessageId}`,
            storageIdempotencyKey: `whatsapp:${providerMessageId}:${media.sha256}`,
            preparado,
            onUploadConcluido: async (upload) => {
              await this.salvarCheckpoint(
                providerMessageId,
                WhatsappCheckpointEtapa.UPLOAD,
                0,
                { upload },
              );
            },
            onAnaliseConcluida: async (analise) => {
              await this.salvarCheckpoint(
                providerMessageId,
                WhatsappCheckpointEtapa.ANALISE,
                0,
                { analise },
              );
            },
            onResultadoConcluido: async (resultado, ordinal) => {
              await this.salvarResultadoInbound(inbound.id, resultado, ordinal);
              await this.salvarCheckpoint(
                providerMessageId,
                WhatsappCheckpointEtapa.RESULTADO,
                ordinal,
                {
                  movimentoId: resultado.salvamento.movimentoId || null,
                  comprovanteId: resultado.comprovanteId,
                  status: resultado.salvamento.status,
                },
              );
            },
          },
        );
      inbound.intentDetectada =
        processamento.tipoDocumento === 'extrato'
          ? WhatsappIntentType.EXTRATO
          : WhatsappIntentType.COMPROVANTE;
      inbound.statusProcessamento = WhatsappInboundProcessingStatus.PROCESSADA;
      inbound.movimentoId =
        processamento.resultados[0]?.salvamento.movimentoId || null;
      inbound.periodoReferencia =
        processamento.resultados[0]?.sugestao.periodo || null;
      inbound.detalhesProcessamento = {
        ...(inbound.detalhesProcessamento || {}),
        acao: 'movimentacao_criada_automaticamente',
        tipoDocumento: processamento.tipoDocumento,
        quantidadeResultados: processamento.resultados.length,
        sha256: media.sha256,
      };
      await Promise.all(
        processamento.resultados.map((resultado, ordinal) =>
          this.salvarResultadoInbound(inbound.id, resultado, ordinal),
        ),
      );
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
          providerMessageId,
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

  private buscarCheckpoint(
    providerMessageId: string,
    etapa: WhatsappCheckpointEtapa,
    ordinal: number,
  ): Promise<WhatsappInboundCheckpoint | null> {
    return this.checkpointRepository.findOne({
      where: { providerMessageId, etapa, ordinal },
    });
  }

  private async salvarCheckpoint(
    providerMessageId: string,
    etapa: WhatsappCheckpointEtapa,
    ordinal: number,
    dados: Record<string, unknown>,
  ): Promise<void> {
    const existente = await this.buscarCheckpoint(
      providerMessageId,
      etapa,
      ordinal,
    );
    try {
      await this.checkpointRepository.save(
        existente
          ? Object.assign(existente, { dados })
          : this.checkpointRepository.create({
              providerMessageId,
              etapa,
              ordinal,
              dados,
            }),
      );
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  private async salvarResultadoInbound(
    inboundMessageId: number,
    resultado: AnalisarComprovanteResponseDto,
    ordinal: number,
  ): Promise<void> {
    const existente = await this.inboundResultRepository.findOne({
      where: { inboundMessageId, ordinal },
    });
    const dados = {
      inboundMessageId,
      movimentoId: resultado.salvamento.movimentoId || null,
      comprovanteId: resultado.comprovanteId,
      ordinal,
      status: resultado.salvamento.status,
      detalhes: {
        camposObrigatoriosFaltantes: resultado.camposObrigatoriosFaltantes,
      },
    };
    try {
      await this.inboundResultRepository.save(
        existente
          ? Object.assign(existente, dados)
          : this.inboundResultRepository.create(dados),
      );
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) {
        throw error;
      }
    }
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
    providerMessageId: string,
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
      `whatsapp:${providerMessageId}:texto:0`,
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
    if (!rawBody) {
      throw new BadRequestException('Body bruto do webhook indisponivel');
    }
    const bodyBuffer = rawBody;
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
    const usuarios = await this.usuarioRepository.find({
      where: { telefone: In(this.telefoneCandidatos(telefone)), ativo: true },
      select: ['id', 'telefone', 'ativo'],
    });
    return usuarios.length === 1 ? usuarios[0] : null;
  }

  private telefoneCandidatos(telefone: string): string[] {
    const recebida = (telefone || '').replace(/\D/g, '');
    const canonica = recebida.startsWith('55')
      ? recebida
      : recebida.length === 10 || recebida.length === 11
        ? `55${recebida}`
        : recebida;
    const candidatos = new Set<string>([recebida, canonica]);
    if (/^55\d{2}\d{8}$/.test(canonica)) {
      candidatos.add(`${canonica.slice(0, 4)}9${canonica.slice(4)}`);
    } else if (/^55\d{2}9\d{8}$/.test(canonica)) {
      candidatos.add(`${canonica.slice(0, 4)}${canonica.slice(5)}`);
    }
    return [...candidatos].filter(Boolean);
  }

  private sanitizeInboundMessage(
    message: any,
    phoneNumberId: unknown,
  ): Record<string, unknown> {
    const type = String(message?.type || '').toLowerCase();
    const media = message?.[type] || {};
    return {
      id: String(message?.id || '').slice(0, 120),
      from: String(message?.from || '')
        .replace(/\D/g, '')
        .slice(0, 20),
      timestamp: String(message?.timestamp || '').slice(0, 20),
      type: type.slice(0, 30),
      phoneNumberId: String(phoneNumberId || '').slice(0, 120),
      text:
        type === 'text'
          ? { body: String(message?.text?.body || '').slice(0, 4000) }
          : undefined,
      [type]: ['image', 'document', 'audio'].includes(type)
        ? {
            id: String(media?.id || '').slice(0, 120),
            mime_type: String(media?.mime_type || '').slice(0, 255),
            caption: String(media?.caption || '').slice(0, 1000),
            filename: String(media?.filename || '').slice(0, 255),
          }
        : undefined,
    };
  }

  private sanitizeFileName(
    name: string | null,
    providerMessageId: string,
    mimeType: string,
  ): string {
    const extensionByMime: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'image/heif': '.heif',
    };
    const base = String(name || providerMessageId)
      .split(/[\\/]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(0, 180);
    return extname(base) ? base : `${base}${extensionByMime[mimeType] || ''}`;
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
