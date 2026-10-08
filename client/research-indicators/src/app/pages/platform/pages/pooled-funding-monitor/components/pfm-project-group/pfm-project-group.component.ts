// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-13 (R-PFM-011)
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PfmGroup } from '../../pfm.interfaces';
import { PfmStoreService } from '../../services/pfm-store.service';
import { PFM_ROW_GRID, PfmResultRowComponent } from '../pfm-result-row/pfm-result-row.component';

// Literal class strings so Tailwind can see them. Colors are tokens only (NFR-PFM-003).
const SEGMENTS: { key: 'approved' | 'pending' | 'rejected' | 'out_of_scope' | 'not_sent'; seg: string; title: (n: number) => string }[] = [
  { key: 'approved', seg: 'bg-[var(--ac-pfm-seg-approved)]', title: n => `${n} approved in PRMS` },
  { key: 'pending', seg: 'bg-[var(--ac-pfm-seg-pending-group)]', title: n => `${n} pending review` },
  { key: 'rejected', seg: 'bg-[var(--ac-pfm-seg-rejected)]', title: n => `${n} rejected` },
  { key: 'out_of_scope', seg: 'bg-[var(--ac-pfm-seg-no-sp)]', title: n => `${n} no SP contribution · out of PRMS scope` },
  { key: 'not_sent', seg: 'bg-[var(--ac-pfm-seg-not-started)]', title: n => `${n} not synced yet` }
];

const COLUMNS = ['Result', 'STAR status', 'Pool funding mapping', 'PRMS status', 'Updated', 'Action'];

/** Collapsible project group: header summary + lazily loaded result rows. */
@Component({
  selector: 'app-pfm-project-group',
  imports: [PfmResultRowComponent],
  templateUrl: './pfm-project-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmProjectGroupComponent {
  readonly store = inject(PfmStoreService);
  group = input.required<PfmGroup>();
  readonly grid = PFM_ROW_GRID;
  readonly columns = COLUMNS;
  readonly skeletons = [0, 1, 2];

  open = computed(() => this.store.openGroups().has(this.group().code));
  rows = computed(() => this.store.groupRows()[this.group().code]);
  state = computed(() => this.store.groupState()[this.group().code]);
  loading = computed(() => !!this.state()?.loading || (!this.rows() && !this.state()?.error));
  error = computed(() => !!this.state()?.error);

  /** Zero segments are not rendered (a zero-width element would still be focusable / hoverable). */
  segments = computed(() => SEGMENTS.map(s => ({ ...s, n: this.group().counts[s.key] })).filter(s => s.n > 0));
  /** Text alternative of the bar for assistive tech: non-zero segments only. */
  barSummary = computed(() =>
    this.segments()
      .map(s => s.title(s.n))
      .join(', ')
  );
  countLabel = computed(() => `${this.group().result_count} ${this.group().result_count === 1 ? 'result' : 'results'}`);
  /** Flag copy is client-owned (mockup `flagLabel`). */
  flagLabel = computed(() => {
    const n = this.group().attention;
    return n ? `${n} ${n === 1 ? 'needs' : 'need'} attention` : 'All clear';
  });
}
