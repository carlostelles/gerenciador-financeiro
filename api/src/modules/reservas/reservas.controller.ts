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
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EspacoId } from '../../common/decorators/espaco-id.decorator';

@ApiTags('reservas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma nova reserva' })
  @ApiResponse({
    status: 201,
    description: 'Reserva criada com sucesso',
  })
  @ApiResponse({
    status: 412,
    description: 'Erro de validação',
  })
  create(
    @Body() createReservaDto: CreateReservaDto,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.reservasService.create(createReservaDto, user.sub)
      : this.reservasService.create(createReservaDto, user.sub, espacoId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reservas do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas retornada com sucesso',
  })
  findAll(@CurrentUser() user: any, @EspacoId() espacoId?: number) {
    return espacoId === undefined
      ? this.reservasService.findAll(user.sub)
      : this.reservasService.findAll(user.sub, espacoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma reserva' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({
    status: 200,
    description: 'Reserva encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva não encontrada',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.reservasService.findOne(id, user.sub)
      : this.reservasService.findOne(id, user.sub, espacoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma reserva' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({
    status: 200,
    description: 'Reserva atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva não encontrada',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservaDto: UpdateReservaDto,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.reservasService.update(id, updateReservaDto, user.sub)
      : this.reservasService.update(id, updateReservaDto, user.sub, espacoId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir uma reserva' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({
    status: 204,
    description: 'Reserva excluída com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva não encontrada',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @EspacoId() espacoId?: number,
  ) {
    return espacoId === undefined
      ? this.reservasService.remove(id, user.sub)
      : this.reservasService.remove(id, user.sub, espacoId);
  }
}
