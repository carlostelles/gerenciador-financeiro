import { WhatsappIntentParserService } from './whatsapp-intent-parser.service';
import { WhatsappIntentType } from '../whatsapp.types';

describe('WhatsappIntentParserService', () => {
  let service: WhatsappIntentParserService;

  beforeEach(() => {
    service = new WhatsappIntentParserService();
  });

  it('deve detectar intenção de extrato e período informado', () => {
    const result = service.parse('Quero extrato 2026-08');

    expect(result.type).toBe(WhatsappIntentType.EXTRATO);
    expect(result.payload.periodoInicio).toBe('2026-08');
    expect(result.payload.periodoFim).toBe('2026-08');
  });

  it('deve detectar intenção de nova movimentação com valor e data', () => {
    const result = service.parse(
      'nova movimentação valor 123,45 data 2026-08-07 categoria Mercado descricao Feira semanal',
    );

    expect(result.type).toBe(WhatsappIntentType.NOVA_MOVIMENTACAO);
    expect(result.payload.valor).toBe(123.45);
    expect(result.payload.data).toBe('2026-08-07');
    expect(result.payload.categoriaNome).toBe('Mercado');
    expect(result.payload.descricao).toBe('Feira semanal');
  });

  it('deve retornar desconhecida para texto sem intenção', () => {
    const result = service.parse('olá, tudo bem?');

    expect(result.type).toBe(WhatsappIntentType.DESCONHECIDA);
  });
});
