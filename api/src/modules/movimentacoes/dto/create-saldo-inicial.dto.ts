import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { SaldoInicialOrigem } from '../entities/saldo-inicial.entity';

export class CreateSaldoInicialDto {
  @ApiProperty({ description: 'ID da conta', example: 1 })
  @IsNotEmpty({ message: 'O campo contaId é obrigatório' })
  @IsNumber({}, { message: 'O contaId deve ser um número' })
  contaId: number;

  @ApiProperty({ description: 'Valor do saldo inicial', example: 1500.5 })
  @IsNotEmpty({ message: 'O campo valor é obrigatório' })
  @IsNumber({}, { message: 'O valor deve ser um número' })
  valor: number;

  @ApiPropertyOptional({
    description: 'Origem do saldo inicial',
    enum: SaldoInicialOrigem,
    example: SaldoInicialOrigem.MANUAL,
  })
  @IsOptional()
  @IsEnum(SaldoInicialOrigem, {
    message: 'A origem deve ser AUTO ou MANUAL',
  })
  origem?: SaldoInicialOrigem;
}
