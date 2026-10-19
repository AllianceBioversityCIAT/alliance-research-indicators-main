// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-11 (R-PFM-006)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PfmPipeline, PfmPipelineGroup, PfmPipelineStage, PfmScope } from '../../pfm.interfaces';

interface StageView extends PfmPipelineStage {
  label: string;
  note: string;
  groupLabel: string;
  seg: string;
  ink: string;
  share: number;
}

// Literal class strings so Tailwind can see them. Colors are tokens only (NFR-PFM-003).
const STAGE_META: Record<string, { label: string; note: string; seg: string; ink: string }> = {
  mapping_not_started: {
    label: 'Mapping not started',
    note: 'Waiting on PI approval or on the team to begin',
    seg: 'bg-[var(--ac-pfm-seg-not-started)]',
    ink: 'text-[var(--ac-pfm-neutral-fg)]'
  },
  mapping_incomplete: {
    label: 'Mapping incomplete',
    note: 'Projects or budget shares still missing',
    seg: 'bg-[var(--ac-pfm-seg-incomplete)]',
    ink: 'text-[var(--ac-pfm-warning-fg)]'
  },
  ready_to_sync: {
    label: 'Ready to sync',
    note: 'Mapping complete, waiting on a push to PRMS',
    seg: 'bg-[var(--ac-pfm-seg-ready)]',
    ink: 'text-[var(--ac-pfm-info-fg)]'
  },
  pending_review: {
    label: 'Pending review in PRMS',
    note: 'With the PRMS QA team',
    seg: 'bg-[var(--ac-pfm-seg-pending)]',
    ink: 'text-[var(--ac-pfm-warning-fg)]'
  },
  approved: {
    label: 'Approved in PRMS',
    note: 'Counted in the reporting cycle',
    seg: 'bg-[var(--ac-pfm-seg-approved)]',
    ink: 'text-[var(--ac-pfm-success-fg)]'
  },
  rejected: {
    label: 'Rejected in PRMS',
    note: 'Returned by QA, needs a fix and resync',
    seg: 'bg-[var(--ac-pfm-seg-rejected)]',
    ink: 'text-[var(--ac-pfm-danger-fg)]'
  },
  no_sp_contribution: {
    label: 'No SP contribution',
    note: 'Declared out of PRMS scope by the PI — no action needed',
    seg: 'bg-[var(--ac-pfm-seg-no-sp)]',
    ink: 'text-[var(--ac-pfm-outscope-fg)]'
  }
};

const GROUP_LABELS: Record<PfmPipelineGroup, string> = { in_star: 'In STAR', in_prms: 'In PRMS', out_of_scope: 'Out of scope' };

@Component({
  selector: 'app-pfm-pipeline-card',
  imports: [DecimalPipe],
  templateUrl: './pfm-pipeline-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmPipelineCardComponent {
  pipeline = input.required<PfmPipeline>();
  scope = input<PfmScope>('mine');

  scopeNote = computed(() => (this.scope() === 'all' ? 'across all projects contributing to Pool funding' : 'across your projects contributing to Pool funding'));

  /** Display-only decoration of the server stages; values and order are exactly as sent. */
  stages = computed<StageView[]>(() => {
    const p = this.pipeline();
    return p.stages.map(s => {
      const m = STAGE_META[s.key] ?? { label: s.key, note: '', seg: 'bg-[var(--ac-pfm-seg-not-started)]', ink: 'text-[var(--ac-pfm-neutral-fg)]' };
      return { ...s, ...m, groupLabel: GROUP_LABELS[s.group] ?? s.group, share: p.total ? Math.round((s.value / p.total) * 100) : 0 };
    });
  });

  /** Only stages with a value get a segment: a zero stage must not leave a focusable zero-width element. */
  segments = computed(() => this.stages().filter(s => s.value > 0));

  figures = computed(() => {
    const p = this.pipeline();
    const share = (v: number) => (p.total ? Math.round((v / p.total) * 100) : 0);
    return [
      { key: 'not_synced', value: p.not_synced, text: `in STAR, not synced yet · ${share(p.not_synced)}%`, ink: 'text-[var(--ac-pfm-warning-fg)]' },
      { key: 'in_prms', value: p.in_prms, text: `in PRMS · ${share(p.in_prms)}%`, ink: 'text-[var(--ac-pfm-success-fg)]' },
      { key: 'out_of_scope', value: p.out_of_scope, text: `out of scope · ${share(p.out_of_scope)}%`, ink: 'text-[var(--ac-pfm-outscope-fg)]' }
    ];
  });
}
