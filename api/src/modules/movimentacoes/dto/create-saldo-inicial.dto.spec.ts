import { validate } from 'class-validator';
import { CreateSaldoInicialDto } from './create-saldo-inicial.dto';
import { SaldoInicialOrigem } from '../entities/saldo-inicial.entity';

describe('CreateSaldoInicialDto', () => {
  it('deve aceitar saldo inicial negativo', async () => {
    const dto = Object.assign(new CreateSaldoInicialDto(), {
      contaId: 7,
      valor: -150.75,
      origem: SaldoInicialOrigem.MANUAL,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});