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
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MovimentacoesService } from './movimentacoes.service';
import { CreateMovimentoDto } from './dto/create-movimento.dto';
import { UpdateMovimentoDto } from './dto/update-movimento.dto';
import { CreateSaldoInicialDto } from './dto/create-saldo-inicial.dto';
import { UpdateSaldoInicialDto } from './dto/update-saldo-inicial.dto';
import { FindMovimentosQueryDto } from './dto/find-movimentos-query.dto';
import { FindResumoQueryDto } from './dto/find-resumo-query.dto';
import {
  AnalisarComprovanteResponseDto,
  AnalisarComprovantesLoteResponseDto,
} from './dto/analisar-comprovante-response.dto';
import { AnalisarComprovanteRequestDto } from './dto/analisar-comprovante-request.dto';
import { ComprovanteUploadFile } from './types/comprovante-upload-file.type';
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

  @Get('comprovantes/:comprovanteId/url-visualizacao')
  @ApiOperation({
    summary: 'Obter URL temporária para visualizar um arquivo anexado',
  })
  @ApiParam({ name: 'comprovanteId', type: Number })
  obterUrlComprovante(
    @Param('comprovanteId', ParseIntPipe) comprovanteId: number,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.obterUrlComprovante(
      comprovanteId,
      user.sub,
    );
  }

  @Post('comprovantes/analisar-extratos')
  @UseInterceptors(FilesInterceptor('arquivos', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Enviar vários extratos bancários em PDF ou imagem e criar os lançamentos encontrados',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        arquivos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['arquivos'],
    },
  })
  @ApiResponse({ status: 201, type: AnalisarComprovantesLoteResponseDto })
  async analisarExtratos(
    @UploadedFiles() arquivos: ComprovanteUploadFile[],
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.analisarExtratos(arquivos || [], user.sub);
  }

  @Post('comprovantes/analisar')
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Enviar comprovante em imagem ou PDF, salvar no S3 e analisar com IA',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        arquivo: {
          type: 'string',
          format: 'binary',
        },
        periodo: {
          type: 'string',
          example: '2026-07',
        },
        movimentoId: {
          type: 'number',
          example: 42,
        },
      },
      required: ['arquivo'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Comprovante analisado e movimentação criada automaticamente',
    type: AnalisarComprovanteResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Comprovante analisado e movimentação atualizada automaticamente',
    type: AnalisarComprovanteResponseDto,
  })
  @ApiResponse({
    status: 202,
    description:
      'Comprovante analisado, mas faltam dados para persistência automática',
    type: AnalisarComprovanteResponseDto,
  })
  async analisarComprovante(
    @UploadedFile() arquivo: ComprovanteUploadFile,
    @Body() body: AnalisarComprovanteRequestDto,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.movimentacoesService.analisarComprovante(
      arquivo,
      user.sub,
      body,
    );

    response.status(result.statusCode);
    return result.body;
  }

  @Get(':periodo/saldos-iniciais')
  @ApiOperation({
    summary: 'Obter saldos iniciais de todas as contas do período',
  })
  @ApiParam({ name: 'periodo', description: 'Período dos saldos (yyyy-mm)' })
  @ApiResponse({
    status: 200,
    description: 'Saldos iniciais consolidados retornados com sucesso',
  })
  getSaldosIniciais(
    @Param('periodo') periodo: string,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.getSaldosIniciais(periodo, user.sub);
  }

  @Get(':periodo/saldo-inicial')
  @ApiOperation({ summary: 'Obter saldo inicial do período para a conta' })
  @ApiParam({ name: 'periodo', description: 'Período do saldo (yyyy-mm)' })
  @ApiQuery({ name: 'contaId', required: true, description: 'ID da conta' })
  getSaldoInicial(
    @Param('periodo') periodo: string,
    @Query('contaId', ParseIntPipe) contaId: number,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.getSaldoInicial(
      periodo,
      contaId,
      user.sub,
    );
  }

  @Post(':periodo/saldo-inicial')
  @ApiOperation({ summary: 'Criar ou registrar saldo inicial do período' })
  @ApiParam({ name: 'periodo', description: 'Período do saldo (yyyy-mm)' })
  @ApiResponse({ status: 201, description: 'Saldo inicial salvo com sucesso' })
  createSaldoInicial(
    @Param('periodo') periodo: string,
    @Body() createSaldoInicialDto: CreateSaldoInicialDto,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.createSaldoInicial(
      periodo,
      createSaldoInicialDto,
      user.sub,
    );
  }

  @Patch(':periodo/saldo-inicial/:contaId')
  @ApiOperation({ summary: 'Atualizar saldo inicial do período' })
  @ApiParam({ name: 'periodo', description: 'Período do saldo (yyyy-mm)' })
  @ApiParam({ name: 'contaId', description: 'ID da conta' })
  updateSaldoInicial(
    @Param('periodo') periodo: string,
    @Param('contaId', ParseIntPipe) contaId: number,
    @Body() updateSaldoInicialDto: UpdateSaldoInicialDto,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.updateSaldoInicial(
      periodo,
      contaId,
      updateSaldoInicialDto,
      user.sub,
    );
  }

  @Post(':periodo/saldo-inicial/:contaId/restaurar-automatico')
  @ApiOperation({
    summary: 'Restaurar cálculo automático do saldo inicial',
    description:
      'Recalcula o saldo a partir do saldo final do período anterior e persiste a origem como AUTO.',
  })
  @ApiParam({ name: 'periodo', description: 'Período do saldo (yyyy-mm)' })
  @ApiParam({ name: 'contaId', description: 'ID da conta' })
  @ApiResponse({
    status: 201,
    description: 'Saldo inicial automático restaurado e persistido com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Período inválido' })
  @ApiResponse({
    status: 404,
    description: 'Conta não encontrada ou não pertencente ao usuário',
  })
  restaurarSaldoInicialAutomatico(
    @Param('periodo') periodo: string,
    @Param('contaId', ParseIntPipe) contaId: number,
    @CurrentUser() user: any,
  ) {
    return this.movimentacoesService.restaurarSaldoInicialAutomatico(
      periodo,
      contaId,
      user.sub,
    );
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
  @ApiOperation({
    summary:
      'Listar categorias disponíveis para o período (orçamento + categorias do usuário)',
  })
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
    return this.movimentacoesService.findCategoriasForPeriodo(
      periodo,
      user.sub,
    );
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
    return this.movimentacoesService.findResumoPorCategoria(
      periodo,
      user.sub,
      query,
    );
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
