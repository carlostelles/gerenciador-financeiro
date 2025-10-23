import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { LogsService } from './logs.service';
import { LogResponseDto } from './dto/log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/types';

@ApiTags('logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @ApiOperation({ summary: 'Listar todos os logs' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs',
    type: [LogResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
    schema: {
      example: {
        message: 'Apenas administradores podem consultar logs',
      },
    },
  })
  @Get()
  async findAll(@CurrentUser() currentUser: any): Promise<any[]> {
    return this.logsService.findAll(currentUser);
  }

  @ApiOperation({ summary: 'Buscar log por ID' })
  @ApiParam({ name: 'id', description: 'ID do log' })
  @ApiResponse({
    status: 200,
    description: 'Dados do log',
    type: LogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Log não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
  })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any): Promise<any> {
    return this.logsService.findOne(id, currentUser);
  }
}