import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

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
      select: jest.fn((espacoId: number) => {
        context.selected.set(context.spaces().find((space: { id: number }) => space.id === espacoId));
      }),
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
    });
  });

  it('renderiza o template real com os controles de acesso', () => {
    const fixture = TestBed.createComponent(EspacosComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
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
    context.selected.set(null);
    const fixture = TestBed.createComponent(EspacosComponent);
    const component = fixture.componentInstance as any;

    component.manage(context.spaces()[0]);
    fixture.detectChanges();

    expect(context.select).toHaveBeenCalledWith(7);
    expect(espacoService.members).toHaveBeenCalledWith(7);
  });

  it('carrega membros uma única vez quando o espaço próprio chega assincronamente', () => {
    context.selected.set(null);
    const fixture = TestBed.createComponent(EspacosComponent);
    fixture.detectChanges();

    context.selected.set(context.spaces()[0]);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(espacoService.members).toHaveBeenCalledTimes(1);
    expect(espacoService.members).toHaveBeenCalledWith(7);
  });

  it('limpa membros ao mudar para espaço sem papel de proprietário ou sem seleção', () => {
    espacoService.members.mockReturnValue(
      of([
        {
          usuarioId: 12,
          papel: 'VIEWER',
          usuario: { id: 12, nome: 'Pessoa', email: 'pessoa@example.com' },
        },
      ]),
    );
    const fixture = TestBed.createComponent(EspacosComponent);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    expect(component.members()).toHaveLength(1);

    context.selected.set({ ...context.selected(), papel: 'EDITOR' });
    fixture.detectChanges();
    expect(component.members()).toEqual([]);

    component.members.set([{ usuarioId: 13, papel: 'VIEWER' }]);
    context.selected.set(null);
    fixture.detectChanges();
    expect(component.members()).toEqual([]);
  });

  it('cancela o carregamento anterior ao trocar de espaço', () => {
    const membersResponse = new Subject<any[]>();
    espacoService.members.mockReturnValue(membersResponse);
    const fixture = TestBed.createComponent(EspacosComponent);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();

    context.selected.set({ ...context.selected(), id: 8, papel: 'EDITOR' });
    fixture.detectChanges();
    membersResponse.next([{ usuarioId: 12, papel: 'VIEWER' }]);

    expect(membersResponse.observed).toBe(false);
    expect(component.members()).toEqual([]);
    expect(component.membersLoading()).toBe(false);
  });

  it('carrega apenas os membros do novo espaço próprio ao trocar a seleção', () => {
    const firstResponse = new Subject<any[]>();
    const secondResponse = new Subject<any[]>();
    espacoService.members.mockImplementation((espacoId: number) =>
      espacoId === 7 ? firstResponse : secondResponse,
    );
    const fixture = TestBed.createComponent(EspacosComponent);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();

    context.selected.set({ ...context.selected(), id: 8 });
    fixture.detectChanges();
    firstResponse.next([{ usuarioId: 12, papel: 'VIEWER' }]);
    secondResponse.next([{ usuarioId: 13, papel: 'EDITOR' }]);

    expect(firstResponse.observed).toBe(false);
    expect(espacoService.members).toHaveBeenNthCalledWith(1, 7);
    expect(espacoService.members).toHaveBeenNthCalledWith(2, 8);
    expect(component.members()).toEqual([{ usuarioId: 13, papel: 'EDITOR' }]);
  });

  it('cancela o carregamento de membros ao destruir o componente', () => {
    const membersResponse = new Subject<any[]>();
    espacoService.members.mockReturnValue(membersResponse);
    const fixture = TestBed.createComponent(EspacosComponent);
    fixture.detectChanges();

    fixture.destroy();

    expect(membersResponse.observed).toBe(false);
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
