import { PartialType } from '@nestjs/swagger';
import { CreateSaldoInicialDto } from './create-saldo-inicial.dto';

export class UpdateSaldoInicialDto extends PartialType(CreateSaldoInicialDto) {}
