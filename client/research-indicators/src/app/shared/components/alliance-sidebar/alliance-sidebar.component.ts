import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CacheService } from '../../services/cache.service';

@Component({
  selector: 'alliance-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './alliance-sidebar.component.html',
  styleUrl: './alliance-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllianceSidebarComponent {
  cache = inject(CacheService);
  options = [
    { icon: 'finance', label: 'About indicators', path: '' },
    { icon: 'info', label: 'About the tool', path: '' },
    { icon: 'table_rows', label: 'Power BI dashboard', path: '' },
    { icon: 'open_in_new', label: 'Other reporting tools', path: '' }
  ];

  isCollapsed = signal(false);

  collapse() {
    this.isCollapsed.update(isCollapsed => !isCollapsed);
  }

  getSidebarWidth() {
    return this.isCollapsed() ? '140px' : '250px';
  }
}
