import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateReservaDto } from './create-reserva.dto';

export class UpdateReservaDto extends PartialType(
  OmitType(CreateReservaDto, ['data'] as const),
) {}