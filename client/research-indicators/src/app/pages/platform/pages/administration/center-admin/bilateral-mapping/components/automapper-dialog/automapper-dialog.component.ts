import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { ActionsService } from '@services/actions.service';
import {
  AutomapperApplyResponse,
  AutomapperPreviewResponse,
  formatClarisaProjectLabel
} from '@interfaces/bilateral/bilateral-project-mapping.interface';

export type AutomapperBucketTab =
  | 'toCreate'
  | 'alreadyMapped'
  | 'toUpdate'
  | 'inactive'
  | 'divergent'
  | 'ambiguous'
  | 'unresolved';

@Component({
  selector: 'app-automapper-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, SkeletonModule, TableModule],
  templateUrl: './automapper-dialog.component.html',
  styleUrl: './automapper-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutomapperDialogComponent {
  private readonly service = inject(BilateralMappingService);
  private readonly actions = inject(ActionsService);

  /** Visibility of the dialog. Two-way bound. */
  readonly visible = model<boolean>(false);

  /** Emitted when an apply operation succeeds so parent can reload list and coverage. */
  readonly applied = output<AutomapperApplyResponse>();

  // State signals
  readonly loadingPreview = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly preview = signal<AutomapperPreviewResponse | null>(null);

  readonly activeTab = signal<AutomapperBucketTab>('toCreate');

  // Confirmation & Apply state
  readonly confirmingApply = signal(false);
  readonly applying = signal(false);
  readonly applyError = signal<string | null>(null);
  readonly applyResult = signal<AutomapperApplyResponse | null>(null);

  constructor() {
    // Production lifecycle trigger (Issue 1): whenever visible flips true, load preview
    effect(() => {
      const isVis = this.visible();
      if (isVis) {
        untracked(() => {
          void this.loadPreview();
        });
      }
    });
  }

  /**
   * Year carried by the preview, or by the apply result once the run finishes.
   * Absent until one of those responses arrives — no literal fallback.
   */
  readonly displayedReportingYear = computed(() => {
    return this.preview()?.reporting_year ?? this.applyResult()?.reporting_year ?? null;
  });

  /**
   * Apply writes toCreate, toUpdate, and inactive rows whose CLARISA fields
   * will be refreshed. Any of those is enough to enable Apply (T-09 carry-in).
   */
  readonly canApply = computed(() => {
    const prev = this.preview();
    if (!prev) return false;
    const refreshed = prev.inactive.filter(row => row.refreshed).length;
    return prev.counts.toCreate + prev.counts.toUpdate + refreshed > 0;
  });

  /**
   * Formatted feed fetch time (F-C / §7).
   */
  readonly formattedFeedFetchedAt = computed(() => {
    const p = this.preview();
    if (!p?.feedFetchedAt) return 'unknown';
    try {
      const d = new Date(p.feedFetchedAt);
      return d.toLocaleString();
    } catch {
      return p.feedFetchedAt;
    }
  });

  /**
   * Honest apply confirmation text (F-C / RB-8).
   * States that apply re-resolves server-side against current data rather than replaying the preview.
   */
  readonly applyConfirmationText = computed(() => {
    const timestamp = this.formattedFeedFetchedAt();
    return `Apply auto-mapping? This will re-evaluate eligible projects against current data and create/update mappings accordingly. (Preview evaluated from CLARISA cache at: ${timestamp}).`;
  });

  /**
   * Helper function to format candidate project name (F-A / R-5).
   * Collapses label when short_name === full_name.
   */
  formatProject(item: {
    short_name?: string | null;
    full_name?: string | null;
    clarisaProjectShortName?: string | null;
    clarisaProjectFullName?: string | null;
    clarisaProjectId?: number;
  }): string {
    return formatClarisaProjectLabel(item);
  }

  /**
   * Helper function for derived contract ID rendering in unresolved bucket (F-B).
   * Renders explicit 'no external_code' when empty string or null.
   */
  formatDerivedContractId(id: string | null | undefined): string {
    if (!id || id.trim() === '') {
      return 'no external_code';
    }
    return id.trim();
  }

  /**
   * Loads or refreshes the preview.
   */
  async loadPreview(): Promise<void> {
    this.loadingPreview.set(true);
    this.previewError.set(null);
    this.applyResult.set(null);
    this.applyError.set(null);
    this.confirmingApply.set(false);

    const result = await this.service.previewAutoMap();

    if (result === null) {
      this.previewError.set('Could not generate automapper preview. Please try again.');
      this.preview.set(null);
    } else {
      this.preview.set(result);
      // Pick initial active tab based on where there are items
      if (result.counts.toCreate > 0) {
        this.activeTab.set('toCreate');
      } else if (result.counts.toUpdate > 0) {
        this.activeTab.set('toUpdate');
      } else if (result.inactive.some(row => row.refreshed)) {
        this.activeTab.set('inactive');
      } else if (result.counts.divergent > 0) {
        this.activeTab.set('divergent');
      } else if (result.counts.ambiguous > 0) {
        this.activeTab.set('ambiguous');
      } else if (result.counts.unresolved > 0) {
        this.activeTab.set('unresolved');
      } else if (result.counts.inactive > 0) {
        this.activeTab.set('inactive');
      } else {
        this.activeTab.set('alreadyMapped');
      }
    }
    this.loadingPreview.set(false);
  }

  selectTab(tab: AutomapperBucketTab): void {
    this.activeTab.set(tab);
  }

  onStartApply(): void {
    this.confirmingApply.set(true);
    this.applyError.set(null);
  }

  onCancelApplyConfirm(): void {
    this.confirmingApply.set(false);
  }

  async onConfirmApply(): Promise<void> {
    this.applying.set(true);
    this.applyError.set(null);

    const res = await this.service.applyAutoMap();

    if (res.ok) {
      this.confirmingApply.set(false);
      this.applyResult.set(res.data);
      this.applied.emit(res.data);
      this.actions.showToast({
        severity: 'success',
        summary: 'Auto-Mapper Applied',
        detail: `Successfully created ${res.data.counts.created} mappings.`
      });
    } else {
      this.applyError.set(res.message || 'Failed to apply auto-mapping.');
    }
    this.applying.set(false);
  }

  closeDialog(): void {
    this.visible.set(false);
    this.confirmingApply.set(false);
    this.applyError.set(null);
    this.applyResult.set(null);
    this.preview.set(null);
    this.activeTab.set('toCreate');
  }
}
