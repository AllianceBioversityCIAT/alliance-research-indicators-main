import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { ContractCgiarEntity } from '@shared/interfaces/find-contracts.interface';

export interface ProjectContextTimeline {
  startDate: string;
  endDate: string;
  extensionDate: string | null;
  elapsedPercent: number;
  isExtended: boolean;
}

function formatCurrencyUSD(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const amount = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]+/g, ''));
  if (!Number.isFinite(amount)) {
    return null;
  }
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
  return `${formatted} USD`;
}

@Component({
  selector: 'app-project-context-strip',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './project-context-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full'
  }
})
export class ProjectContextStripComponent {
  readonly project = input<GetProjectDetail | null>(null);

  readonly grantAmount = computed<string | null>(() => {
    const p = this.project();
    const raw = p?.grant_amount_usd ?? p?.grant_amount;
    return formatCurrencyUSD(raw);
  });

  readonly centerAmount = computed<string | null>(() => {
    const p = this.project();
    const raw = p?.center_amount_usd;
    return formatCurrencyUSD(raw);
  });

  readonly fundingType = computed<string | null>(() => {
    const ft = this.project()?.funding_type;
    if (ft === null || ft === undefined || ft.trim() === '') {
      return null;
    }
    return ft.trim();
  });

  readonly contractStatus = computed<string | null>(() => {
    const p = this.project();
    const raw = p?.contract_status ?? p?.status_name;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return null;
    }
    return String(raw).trim();
  });

  readonly timeline = computed<ProjectContextTimeline | null>(() => {
    const p = this.project();
    const startDateRaw = p?.start_date?.trim();
    const endDateRaw = p?.end_date?.trim();
    if (!startDateRaw || !endDateRaw) {
      return null;
    }

    const start = new Date(startDateRaw).getTime();
    const end = new Date(endDateRaw).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return null;
    }

    const extensionDateRaw = p?.extension_date?.trim();
    const hasExt = !!extensionDateRaw && extensionDateRaw !== '';
    const ext = hasExt ? new Date(extensionDateRaw!).getTime() : NaN;
    const isExtended = hasExt && !Number.isNaN(ext);
    const extensionDate = isExtended ? extensionDateRaw! : null;

    const targetEnd = isExtended ? ext : end;
    const totalDuration = targetEnd - start;

    let elapsedPercent = 0;
    if (totalDuration > 0) {
      const now = Date.now();
      const elapsed = ((now - start) / totalDuration) * 100;
      elapsedPercent = Math.max(0, Math.min(100, Math.round(elapsed)));
    } else {
      const now = Date.now();
      elapsedPercent = now >= start ? 100 : 0;
    }

    return {
      startDate: startDateRaw,
      endDate: endDateRaw,
      extensionDate,
      elapsedPercent,
      isExtended
    };
  });

  readonly sdgs = computed<string[]>(() => {
    const rawSdgs = this.project()?.sdgs;
    if (!Array.isArray(rawSdgs) || rawSdgs.length === 0) {
      return [];
    }
    return rawSdgs
      .map(item => {
        if (item === null || item === undefined || item === '') return null;
        const str = String(item).trim();
        if (!str) return null;
        const upper = str.toUpperCase();
        return upper.startsWith('SDG') ? upper : `SDG ${str}`;
      })
      .filter((label): label is string => label !== null && label !== '');
  });

  readonly cgiarEntities = computed<ContractCgiarEntity[]>(() => {
    const entities = this.project()?.cgiar_entities;
    if (!Array.isArray(entities)) {
      return [];
    }
    return entities.filter(e => !!(e && (e.code?.trim() || e.name?.trim())));
  });

  readonly hasPrimaryContext = computed<boolean>(() => {
    return !!(
      this.grantAmount() ||
      this.centerAmount() ||
      this.fundingType() ||
      this.contractStatus() ||
      this.timeline()
    );
  });

  readonly hasSecondaryContext = computed<boolean>(() => {
    return this.sdgs().length > 0 || this.cgiarEntities().length > 0;
  });

  readonly hasAnyContext = computed<boolean>(() => {
    return this.hasPrimaryContext() || this.hasSecondaryContext();
  });
}
