// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-09 (R-PFM-005)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PFM_HELP } from '../../pfm-help';
import { PfmKpis } from '../../pfm.interfaces';

interface KpiCard {
  key: string;
  label: string;
  value: number;
  sub: string;
  accent: string;
  ink: string;
  frame: string;
  icon: string;
  iconInk: string;
  /** Plain-language tooltip of the card. */
  help: string;
  /** Optional tooltip on the sub-line term (e.g. "PRMS scope"). */
  subHelp?: string;
}

@Component({
  selector: 'app-pfm-kpi-cards',
  imports: [TooltipModule],
  templateUrl: './pfm-kpi-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmKpiCardsComponent {
  kpis = input.required<PfmKpis>();

  cards = computed<KpiCard[]>(() => {
    const k = this.kpis();
    return [
      {
        key: 'monitored',
        label: 'Results eligible for CGIAR Portfolio mapping',
        value: k.monitored,
        sub: 'can be mapped and synced',
        accent: 'border-l-[color:var(--ac-pfm-accent-navy)]',
        ink: 'text-[var(--ac-pfm-accent-navy)]',
        frame: 'border-[color:var(--ac-pfm-surface-border)]',
        icon: 'pi-list',
        iconInk: 'atc-primary-blue-300',
        help: 'Results of contributing projects that can be mapped to the CGIAR Portfolio and sent to PRMS.'
      },
      {
        key: 'need_attention',
        label: 'Need attention',
        value: k.need_attention,
        sub: 'nothing in PRMS yet',
        accent: 'border-l-[color:var(--ac-state-alert-fill)]',
        ink: 'text-[var(--ac-state-alert-fg)]',
        frame: 'border-[color:var(--ac-pfm-surface-border)]',
        icon: 'pi-exclamation-triangle',
        iconInk: 'text-[var(--ac-state-alert-fg)]',
        help: PFM_HELP.needAttention
      },
      {
        key: 'synced',
        label: 'Synced with PRMS',
        value: k.synced,
        sub: `of ${k.in_prms_scope.toLocaleString('en-US')} in PRMS scope`,
        accent: 'border-l-[color:var(--ac-state-done-fill)]',
        ink: 'text-[var(--ac-state-done-fg)]',
        frame: 'border-[color:var(--ac-pfm-surface-border)]',
        icon: 'pi-check-circle',
        iconInk: 'text-[var(--ac-state-done-fg)]',
        help: PFM_HELP.synced,
        subHelp: PFM_HELP.prmsScope
      }
    ];
  });
}
