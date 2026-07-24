import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Conta } from '../../contas/entities/conta.entity';
import { ComprovanteUploadFile } from '../types/comprovante-upload-file.type';

export interface AnaliseComprovanteResultado {
  data: string | null;
  periodo: string | null;
  valor: number | null;
  descricao: string | null;
  categoriaId: number | null;
  contaId: number | null;
}

@Injectable()
export class MovimentoComprovanteAiService {
  private readonly client: GoogleGenerativeAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
  }

  async analisarComprovante(
    arquivo: ComprovanteUploadFile,
    categorias: Categoria[],
    contas: Conta[],
  ): Promise<AnaliseComprovanteResultado> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'Integração com IA não configurada para análise de comprovantes',
      );
    }

    const model = this.client.getGenerativeModel({ model: this.model });
    const prompt = [
      'Você é um extrator de dados financeiros a partir de comprovantes de pagamento.',
      'Analise o arquivo anexado e retorne APENAS JSON válido sem markdown.',
      'Regras:',
      '- Extraia a data da movimentação no formato YYYY-MM-DD quando houver confiança suficiente.',
      '- Extraia o valor total pago como número decimal usando ponto.',
      '- Gere uma descrição curta e útil para o lançamento financeiro.',
      '- Escolha categoriaId exclusivamente entre as categorias fornecidas. Se não houver segurança, retorne null.',
      '- Escolha contaId exclusivamente entre as contas fornecidas.',
      '- Para identificar a conta, considere tanto o nome da conta quanto todas as suas tags.',
      '- Compare qualquer informação encontrada no comprovante (banco, cartão, carteira, método de pagamento, identificador ou texto semelhante) com os nomes e tags das contas.',
      '- Se uma tag corresponder de forma confiável a uma informação do comprovante, use a conta correspondente. Se houver mais de uma conta possível, considere aquela que seja mais provável de ser a correta ou, na ausência de evidência suficiente, retorne null.',
      '- Se um campo não puder ser identificado com segurança, retorne null.',
      '- Não invente dados ausentes.',
      'JSON esperado:',
      '{"data":string|null,"valor":number|null,"descricao":string|null,"categoriaId":number|null,"contaId":number|null}',
      `Categorias disponíveis: ${JSON.stringify(
        categorias.map((categoria) => ({
          id: categoria.id,
          nome: categoria.nome,
          tipo: categoria.tipo,
          descricao: categoria.descricao,
        })),
      )}`,
      `Contas disponíveis: ${JSON.stringify(
        contas.map((conta) => ({
          id: conta.id,
          nome: conta.nome,
          tags: conta.tags
            ?.split(',')
            .map((tag) => tag.trim())
            .filter(Boolean) || [],
        })),
      )}`,
    ].join('\n');

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: arquivo.mimetype,
                data: arquivo.buffer.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.response.text().trim();
    const parsed = JSON.parse(rawText) as Partial<AnaliseComprovanteResultado>;

    const data = parsed.data && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data)
      ? parsed.data
      : null;

    return {
      data,
      periodo: data ? data.slice(0, 7) : null,
      valor: typeof parsed.valor === 'number' && Number.isFinite(parsed.valor)
        ? parsed.valor
        : null,
      descricao: typeof parsed.descricao === 'string' && parsed.descricao.trim()
        ? parsed.descricao.trim()
        : null,
      categoriaId: typeof parsed.categoriaId === 'number' ? parsed.categoriaId : null,
      contaId: typeof parsed.contaId === 'number' ? parsed.contaId : null,
    };
  }
}