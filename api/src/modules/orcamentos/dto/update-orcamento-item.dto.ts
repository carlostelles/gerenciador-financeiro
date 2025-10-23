import { PartialType } from '@nestjs/swagger';
import { CreateOrcamentoItemDto } from './create-orcamento-item.dto';

export class UpdateOrcamentoItemDto extends PartialType(
  CreateOrcamentoItemDto,
) {}