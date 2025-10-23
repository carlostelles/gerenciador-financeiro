import { Component, Input } from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';
import { CategoriaTipo } from '../../interfaces';
import { getCategoriaBadge } from '../../helpers';

@Component({
  selector: 'app-categoria-badge',
  standalone: true,
  imports: [TuiBadge],
  template: `
    <tui-badge 
      [appearance]="badgeData.appearance"
      [iconStart]="iconName">
      {{ badgeData.label }}
    </tui-badge>
  `
})
export class CategoriaBadgeComponent {
  @Input({ required: true }) tipo!: CategoriaTipo;

  get badgeData() {
    return getCategoriaBadge(this.tipo);
  }

  get iconName() {
    return `@tui.${this.badgeData.icon}`;
  }
}