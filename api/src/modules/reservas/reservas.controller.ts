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

@ApiTags('reservas')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
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
  ) {
    return this.reservasService.create(createReservaDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reservas do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas retornada com sucesso',
  })
  findAll(@CurrentUser() user: any) {
    return this.reservasService.findAll(user.sub);
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
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.reservasService.findOne(id, user.sub);
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
  ) {
    return this.reservasService.update(id, updateReservaDto, user.sub);
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
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.reservasService.remove(id, user.sub);
  }
}