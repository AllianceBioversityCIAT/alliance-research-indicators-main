import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

type IndicatorId = 'kp' | 'oicr' | 'cap' | 'innovDev' | 'innovUse' | 'policy';
type FundingId = 'w3' | 'program';
type PlatformId = 'TIP' | 'STAR' | 'PRMS';

interface Indicator {
  label: string;
  type: 'fixed' | 'funding';
  /** Evidence to have ready — shown on the result screen. */
  evidence: string;
  /** Common pitfall to avoid — shown on the result screen. */
  pitfall: string;
}

interface Platform {
  name: string;
  url: string;
  support: string;
  /** S3 relative logo path (resolved through the s3ImageUrl pipe). */
  logo: string;
  /** Tailwind class for the accent border used across the UI. */
  accentBorder: string;
  /** Tailwind class for the result card top border. */
  topBorder: string;
  /** Tailwind classes for the "Open platform" button (bg + hover). */
  btn: string;
  /** Tailwind class for the result platform name colour. */
  ink: string;
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
 * Public "Reporting Pathway Wayfinder" (route: /reporting).
 *
 * Step-by-step state machine:
 *   Q1 result type -> (optional) Q2 funding source -> result screen.
 *
 * Routing logic (unchanged from the source design):
 *   Knowledge Product            -> TIP  (no funding question)
 *   Outcome Impact Case Report   -> STAR (no funding question)
 *   Capacity / Innovation / Policy -> ask funding: W3/bilateral -> STAR, Program/Accelerator -> PRMS
 */
@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [S3ImageUrlPipe, NgClass],
  templateUrl: './reporting.component.html',
  host: { class: 'block min-h-screen bg-[#FAF8F1] text-[#1E3932]' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class ReportingComponent {
  readonly INDICATORS: Record<IndicatorId, Indicator> = {
    kp: {
      label: 'Knowledge Product',
      type: 'fixed',
      evidence: 'The product record itself — DOI, repository or publisher link.',
      pitfall: 'Registering the same product more than once.'
    },
    oicr: {
      label: 'Outcome Impact Case Report',
      type: 'fixed',
      evidence: 'Policy documents, monitoring data, evaluations, adoption statistics, partner confirmations.',
      pitfall: 'Describing activities instead of the change, or weak attribution.'
    },
    cap: {
      label: 'Capacity Sharing for Development',
      type: 'funding',
      evidence: 'Participant list, agenda, training materials, workshop report, presentations.',
      pitfall: 'Reporting meetings or awareness events with no learning component.'
    },
    innovDev: {
      label: 'Innovation Development',
      type: 'funding',
      evidence: 'Technical documentation, prototypes, testing results, validation studies, field trials.',
      pitfall: 'Reporting planned work, or overstating the readiness level.'
    },
    innovUse: {
      label: 'Innovation Use',
      type: 'funding',
      evidence: 'Adoption surveys, monitoring data, platform analytics, user or partner confirmations.',
      pitfall: 'Treating training, availability or awareness as evidence of use.'
    },
    policy: {
      label: 'Policy Change & Investment Contribution',
      type: 'funding',
      evidence: 'Official drafts or approved instruments, budget documents, minutes, citations, evaluations.',
      pitfall: 'Reporting advocacy or consultations with no documented policy change.'
    }
  };

  readonly FUNDING: Record<FundingId, { label: string }> = {
    w3: { label: 'W3 or bilateral project' },
    program: { label: 'CGIAR Program or Accelerator' }
  };

  readonly PLATFORMS: Record<PlatformId, Platform> = {
    TIP: {
      name: 'TIP',
      url: 'https://tip.alliance.cgiar.org/',
      support: 'DMOS',
      logo: 'images/tracking.svg',
      accentBorder: 'border-l-[#E8862A]',
      topBorder: 'border-t-[#E8862A]',
      btn: 'bg-[#B4611A] hover:bg-[#94500F]',
      ink: 'text-[#B4611A]'
    },
    STAR: {
      name: 'STAR',
      url: 'https://star.alliance.cgiar.org/',
      support: 'MELP',
      logo: 'images/star.svg',
      accentBorder: 'border-l-[#3C8DC8]',
      topBorder: 'border-t-[#3C8DC8]',
      btn: 'bg-[#2A6D9E] hover:bg-[#1F567E]',
      ink: 'text-[#2A6D9E]'
    },
    PRMS: {
      name: 'PRMS',
      url: 'https://reporting.cgiar.org/',
      support: 'CGIAR Reporting Support Team',
      logo: 'images/prms-reporting-tool.svg',
      accentBorder: 'border-l-[#5569DD]',
      topBorder: 'border-t-[#5569DD]',
      btn: 'bg-[#5569DD] hover:bg-[#4152BB]',
      ink: 'text-[#5569DD]'
    }
  };

  /** Cards for the "Already know where to report?" quick-access section. */
  readonly quickAccess = [
    { ...this.PLATFORMS.STAR, desc: 'OICRs, W3 & bilateral results · support: MELP' },
    { ...this.PLATFORMS.TIP, desc: 'Knowledge Products · support: DMOS' },
    { ...this.PLATFORMS.PRMS, desc: 'CGIAR Program results · support: CGIAR Reporting Team' }
  ];

  /** Common questions for the reference section. */
  readonly faqs = [
    {
      q: 'Several funding sources contributed. Which one counts?',
      a: 'The one that financed the largest share of the activities, resources and staff time. Record the other contributing projects inside STAR or PRMS so all contributions stay traceable.'
    },
    {
      q: 'Does funding source affect Knowledge Products or OICRs?',
      a: 'No. Knowledge Products always go to TIP and OICRs are always initiated in STAR, whatever funded them.'
    },
    {
      q: 'Who is responsible for reporting?',
      a: 'The Principal Investigator and research team. Support teams provide technical backstopping, but accountability for quality stays with you.'
    },
    {
      q: 'What is the difference between outputs and outcomes?',
      a: 'Outputs are what the Alliance produces — Knowledge Products, Capacity Sharing, Innovation Development. Outcomes are the changes that follow when others use them — Innovation Use, Policy Change, OICRs.'
    },
    {
      q: 'How does the OICR process work?',
      a: 'Submit a request to draft an OICR through STAR, then technical review and quality assurance, scientific validation, editorial review, and publication with an update of the STAR submission.'
    }
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
  readonly resultLogo = computed(() => this.platform()?.logo ?? '');
  readonly resultTopBorder = computed(() => this.platform()?.topBorder ?? '');
  readonly resultBtn = computed(() => this.platform()?.btn ?? '');
  readonly resultInk = computed(() => this.platform()?.ink ?? '');
  readonly resultEvidence = computed(() => this.currentIndicator()?.evidence ?? '');
  readonly resultPitfall = computed(() => this.currentIndicator()?.pitfall ?? '');

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
