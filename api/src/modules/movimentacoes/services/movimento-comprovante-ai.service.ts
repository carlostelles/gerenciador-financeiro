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
  tipoDocumento: 'comprovante' | 'extrato';
  lancamentos: AnaliseLancamentoExtrato[];
}

export interface AnaliseLancamentoExtrato {
  data: string | null;
  valor: number | null;
  descricao: string | null;
  categoriaId: number | null;
  contaId: number | null;
  tipo: 'entrada' | 'saida' | null;
}

@Injectable()
export class MovimentoComprovanteAiService {
  private readonly client: GoogleGenerativeAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
  }

  async analisarComprovante(
    arquivo: ComprovanteUploadFile,
    categorias: Categoria[],
    contas: Conta[],
    contexto?: string,
  ): Promise<AnaliseComprovanteResultado> {
    if (!this.client) {
      throw new InternalServerErrorException(
        'Integração com IA não configurada para análise de comprovantes',
      );
    }

    const model = this.client.getGenerativeModel({ model: this.model });
    const prompt = [
      'Você é um extrator de dados financeiros a partir de comprovantes de pagamento e extratos bancários.',
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
      '- Identifique tipoDocumento como "extrato" somente quando o arquivo listar vários lançamentos de uma conta bancária; caso contrário, use "comprovante".',
      '- Para extratos, extraia TODOS os lançamentos de entrada e saída em lancamentos. Cada lançamento deve ter data, valor absoluto positivo, descricao, categoriaId, contaId e tipo (entrada ou saida).',
      '- Não inclua saldo inicial, saldo final, tarifas de resumo, cabeçalhos ou totais como lançamentos.',
      '- Em extratos, use a conta identificada no arquivo em cada lançamento. Classifique PIX e transferências pela natureza de entrada ou saída exibida.',
      contexto?.trim()
        ? `Legenda fornecida com o arquivo, use-a também na classificação: ${contexto.trim().slice(0, 1000)}`
        : null,
      'JSON esperado:',
      '{"tipoDocumento":"comprovante"|"extrato","data":string|null,"valor":number|null,"descricao":string|null,"categoriaId":number|null,"contaId":number|null,"lancamentos":[{"data":string|null,"valor":number|null,"descricao":string|null,"categoriaId":number|null,"contaId":number|null,"tipo":"entrada"|"saida"|null}]}',
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
          tags:
            conta.tags
              ?.split(',')
              .map((tag) => tag.trim())
              .filter(Boolean) || [],
        })),
      )}`,
    ]
      .filter(Boolean)
      .join('\n');

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
    const normalizarLancamento = (
      lancamento: Partial<AnaliseLancamentoExtrato>,
    ): AnaliseLancamentoExtrato => ({
      data:
        lancamento.data && /^\d{4}-\d{2}-\d{2}$/.test(lancamento.data)
          ? lancamento.data
          : null,
      valor:
        typeof lancamento.valor === 'number' &&
        Number.isFinite(lancamento.valor)
          ? Math.abs(lancamento.valor)
          : null,
      descricao:
        typeof lancamento.descricao === 'string' && lancamento.descricao.trim()
          ? lancamento.descricao.trim()
          : null,
      categoriaId:
        typeof lancamento.categoriaId === 'number'
          ? lancamento.categoriaId
          : null,
      contaId:
        typeof lancamento.contaId === 'number' ? lancamento.contaId : null,
      tipo:
        lancamento.tipo === 'entrada' || lancamento.tipo === 'saida'
          ? lancamento.tipo
          : null,
    });
    const lancamentoPrincipal = normalizarLancamento(parsed);

    return {
      ...lancamentoPrincipal,
      periodo: lancamentoPrincipal.data
        ? lancamentoPrincipal.data.slice(0, 7)
        : null,
      tipoDocumento:
        parsed.tipoDocumento === 'extrato' ? 'extrato' : 'comprovante',
      lancamentos: Array.isArray(parsed.lancamentos)
        ? parsed.lancamentos.map(normalizarLancamento)
        : [],
    };
  }
}
