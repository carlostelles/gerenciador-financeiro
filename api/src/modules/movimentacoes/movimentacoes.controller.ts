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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MovimentacoesService } from './movimentacoes.service';
import { CreateMovimentoDto } from './dto/create-movimento.dto';
import { UpdateMovimentoDto } from './dto/update-movimento.dto';
import { FindMovimentosQueryDto } from './dto/find-movimentos-query.dto';
import { FindResumoQueryDto } from './dto/find-resumo-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('movimentacoes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movimentacoes')
export class MovimentacoesController {
  constructor(private readonly movimentacoesService: MovimentacoesService) {}

  @Get('periodos')
  @ApiOperation({ summary: 'Listar períodos com movimentações' })
  @ApiResponse({
    status: 200,
    description: 'Lista de períodos retornada com sucesso',
  })
  findPeriodos(@CurrentUser() user: any) {
    return this.movimentacoesService.findPeriodos(user.sub);
  }

  @Get('comparativo')
  @ApiOperation({
    summary:
      'Obter comparativo de receitas, despesas e reservas por período (mês atual, últimos 5 meses e próximos 6 meses existentes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparativo por tipo retornado com sucesso',
  })
  findComparativoPorTipo(@CurrentUser() user: any) {
    return this.movimentacoesService.findComparativoPorTipo(user.sub);
  }

  @Post(':periodo')
  @ApiOperation({ summary: 'Criar uma nova movimentação' })
  @ApiParam({
    name: 'periodo',
    description: 'Período da movimentação (yyyy-mm)',
  })
  @ApiResponse({
    status: 201,
    description: 'Movimentação criada com sucesso',
  })
  @ApiResponse({
    status: 412,
    description: 'Erro de validação',
  })
  create(
    @Param('periodo') periodo: string,
    @Body() createMovimentoDto: CreateMovimentoDto,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.create(
      periodo,
      createMovimentoDto,
      user.sub,
    );
  }

  @Get(':periodo/categorias')
  @ApiOperation({ summary: 'Listar categorias disponíveis para o período (orçamento + categorias do usuário)' })
  @ApiParam({
    name: 'periodo',
    description: 'Período das movimentações (yyyy-mm)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorias mescladas retornadas com sucesso',
  })
  findCategoriasForPeriodo(
    @Param('periodo') periodo: string,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.findCategoriasForPeriodo(periodo, user.sub);
  }

  @Get(':periodo/resumo')
  @ApiOperation({
    summary:
      'Obter resumo das movimentações do período, somadas por categoria e agrupadas por tipo (receita, despesa, reserva)',
  })
  @ApiParam({
    name: 'periodo',
    description: 'Período das movimentações (yyyy-mm)',
  })
  @ApiQuery({
    name: 'contaId',
    required: false,
    description: 'Filtrar resumo por conta',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo por categoria retornado com sucesso',
  })
  findResumoPorCategoria(
    @Param('periodo') periodo: string,
    @Query() query: FindResumoQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.findResumoPorCategoria(periodo, user.sub, query);
  }

  @Get(':periodo')
  @ApiOperation({ summary: 'Listar movimentações do período' })
  @ApiParam({
    name: 'periodo',
    description: 'Período das movimentações (yyyy-mm)',
  })
  @ApiQuery({
    name: 'categoriaId',
    required: false,
    description: 'Filtrar por categoria',
  })
  @ApiQuery({
    name: 'contaId',
    required: false,
    description: 'Filtrar por conta',
  })
  @ApiQuery({
    name: 'descricao',
    required: false,
    description: 'Filtrar por descrição (busca dinâmica por palavras)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de movimentações retornada com sucesso',
  })
  findAll(
    @Param('periodo') periodo: string,
    @Query() query: FindMovimentosQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.findAll(periodo, user.sub, query);
  }

  @Get(':periodo/:id')
  @ApiOperation({ summary: 'Obter detalhes de uma movimentação' })
  @ApiParam({
    name: 'periodo',
    description: 'Período da movimentação (yyyy-mm)',
  })
  @ApiParam({ name: 'id', description: 'ID da movimentação' })
  @ApiResponse({
    status: 200,
    description: 'Movimentação encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Movimentação não encontrada',
  })
  findOne(
    @Param('periodo') periodo: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.findOne(periodo, id, user.sub);
  }

  @Patch(':periodo/:id')
  @ApiOperation({ summary: 'Atualizar uma movimentação' })
  @ApiParam({
    name: 'periodo',
    description: 'Período da movimentação (yyyy-mm)',
  })
  @ApiParam({ name: 'id', description: 'ID da movimentação' })
  @ApiResponse({
    status: 200,
    description: 'Movimentação atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Movimentação não encontrada',
  })
  update(
    @Param('periodo') periodo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMovimentoDto: UpdateMovimentoDto,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.update(
      periodo,
      id,
      updateMovimentoDto,
      user.sub,
    );
  }

  @Delete(':periodo/:id')
  @ApiOperation({ summary: 'Excluir uma movimentação' })
  @ApiParam({
    name: 'periodo',
    description: 'Período da movimentação (yyyy-mm)',
  })
  @ApiParam({ name: 'id', description: 'ID da movimentação' })
  @ApiResponse({
    status: 204,
    description: 'Movimentação excluída com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Movimentação não encontrada',
  })
  remove(
    @Param('periodo') periodo: string,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.remove(periodo, id, user.sub);
  }
}