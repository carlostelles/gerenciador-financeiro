import { Component, input, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';
import { CategoriaTipo } from '../../interfaces';
import { getCategoriaBadge } from '../../helpers';

@Component({
  selector: 'app-categoria-badge',
  standalone: true,
  imports: [TuiBadge],
  template: `
    @if (badgeData) {
      <tui-badge 
        [appearance]="badgeData.appearance"
        [iconStart]="iconName">
        <span #contentWrapper>
          <ng-content></ng-content>
        </span>
        @if (!hasContent()) {
          {{ badgeData.label }}
        }
      </tui-badge>
    }
  `
})
export class CategoriaBadgeComponent implements AfterViewInit {  
  @ViewChild('contentWrapper', { static: false })
  contentWrapper!: ElementRef;

  readonly tipo = input<CategoriaTipo>();

  protected readonly hasContent = signal<boolean>(false);

  ngAfterViewInit(): void {
    // Verifica se há conteúdo projetado no wrapper
    const element = this.contentWrapper?.nativeElement;
    const hasText = element?.textContent?.trim().length > 0;
    const hasChildren = element?.children?.length > 0;
    
    this.hasContent.set(hasText || hasChildren);
  }


  get badgeData() {
    return this.tipo() ? getCategoriaBadge(this.tipo()) : undefined;
  }

  get iconName() {
    return `@tui.${this.badgeData?.icon}`;
  }
}