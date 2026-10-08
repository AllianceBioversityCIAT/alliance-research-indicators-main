import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PfmMappingState, PfmPrmsStatus, PfmStarLabel } from '../../pfm.interfaces';

export type PfmBadgeKind = 'star' | 'mapping' | 'prms' | 'sp';

const SUCCESS = 'bg-[var(--ac-pfm-success-bg)] text-[var(--ac-pfm-success-fg)]';
const INFO = 'bg-[var(--ac-pfm-info-bg)] text-[var(--ac-pfm-info-fg)]';
const REVIEW = 'bg-[var(--ac-pfm-review-bg)] text-[var(--ac-pfm-review-fg)]';
const NEUTRAL = 'bg-[var(--ac-pfm-neutral-bg)] text-[var(--ac-pfm-neutral-fg)]';
const DANGER = 'bg-[var(--ac-pfm-danger-bg)] text-[var(--ac-pfm-danger-fg)]';
const WARNING = 'bg-[var(--ac-pfm-warning-bg)] text-[var(--ac-pfm-warning-fg)]';

const STAR_TONES: Record<string, string> = {
  Approved: SUCCESS,
  Submitted: INFO,
  'Under review': REVIEW,
  Draft: NEUTRAL,
  Returned: DANGER
};

const MAPPING_TONES: Record<string, string> = {
  Complete: SUCCESS,
  Incomplete: WARNING,
  'Not started': NEUTRAL,
  'No SP contribution': SUCCESS
};

const PRMS_TONES: Record<string, string> = {
  'Pending Review': WARNING,
  Approved: SUCCESS,
  Rejected: DANGER
};

const PRMS_NOT_SENT = 'Not sent';

@Component({
  selector: 'app-pfm-status-badge',
  templateUrl: './pfm-status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmStatusBadgeComponent {
  kind = input.required<PfmBadgeKind>();
  /** Shared wire unions; `string & {}` keeps the 'sp' kind (a program name) and unknown values accepted. */
  value = input.required<PfmStarLabel | PfmMappingState | PfmPrmsStatus | (string & {})>();
  /** DB hex color (clarisa_science_programs.color); only used when kind === 'sp'. */
  color = input<string | null | undefined>(null);

  isNotSent = computed(() => this.kind() === 'prms' && this.value() === PRMS_NOT_SENT);

  /** Tailwind classes for the pill; 'sp' colors are bound through the --sp variable instead. */
  toneClasses = computed(() => {
    const value = this.value();
    switch (this.kind()) {
      case 'star':
        return STAR_TONES[value] ?? NEUTRAL;
      case 'mapping':
        return MAPPING_TONES[value] ?? NEUTRAL;
      case 'prms':
        return PRMS_TONES[value] ?? NEUTRAL;
      default:
        return this.color() ? 'bg-[color-mix(in_srgb,var(--sp)_14%,transparent)] text-[var(--sp)]' : NEUTRAL;
    }
  });

  shapeClasses = computed(() => (this.kind() === 'prms' ? 'rounded-full px-3 py-1' : 'rounded-md px-2 py-0.5'));

  spVar = computed(() => (this.kind() === 'sp' ? this.color() || null : null));
}
