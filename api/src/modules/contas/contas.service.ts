import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Conta } from './entities/conta.entity';
import { CreateContaDto, UpdateContaDto } from './dto/conta.dto';
import { LogsService } from '../logs/logs.service';
import { LogAcao } from '../../common/types';
import { Movimento } from '../movimentacoes/entities/movimento.entity';

@Injectable()
export class ContasService {
  constructor(
    @InjectRepository(Conta)
    private contasRepository: Repository<Conta>,
    @InjectRepository(Movimento)
    private movimentoRepository: Repository<Movimento>,
    private logsService: LogsService,
  ) {}

  async create(
    createContaDto: CreateContaDto,
    currentUser: any,
  ): Promise<Conta> {
    const conta = this.contasRepository.create({
      ...createContaDto,
      usuarioId: currentUser.sub,
    });

    const savedConta = await this.contasRepository.save(conta);

    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Conta criada: ${savedConta.nome}`,
      acao: LogAcao.CREATE,
      entidade: 'Conta',
      entidadeId: savedConta.id.toString(),
      dadosNovos: savedConta,
    });

    return savedConta;
  }

  async findAll(currentUser: any): Promise<Conta[]> {
    return this.contasRepository.find({
      where: { usuarioId: currentUser.sub },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: number, currentUser: any): Promise<Conta> {
    const conta = await this.contasRepository.findOne({
      where: { id, usuarioId: currentUser.sub },
    });

    if (!conta) {
      throw new NotFoundException('Conta não encontrada');
    }

    return conta;
  }

  async update(
    id: number,
    updateContaDto: UpdateContaDto,
    currentUser: any,
  ): Promise<Conta> {
    const conta = await this.findOne(id, currentUser);

    const dadosAnteriores = { ...conta };
    await this.contasRepository.update(id, updateContaDto);
    const contaAtualizada = await this.findOne(id, currentUser);

    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Conta atualizada: ${contaAtualizada.nome}`,
      acao: LogAcao.UPDATE,
      entidade: 'Conta',
      entidadeId: id.toString(),
      dadosAnteriores,
      dadosNovos: contaAtualizada,
    });

    return contaAtualizada;
  }

  async remove(id: number, currentUser: any): Promise<void> {
    const conta = await this.findOne(id, currentUser);

    const movimentosVinculados = await this.movimentoRepository.count({
      where: { contaId: id },
    });

    if (movimentosVinculados > 0) {
      throw new ConflictException(
        'Conta não pode ser excluída pois está vinculada a movimentações',
      );
    }

    await this.contasRepository.remove(conta);

    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Conta excluída: ${conta.nome}`,
      acao: LogAcao.DELETE,
      entidade: 'Conta',
      entidadeId: id.toString(),
      dadosAnteriores: conta,
    });
  }
}
