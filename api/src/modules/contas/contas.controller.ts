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

import { ContasService } from './contas.service';
import { CreateContaDto, UpdateContaDto, ContaResponseDto } from './dto/conta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('contas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contas')
export class ContasController {
  constructor(private readonly contasService: ContasService) {}

  @ApiOperation({ summary: 'Criar uma nova conta' })
  @ApiResponse({
    status: 201,
    description: 'Conta criada com sucesso',
    type: ContaResponseDto,
  })
  @Post()
  async create(
    @Body() createContaDto: CreateContaDto,
    @CurrentUser() currentUser: any,
  ): Promise<ContaResponseDto> {
    return this.contasService.create(createContaDto, currentUser);
  }

  @ApiOperation({ summary: 'Listar contas do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de contas',
    type: [ContaResponseDto],
  })
  @Get()
  async findAll(@CurrentUser() currentUser: any): Promise<ContaResponseDto[]> {
    return this.contasService.findAll(currentUser);
  }

  @ApiOperation({ summary: 'Buscar conta por ID' })
  @ApiParam({ name: 'id', description: 'ID da conta' })
  @ApiResponse({
    status: 200,
    description: 'Dados da conta',
    type: ContaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conta não encontrada',
  })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ): Promise<ContaResponseDto> {
    return this.contasService.findOne(id, currentUser);
  }

  @ApiOperation({ summary: 'Atualizar conta' })
  @ApiParam({ name: 'id', description: 'ID da conta' })
  @ApiResponse({
    status: 200,
    description: 'Conta atualizada com sucesso',
    type: ContaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Conta não encontrada',
  })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContaDto: UpdateContaDto,
    @CurrentUser() currentUser: any,
  ): Promise<ContaResponseDto> {
    return this.contasService.update(id, updateContaDto, currentUser);
  }

  @ApiOperation({ summary: 'Excluir conta' })
  @ApiParam({ name: 'id', description: 'ID da conta' })
  @ApiResponse({
    status: 204,
    description: 'Conta excluída com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Conta não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Conta em uso, não pode ser excluída',
  })
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ): Promise<void> {
    await this.contasService.remove(id, currentUser);
  }
}
