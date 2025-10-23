import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuario.dto';
import { UserRole } from '../../common/types';
import { LogsService } from '../logs/logs.service';
import { LogAcao } from '../../common/types';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    private logsService: LogsService,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    // Verificar se email já existe
    const existingEmail = await this.usuariosRepository.findOne({
      where: { email: createUsuarioDto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email já está em uso');
    }

    // Verificar se telefone já existe
    const existingPhone = await this.usuariosRepository.findOne({
      where: { telefone: createUsuarioDto.telefone },
    });
    if (existingPhone) {
      throw new ConflictException('Telefone já está em uso');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(createUsuarioDto.senha, 10);

    const usuario = this.usuariosRepository.create({
      ...createUsuarioDto,
      senha: hashedPassword,
      role: createUsuarioDto.role || UserRole.USER,
    });

    const savedUsuario = await this.usuariosRepository.save(usuario);

    // Log da criação
    await this.logsService.create({
      data: new Date(),
      usuarioId: savedUsuario.id,
      descricao: `Usuário criado: ${savedUsuario.email}`,
      acao: LogAcao.CREATE,
      entidade: 'Usuario',
      entidadeId: savedUsuario.id.toString(),
      dadosNovos: { ...savedUsuario, senha: '[HIDDEN]' },
    });

    return savedUsuario;
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({
      select: ['id', 'nome', 'email', 'telefone', 'role', 'ativo', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
      select: ['id', 'nome', 'email', 'telefone', 'role', 'ativo', 'createdAt', 'updatedAt'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { email },
    });
  }

  async update(
    id: number,
    updateUsuarioDto: UpdateUsuarioDto,
    currentUser: any,
  ): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar permissões
    if (currentUser.role !== UserRole.ADMIN && currentUser.sub !== id) {
      throw new ForbiddenException('Sem permissão para atualizar este usuário');
    }

    // Usuário comum não pode alterar role
    if (currentUser.role !== UserRole.ADMIN && updateUsuarioDto.role) {
      throw new ForbiddenException('Usuários não podem alterar o próprio role');
    }

    // Verificar email único se foi alterado
    if (updateUsuarioDto.email && updateUsuarioDto.email !== usuario.email) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Usuários não podem alterar o próprio email');
      }
      
      const existingEmail = await this.usuariosRepository.findOne({
        where: { email: updateUsuarioDto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email já está em uso');
      }
    }

    // Verificar telefone único se foi alterado
    if (updateUsuarioDto.telefone && updateUsuarioDto.telefone !== usuario.telefone) {
      const existingPhone = await this.usuariosRepository.findOne({
        where: { telefone: updateUsuarioDto.telefone },
      });
      if (existingPhone) {
        throw new ConflictException('Telefone já está em uso');
      }
    }

    // Hash da senha se foi alterada
    if (updateUsuarioDto.senha) {
      updateUsuarioDto.senha = await bcrypt.hash(updateUsuarioDto.senha, 10);
    }

    const dadosAnteriores = { ...usuario };
    await this.usuariosRepository.update(id, updateUsuarioDto);
    const usuarioAtualizado = await this.findOne(id);

    // Log da atualização
    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Usuário atualizado: ${usuarioAtualizado.email}`,
      acao: LogAcao.UPDATE,
      entidade: 'Usuario',
      entidadeId: id.toString(),
      dadosAnteriores: { ...dadosAnteriores, senha: '[HIDDEN]' },
      dadosNovos: { ...usuarioAtualizado, senha: '[HIDDEN]' },
    });

    return usuarioAtualizado;
  }

  async remove(id: number, currentUser: any): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar permissões
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem desativar usuários');
    }

    // Não permitir auto-desativação
    if (currentUser.sub === id) {
      throw new ForbiddenException('Não é possível desativar a si mesmo');
    }

    await this.usuariosRepository.update(id, { ativo: false });

    // Log da desativação
    await this.logsService.create({
      data: new Date(),
      usuarioId: currentUser.sub,
      descricao: `Usuário desativado: ${usuario.email}`,
      acao: LogAcao.DELETE,
      entidade: 'Usuario',
      entidadeId: id.toString(),
      dadosAnteriores: { ...usuario, senha: '[HIDDEN]' },
    });
  }
}