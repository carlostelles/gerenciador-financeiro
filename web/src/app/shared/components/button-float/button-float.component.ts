import { Component, input, signal, HostListener, HostBinding } from '@angular/core';
import { TuiButton, TuiIcon, TuiAppearance } from '@taiga-ui/core';

@Component({
  selector: 'app-button-float',
  standalone: true,
  imports: [TuiButton, TuiIcon, TuiAppearance],
  template: `
    <button tuiButton [appearance]="appearance()" [size]="size()" [tuiAppearanceMode]="'checked'">
        <tui-icon [icon]="icon()"></tui-icon>
        @if (open()) {
        <ng-content></ng-content>
        }
    </button>
  `,
  styles: `
    :host {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 1000;
    }
  `
})
export class ButtonFloatComponent {
  readonly appearance = input<string>('primary');
  readonly size = input<'xs' | 's' | 'm' | 'l' | 'xl'>('m');
  readonly icon = input<string>('@tui.plus');
  /** Deslocamento adicional (em px) a partir da borda inferior, para empilhar múltiplos botões flutuantes. */
  readonly bottomOffset = input<number>(0);

  @HostBinding('style.bottom')
  get bottomStyle(): string {
    return `${16 + this.bottomOffset()}px`;
  }

  protected readonly open = signal<boolean>(false);

  @HostListener('mouseenter')
  onMouseHover() {
    this.open.set(true);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.open.set(false);
  }
}