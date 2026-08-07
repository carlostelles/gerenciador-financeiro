import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WhatsappInboundProcessingStatus } from '../whatsapp.types';

export class ListWhatsappInboundQueryDto {
  @ApiPropertyOptional({ enum: WhatsappInboundProcessingStatus })
  @IsOptional()
  @IsEnum(WhatsappInboundProcessingStatus)
  status?: WhatsappInboundProcessingStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
