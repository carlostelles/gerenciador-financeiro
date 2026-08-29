import { PartialType } from '@nestjs/swagger';
import { CreateMovimentoDto } from './create-movimento.dto';

export class UpdateMovimentoDto extends PartialType(CreateMovimentoDto) {}
