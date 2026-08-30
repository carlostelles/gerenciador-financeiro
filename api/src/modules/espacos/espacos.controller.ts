import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EspacoId } from '../../common/decorators/espaco-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AddEspacoMembroDto,
  CreateEspacoDto,
  TransferirPropriedadeDto,
  UpdateEspacoDto,
  UpdateEspacoMembroDto,
} from './dto/espaco.dto';
import { EspacosService } from './espacos.service';

@ApiTags('espacos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('espacos')
export class EspacosController {
  constructor(private readonly service: EspacosService) {}

  @Post()
  create(@Body() dto: CreateEspacoDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.sub);
  }

  @Get('contexto')
  contexto(@EspacoId() espacoId: number | undefined, @CurrentUser() user: any) {
    return this.service.resolveContext(espacoId, user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEspacoDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.remove(id, user.sub);
  }

  @Get(':id/membros')
  membros(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.listMembers(id, user.sub);
  }

  @Post(':id/membros')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddEspacoMembroDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addMember(id, dto, user.sub);
  }

  @Patch(':id/membros/:usuarioId')
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: UpdateEspacoMembroDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateMember(id, usuarioId, dto, user.sub);
  }

  @Delete(':id/membros/:usuarioId')
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.removeMember(id, usuarioId, user.sub);
  }

  @Post(':id/sair')
  leave(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.leave(id, user.sub);
  }

  @Post(':id/transferir-propriedade')
  transfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferirPropriedadeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.transferOwnership(id, dto, user.sub);
  }
}
