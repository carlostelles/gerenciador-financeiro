import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrcamentosService } from './orcamentos.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { CreateOrcamentoItemDto } from './dto/create-orcamento-item.dto';
import { UpdateOrcamentoItemDto } from './dto/update-orcamento-item.dto';
import { OrcamentoByPeriodoResponseDto } from './dto/find-by-periodo.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EspacoId } from '../../common/decorators/espaco-id.decorator';

@ApiTags('orcamentos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orcamentos')
export class OrcamentosController {
  constructor(private readonly orcamentosService: OrcamentosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo orçamento' })
  @ApiResponse({
    status: 201,
    description: 'Orçamento criado com sucesso',
  })
  @ApiResponse({
    status: 412,
    description: 'Erro de validação',
  })
  create(
    @Body() createOrcamentoDto: CreateOrcamentoDto,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.create(createOrcamentoDto, user.sub)
      : this.orcamentosService.create(createOrcamentoDto, user.sub, espacoId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar orçamentos do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de orçamentos retornada com sucesso',
  })
  findAll(@CurrentUser() user: any, @EspacoId() espacoId?: number) {
    return espacoId === undefined
      ? this.orcamentosService.findAll(user.sub)
      : this.orcamentosService.findAll(user.sub, espacoId);
  }

  @Get('periodos')
  @ApiOperation({
    summary: 'Listar períodos já utilizados nos orçamentos do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de períodos retornada com sucesso',
    type: [String],
  })
  findPeriodos(@CurrentUser() user: any, @EspacoId() espacoId?: number) {
    return espacoId === undefined
      ? this.orcamentosService.findPeriodos(user.sub)
      : this.orcamentosService.findPeriodos(user.sub, espacoId);
  }

  @Get('periodo/:periodo')
  @ApiOperation({ summary: 'Buscar orçamento por período' })
  @ApiParam({
    name: 'periodo',
    description: 'Período do orçamento (formato yyyy-mm)',
    example: '2024-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Orçamento encontrado com sucesso',
    type: OrcamentoByPeriodoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Orçamento não encontrado para o período informado',
  })
  findByPeriodo(
    @Param('periodo') periodo: string,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.findByPeriodo(periodo, user.sub)
      : this.orcamentosService.findByPeriodo(periodo, user.sub, espacoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiResponse({
    status: 200,
    description: 'Orçamento encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Orçamento não encontrado',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.findOne(id, user.sub)
      : this.orcamentosService.findOne(id, user.sub, espacoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiResponse({
    status: 200,
    description: 'Orçamento atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Orçamento não encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrcamentoDto: UpdateOrcamentoDto,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.update(id, updateOrcamentoDto, user.sub)
      : this.orcamentosService.update(
          id,
          updateOrcamentoDto,
          user.sub,
          espacoId,
        );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir um orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiResponse({
    status: 204,
    description: 'Orçamento excluído com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Orçamento não encontrado',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.remove(id, user.sub)
      : this.orcamentosService.remove(id, user.sub, espacoId);
  }

  @Post(':id/clonar/:periodo')
  @ApiOperation({ summary: 'Clonar um orçamento para outro período' })
  @ApiParam({ name: 'id', description: 'ID do orçamento a ser clonado' })
  @ApiParam({ name: 'periodo', description: 'Período de destino (yyyy-mm)' })
  @ApiResponse({
    status: 200,
    description: 'Orçamento clonado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Orçamento não encontrado',
  })
  clone(
    @Param('id', ParseIntPipe) id: number,
    @Param('periodo') periodo: string,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.clone(id, periodo, user.sub)
      : this.orcamentosService.clone(id, periodo, user.sub, espacoId);
  }

  // Endpoints para itens de orçamento
  @Post(':id/itens')
  @ApiOperation({ summary: 'Criar um item de orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiResponse({
    status: 201,
    description: 'Item criado com sucesso',
  })
  createItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() createItemDto: CreateOrcamentoItemDto,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.createItem(id, createItemDto, user.sub)
      : this.orcamentosService.createItem(
          id,
          createItemDto,
          user.sub,
          espacoId,
        );
  }

  @Get(':id/itens')
  @ApiOperation({ summary: 'Listar itens de um orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de itens retornada com sucesso',
  })
  findItems(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.findItems(id, user.sub)
      : this.orcamentosService.findItems(id, user.sub, espacoId);
  }

  @Get(':id/itens/:itemId')
  @ApiOperation({ summary: 'Obter detalhes de um item de orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiParam({ name: 'itemId', description: 'ID do item' })
  @ApiResponse({
    status: 200,
    description: 'Item encontrado',
  })
  findItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.findItem(id, itemId, user.sub)
      : this.orcamentosService.findItem(id, itemId, user.sub, espacoId);
  }

  @Patch(':id/itens/:itemId')
  @ApiOperation({ summary: 'Atualizar um item de orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiParam({ name: 'itemId', description: 'ID do item' })
  @ApiResponse({
    status: 200,
    description: 'Item atualizado com sucesso',
  })
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateItemDto: UpdateOrcamentoItemDto,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.updateItem(id, itemId, updateItemDto, user.sub)
      : this.orcamentosService.updateItem(
          id,
          itemId,
          updateItemDto,
          user.sub,
          espacoId,
        );
  }

  @Delete(':id/itens/:itemId')
  @ApiOperation({ summary: 'Excluir um item de orçamento' })
  @ApiParam({ name: 'id', description: 'ID do orçamento' })
  @ApiParam({ name: 'itemId', description: 'ID do item' })
  @ApiResponse({
    status: 204,
    description: 'Item excluído com sucesso',
  })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.orcamentosService.removeItem(id, itemId, user.sub)
      : this.orcamentosService.removeItem(id, itemId, user.sub, espacoId);
  }
}
