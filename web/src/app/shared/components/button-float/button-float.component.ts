import { Component, input, signal, HostListener } from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-button-float',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  template: `
    <button tuiButton [appearance]="appearance()" [size]="size()">
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