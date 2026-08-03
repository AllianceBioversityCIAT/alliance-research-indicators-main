import { computed, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { ButtonModule } from 'primeng/button';

const RESULT_SIDEBAR_WIDTH_PX = 308;
const CONTENT_RIGHT_OFFSET_PX = 0;

@Component({
  selector: 'app-navigation-buttons',
  imports: [ButtonModule],
  templateUrl: './navigation-buttons.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class NavigationButtonsComponent {
  submission = inject(SubmissionService);
  cache = inject(CacheService);

  navLeft = computed(() => {
    const hss = this.cache.hasSmallScreen();
    const collapsed = this.cache.isSidebarCollapsed();
    let paddingLeft: number;
    if (hss) {
      paddingLeft = collapsed ? 64 : 250;
    } else {
      paddingLeft = collapsed ? 75 : 260;
    }
    return paddingLeft + RESULT_SIDEBAR_WIDTH_PX;
  });

  navRight = computed(() => CONTENT_RIGHT_OFFSET_PX);

  @Input() showBack = true;
  @Input() showNext = true;
  @Input() showSave = false;
  @Input() disableSave = false;
  @Input() disableNext = false;

  @Output() back = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
