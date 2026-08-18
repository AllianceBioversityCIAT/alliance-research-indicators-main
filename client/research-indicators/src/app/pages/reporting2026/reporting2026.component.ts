import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

type IndicatorId = 'kp' | 'oicr' | 'cap' | 'innovDev' | 'innovUse' | 'policy';
type FundingId = 'w3' | 'program';
type PlatformId = 'TIP' | 'STAR' | 'PRMS';

interface Indicator {
  label: string;
  type: 'fixed' | 'funding';
}

interface Platform {
  name: string;
  url: string;
  support: string;
}

interface Outcome {
  platform: PlatformId;
  why: string;
}

interface Chip {
  label: string;
  aria: string;
  edit: () => void;
}

/**
 * Public "Reporting Pathway Wayfinder" (route: /reporting2026).
 *
 * Step-by-step state machine mirroring the original design:
 *   Q1 result type -> (optional) Q2 funding source -> result screen.
 *
 * Routing logic (unchanged from the source design):
 *   Knowledge Product            -> TIP  (no funding question)
 *   Outcome Impact Case Report   -> STAR (no funding question)
 *   Capacity / Innovation / Policy -> ask funding: W3/bilateral -> STAR, Program/Accelerator -> PRMS
 */
@Component({
  selector: 'app-reporting2026',
  standalone: true,
  imports: [S3ImageUrlPipe, NgClass],
  templateUrl: './reporting2026.component.html',
  host: { class: 'block min-h-screen bg-[var(--ac-background)] text-[color:var(--ac-grey-900)]' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class Reporting2026Component {
  readonly INDICATORS: Record<IndicatorId, Indicator> = {
    kp: { label: 'Knowledge Product', type: 'fixed' },
    oicr: { label: 'Outcome Impact Case Report', type: 'fixed' },
    cap: { label: 'Capacity Sharing for Development', type: 'funding' },
    innovDev: { label: 'Innovation Development', type: 'funding' },
    innovUse: { label: 'Innovation Use', type: 'funding' },
    policy: { label: 'Policy Change & Investment Contribution', type: 'funding' }
  };

  readonly FUNDING: Record<FundingId, { label: string }> = {
    w3: { label: 'W3 or bilateral project' },
    program: { label: 'CGIAR Program or Accelerator' }
  };

  readonly PLATFORMS: Record<PlatformId, Platform> = {
    TIP: { name: 'TIP', url: 'https://tip.alliance.cgiar.org/', support: 'DMOS' },
    STAR: { name: 'STAR', url: 'https://star.alliance.cgiar.org/', support: 'MELP' },
    PRMS: { name: 'PRMS', url: 'https://reporting.cgiar.org/', support: 'CGIAR Reporting Support Team' }
  };

  /** S3 relative logo path per platform (resolved through the s3ImageUrl pipe). */
  private readonly LOGOS: Record<PlatformId, string> = {
    TIP: 'images/tracking.svg',
    STAR: 'images/star.svg',
    PRMS: 'images/prms-reporting-tool.svg'
  };

  /** Cards for the "Already know where to report?" quick-access section. */
  readonly quickAccess = [
    { ...this.PLATFORMS.TIP, logo: this.LOGOS.TIP, desc: 'Publications and knowledge products', accent: 'border-l-[color:var(--ac-orange-1)]' },
    { ...this.PLATFORMS.STAR, logo: this.LOGOS.STAR, desc: 'Alliance results reporting', accent: 'border-l-[color:var(--ac-green-500)]' },
    { ...this.PLATFORMS.PRMS, logo: this.LOGOS.PRMS, desc: 'CGIAR Program results', accent: 'border-l-[color:var(--ac-light-blue-400)]' }
  ];

  readonly indicator = signal<IndicatorId | null>(null);
  readonly funding = signal<FundingId | null>(null);

  private readonly outcome = computed<Outcome | null>(() => this.route(this.indicator(), this.funding()));
  private readonly currentIndicator = computed<Indicator | null>(() => {
    const id = this.indicator();
    return id ? this.INDICATORS[id] : null;
  });
  private readonly needsFunding = computed(() => this.currentIndicator()?.type === 'funding');

  readonly showResult = computed(() => this.outcome() !== null);
  readonly showQ2 = computed(() => !this.showResult() && this.needsFunding());
  readonly showQ1 = computed(() => !this.showResult() && !this.showQ2());

  readonly chips = computed<Chip[]>(() => {
    const chips: Chip[] = [];
    const ind = this.currentIndicator();
    if (ind) {
      chips.push({ label: ind.label, aria: 'Change result type, currently ' + ind.label, edit: () => this.startOver() });
    }
    const fundingId = this.funding();
    if (fundingId) {
      chips.push({ label: this.FUNDING[fundingId].label, aria: 'Change funding source', edit: () => this.funding.set(null) });
    }
    return chips;
  });

  readonly showTrail = computed(() => this.chips().length > 0);
  readonly stepLabel = computed(() => (this.showQ2() ? 'Step 2 of 2' : ''));

  private readonly platform = computed<Platform | null>(() => {
    const outcome = this.outcome();
    return outcome ? this.PLATFORMS[outcome.platform] : null;
  });

  readonly resultName = computed(() => this.platform()?.name ?? '');
  readonly resultUrl = computed(() => this.platform()?.url ?? '#');
  readonly resultSupport = computed(() => this.platform()?.support ?? '');
  readonly resultWhy = computed(() => this.outcome()?.why ?? '');
  readonly resultLogo = computed(() => {
    const outcome = this.outcome();
    return outcome ? this.LOGOS[outcome.platform] : '';
  });

  /** KP -> TIP (fixed), OICR -> STAR (fixed), others -> funding: w3 -> STAR, program -> PRMS. */
  private route(indicator: IndicatorId | null, funding: FundingId | null): Outcome | null {
    if (!indicator) return null;
    if (indicator === 'kp') return { platform: 'TIP', why: 'Knowledge Products are reported in TIP regardless of funding source.' };
    if (indicator === 'oicr') return { platform: 'STAR', why: 'Outcome Impact Case Reports are initiated in STAR regardless of funding source.' };
    if (!funding) return null;
    if (funding === 'w3') return { platform: 'STAR', why: 'W3 and bilateral project results are reported in STAR.' };
    if (funding === 'program') return { platform: 'PRMS', why: 'Results achieved through a CGIAR Program or Accelerator are reported in PRMS.' };
    return null;
  }

  setIndicator(id: IndicatorId): void {
    this.indicator.set(id);
    this.funding.set(null);
  }

  setFunding(id: FundingId): void {
    this.funding.set(id);
  }

  goBack(): void {
    if (this.funding()) {
      this.funding.set(null);
    } else {
      this.indicator.set(null);
      this.funding.set(null);
    }
  }

  startOver(): void {
    this.indicator.set(null);
    this.funding.set(null);
  }
}
