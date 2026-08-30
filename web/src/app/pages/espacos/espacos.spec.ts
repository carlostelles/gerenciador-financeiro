import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { EspacoContextService } from '../../core/services/espaco-context.service';
import { EspacoService } from '../../core/services/espaco.service';
import { PromptService, ToastService } from '../../shared';
import { EspacosComponent } from './espacos';

describe('EspacosComponent', () => {
  let espacoService: Record<string, jest.Mock>;
  let context: any;

  beforeEach(() => {
    espacoService = {
      create: jest.fn().mockReturnValue(of({ id: 9 })),
      rename: jest.fn().mockReturnValue(of({ id: 7 })),
      remove: jest.fn().mockReturnValue(of(undefined)),
      members: jest.fn().mockReturnValue(of([])),
      addMember: jest.fn().mockReturnValue(of({})),
      updateMember: jest.fn().mockReturnValue(of({})),
      removeMember: jest.fn().mockReturnValue(of(undefined)),
      leave: jest.fn().mockReturnValue(of(undefined)),
      transfer: jest.fn().mockReturnValue(of(undefined)),
    };
    context = {
      spaces: signal([
        { id: 7, nome: 'Família', tipo: 'SHARED', ownerUsuarioId: 1, papel: 'OWNER' },
      ]),
      selected: signal({
        id: 7,
        nome: 'Família',
        tipo: 'SHARED',
        ownerUsuarioId: 1,
        papel: 'OWNER',
      }),
      isOwner: () => context.selected()?.papel === 'OWNER',
      select: jest.fn(),
      removeLocal: jest.fn(),
      load: jest.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [EspacosComponent],
      providers: [
        { provide: EspacoService, useValue: espacoService },
        { provide: EspacoContextService, useValue: context },
        { provide: PromptService, useValue: { open: jest.fn().mockReturnValue(of(true)) } },
        { provide: ToastService, useValue: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } },
      ],
    }).overrideComponent(EspacosComponent, { set: { template: '' } });
  });

  it('cria espaço com nome trimado e recarrega o contexto', () => {
    const component = TestBed.createComponent(EspacosComponent).componentInstance as any;
    component.newSpaceName = '  Viagem  ';

    component.createSpace();

    expect(espacoService.create).toHaveBeenCalledWith('Viagem');
    expect(context.load).toHaveBeenCalled();
  });

  it('ignora double-submit enquanto uma mutação está pendente', () => {
    const component = TestBed.createComponent(EspacosComponent).componentInstance as any;
    component.newSpaceName = 'Viagem';
    component.mutationPending.set(true);

    component.createSpace();

    expect(espacoService.create).not.toHaveBeenCalled();
  });

  it('remove localmente o espaço depois de sair', () => {
    const component = TestBed.createComponent(EspacosComponent).componentInstance as any;

    component.leaveSpace(context.selected());

    expect(espacoService.leave).toHaveBeenCalledWith(7);
    expect(context.removeLocal).toHaveBeenCalledWith(7);
  });

  it('carrega membros ao selecionar espaço próprio', () => {
    const component = TestBed.createComponent(EspacosComponent).componentInstance as any;

    component.manage(context.selected());

    expect(context.select).toHaveBeenCalledWith(7);
    expect(espacoService.members).toHaveBeenCalledWith(7);
  });

  it('adiciona membro com email trimado e papel selecionado', () => {
    const component = TestBed.createComponent(EspacosComponent).componentInstance as any;
    component.memberEmail = '  pessoa@example.com  ';
    component.memberRole = 'EDITOR';

    component.addMember();

    expect(espacoService.addMember).toHaveBeenCalledWith(
      7,
      'pessoa@example.com',
      'EDITOR',
    );
    expect(espacoService.members).toHaveBeenCalledWith(7);
  });

  it('confirma e remove membro do espaço selecionado', () => {
    const component = TestBed.createComponent(EspacosComponent).componentInstance as any;

    component.removeMember({
      usuarioId: 12,
      papel: 'VIEWER',
      usuario: { id: 12, nome: 'Pessoa', email: 'pessoa@example.com' },
    });

    expect(espacoService.removeMember).toHaveBeenCalledWith(7, 12);
    expect(espacoService.members).toHaveBeenCalledWith(7);
  });
});
