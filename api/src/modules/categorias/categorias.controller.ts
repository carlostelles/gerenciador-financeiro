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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto, UpdateCategoriaDto, CategoriaResponseDto } from './dto/categoria.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('categorias')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @ApiOperation({ summary: 'Criar uma nova categoria' })
  @ApiResponse({
    status: 201,
    description: 'Categoria criada com sucesso',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 412,
    description: 'Dados inválidos',
    schema: {
      example: {
        message: 'Já existe uma categoria com este nome e tipo',
      },
    },
  })
  @Post()
  async create(
    @Body() createCategoriaDto: CreateCategoriaDto,
    @CurrentUser() currentUser: any,
  ): Promise<CategoriaResponseDto> {
    return this.categoriasService.create(createCategoriaDto, currentUser);
  }

  @ApiOperation({ summary: 'Listar categorias do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias',
    type: [CategoriaResponseDto],
  })
  @Get()
  async findAll(@CurrentUser() currentUser: any): Promise<CategoriaResponseDto[]> {
    return this.categoriasService.findAll(currentUser);
  }

  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({
    status: 200,
    description: 'Dados da categoria',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria não encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
  })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ): Promise<CategoriaResponseDto> {
    return this.categoriasService.findOne(id, currentUser);
  }

  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({
    status: 200,
    description: 'Categoria atualizada com sucesso',
    type: CategoriaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria não encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
  })
  @ApiResponse({
    status: 412,
    description: 'Dados inválidos',
  })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoriaDto: UpdateCategoriaDto,
    @CurrentUser() currentUser: any,
  ): Promise<CategoriaResponseDto> {
    return this.categoriasService.update(id, updateCategoriaDto, currentUser);
  }

  @ApiOperation({ summary: 'Excluir categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria' })
  @ApiResponse({
    status: 204,
    description: 'Categoria excluída com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria não encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
  })
  @ApiResponse({
    status: 412,
    description: 'Categoria em uso, não pode ser excluída',
  })
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ): Promise<void> {
    await this.categoriasService.remove(id, currentUser);
  }
}