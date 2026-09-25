import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { TruncatedTextTooltipDirective } from '@shared/directives/truncated-text-tooltip.directive';
import { PromptManagerService } from '@shared/services/prompt-manager.service';
import { PROMPT_MANAGER_TABLE_COLUMN_WIDTHS, PromptItem } from '@shared/interfaces/prompt-manager.interface';

@Component({
  selector: 'app-prompt-manager',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, CustomProgressBarComponent, TruncatedTextTooltipDirective],
  templateUrl: './prompt-manager.component.html',
  styleUrl: './prompt-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PromptManagerComponent implements OnInit {
  readonly service = inject(PromptManagerService);

  /** Column widths in px — edit {@link PROMPT_MANAGER_TABLE_COLUMN_WIDTHS} to change layout. */
  readonly columnWidths = PROMPT_MANAGER_TABLE_COLUMN_WIDTHS;

  readonly tableStyle = computed(() => {
    const w = this.columnWidths;
    const total = w.name + w.descriptionMin + w.lastModified + w.updatedBy + w.actions;
    return {
      'min-width': `${total}px`,
      width: '100%',
      'table-layout': 'fixed'
    };
  });

  ngOnInit(): void {
    void this.service.loadList();
  }

  fixedColumnStyle(widthPx: number): Record<string, string> {
    return {
      width: `${widthPx}px`,
      minWidth: `${widthPx}px`,
      maxWidth: `${widthPx}px`
    };
  }

  descriptionColumnStyle(): Record<string, string> {
    return {
      minWidth: `${this.columnWidths.descriptionMin}px`,
      width: 'auto',
      maxWidth: 'none'
    };
  }

  formatUpdatedAt(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
      .format(date)
      .toLowerCase();
    return `${datePart} at ${timePart}`;
  }

  openEdit(row: PromptItem): void {
    this.service.openEdit(row);
  }
}
