import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Log, LogDocument } from './schemas/log.schema';
import { CreateLogDto } from './dto/log.dto';
import { UserRole } from '../../common/types';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(Log.name) private logModel: Model<LogDocument>,
  ) {}

  async create(createLogDto: CreateLogDto): Promise<Log> {
    const createdLog = new this.logModel(createLogDto);
    return createdLog.save();
  }

  async findAll(currentUser: any): Promise<Log[]> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem consultar logs');
    }

    return this.logModel.find().sort({ data: -1 }).exec();
  }

  async findOne(id: string, currentUser: any): Promise<Log> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem consultar logs');
    }

    const log = await this.logModel.findById(id).exec();
    if (!log) {
      throw new NotFoundException('Log não encontrado');
    }

    return log;
  }
}