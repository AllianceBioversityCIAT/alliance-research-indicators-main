// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-09 (R-PFM-005)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PfmKpis, PfmScope } from '../../pfm.interfaces';

interface KpiCard {
  key: string;
  label: string;
  value: number;
  sub: string;
  accent: string;
  ink: string;
  frame: string;
  size: string;
  icon: string;
  iconInk: string;
}

@Component({
  selector: 'app-pfm-kpi-cards',
  templateUrl: './pfm-kpi-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmKpiCardsComponent {
  kpis = input.required<PfmKpis>();
  scope = input.required<PfmScope>();

  cards = computed<KpiCard[]>(() => {
    const k = this.kpis();
    return [
      {
        key: 'projects',
        label: 'Projects contributing to Pool funding',
        value: k.projects,
        sub: this.scope() === 'mine' ? 'where you are PI' : `of ${k.projects_total.toLocaleString('en-US')} in portfolio`,
        accent: 'border-l-[color:var(--ac-pfm-info-fg)]',
        ink: 'text-[var(--ac-pfm-info-fg)]',
        frame: 'border-[color:var(--ac-pfm-surface-border)]',
        size: 'flex-[1.6_1_185px] min-w-[160px]',
        icon: 'pi-briefcase',
        iconInk: 'atc-primary-blue-300'
      },
      {
        key: 'monitored',
        label: 'Results eligible for Pool funding mapping',
        value: k.monitored,
        sub: 'can be mapped and synced',
        accent: 'border-l-[color:var(--ac-pfm-accent-navy)]',
        ink: 'text-[var(--ac-pfm-accent-navy)]',
        frame: 'border-[color:var(--ac-pfm-surface-border)]',
        size: 'flex-[1.6_1_185px] min-w-[160px]',
        icon: 'pi-list',
        iconInk: 'atc-primary-blue-300'
      },
      {
        key: 'need_attention',
        label: 'Need attention',
        value: k.need_attention,
        sub: 'draft, pending mapping or pending sync',
        accent: 'border-l-[color:var(--ac-pfm-seg-pending)]',
        ink: 'text-[var(--ac-pfm-warning-fg)]',
        frame: 'border-[color:var(--ac-pfm-warning-border)]',
        size: 'flex-[1.6_1_185px] min-w-[160px]',
        icon: 'pi-exclamation-triangle',
        iconInk: 'atc-orange-1'
      },
      {
        key: 'synced',
        label: 'Synced with PRMS',
        value: k.synced,
        sub: `of ${k.in_prms_scope.toLocaleString('en-US')} in PRMS scope`,
        accent: 'border-l-[color:var(--ac-pfm-seg-approved)]',
        ink: 'text-[var(--ac-pfm-success-fg)]',
        frame: 'border-[color:var(--ac-pfm-surface-border)]',
        size: 'flex-[1_1_120px] min-w-[120px]',
        icon: 'pi-check-circle',
        iconInk: 'atc-primary-blue-300'
      }
    ];
  });
}
