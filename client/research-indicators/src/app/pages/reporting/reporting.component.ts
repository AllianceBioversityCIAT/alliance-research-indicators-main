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
  /** Tailwind class for the result card top border colour. */
  topBorder: string;
  /** Tailwind class for the result platform name colour. */
  ink: string;
  /** Tailwind classes for the solid "Open platform" button (bg + hover). */
  btn: string;
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

interface Faq {
  q: string;
  a: string;
}

/**
 * Public "Reporting Pathfinder" (route: /reporting).
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
  host: { class: 'block min-h-screen bg-[#FCFBF6] text-[#231F20]' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class ReportingComponent {
  readonly INDICATORS: Record<IndicatorId, Indicator> = {
    kp: {
      label: 'Knowledge Product',
      type: 'fixed',
      evidence: 'The product record itself — DOI, publication or repository record.',
      pitfall: 'Drafts, duplicates or incomplete metadata.'
    },
    oicr: {
      label: 'Outcome Impact Case Report',
      type: 'fixed',
      evidence: 'Evidence of the outcome and of the Alliance contribution.',
      pitfall: 'Reporting activities instead of outcomes or impacts.'
    },
    cap: {
      label: 'Capacity Sharing for Development',
      type: 'funding',
      evidence: 'Participant list, agenda, training materials, workshop report.',
      pitfall: 'Meetings or awareness events with no learning component.'
    },
    innovDev: {
      label: 'Innovation Development',
      type: 'funding',
      evidence: 'Testing, validation, trial or prototype documentation.',
      pitfall: 'Reporting activities instead of innovations; overstating readiness.'
    },
    innovUse: {
      label: 'Innovation Use',
      type: 'funding',
      evidence: 'Adoption data, monitoring records, user confirmations.',
      pitfall: 'Confusing dissemination, training or awareness with use.'
    },
    policy: {
      label: 'Policy Change',
      type: 'funding',
      evidence: 'Policy documents, legal instruments, implementation evidence.',
      pitfall: 'Reporting consultations or advocacy without evidence of change.'
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
      topBorder: 'border-t-[#E8862A]',
      ink: 'text-[#94500F]',
      btn: 'bg-[#94500F] hover:bg-[#7A4109]'
    },
    STAR: {
      name: 'STAR',
      url: 'https://star.alliance.cgiar.org/',
      support: 'MELP',
      logo: 'images/star.svg',
      topBorder: 'border-t-[#3C8DC8]',
      ink: 'text-[#2A6D9E]',
      btn: 'bg-[#2A6D9E] hover:bg-[#1F567E]'
    },
    PRMS: {
      name: 'PRMS',
      url: 'https://reporting.cgiar.org/',
      support: 'CGIAR Reporting Support Team',
      logo: 'images/prms-reporting-tool.svg',
      topBorder: 'border-t-[#5569DD]',
      ink: 'text-[#5569DD]',
      btn: 'bg-[#5569DD] hover:bg-[#4152BB]'
    }
  };

  /** FAQ sets shown depending on the current step. */
  private readonly FAQS_LANDING: Faq[] = [
    {
      q: 'Who is responsible for reporting?',
      a: 'The Principal Investigator and the research team. Support teams provide technical backstopping, but responsibility for reporting — and for the quality of what is reported — stays with the team that produced the result.'
    },
    {
      q: 'Why does reporting matter?',
      a: 'Research result indicators are now dimensions of the Alliance institutional performance monitoring framework. Beyond that, reporting supports accountability to donors and partners, learning across teams, evidence of strategic impact, and visibility for the people who did the work.'
    },
    {
      q: 'What is the difference between outputs and outcomes?',
      a: 'Outputs are what we produce — knowledge products, capacity sharing, innovations under development. Outcomes are the change that follows when others use them: an innovation in use, a policy informed, a documented impact.'
    },
    {
      q: 'How does the OICR process work?',
      a: 'OICRs are identified with MELP, drafted with the research team, evidenced and quality-assured, then packaged for institutional and CGIAR reporting. Start early: the evidence of contribution takes time to assemble.'
    }
  ];

  private readonly FAQS_FUNDING: Faq[] = [
    {
      q: 'What are the CGIAR funding streams and what do they mean?',
      a: 'Pooled funding (W1/W2) is channelled through the CGIAR Trust Fund — W1 to the Portfolio as a whole, W2 designated to specific Programs and Accelerators; those results are reported in PRMS. Non-pooled funding (W3 and bilateral) is Center-managed project funding; those results are reported in STAR.'
    },
    {
      q: 'How do I determine the primary funding source?',
      a: 'Follow the money: identify the stream that financed the majority of what made the result possible — staff time, research and engagement activities, travel and events, and the most critical technical inputs.'
    },
    {
      q: 'Several funding sources contributed. Which one counts?',
      a: 'The one that financed the largest share of the activities, resources and staff time. Record the other contributing projects and funders inside the platform so the full picture is preserved.'
    },
    {
      q: 'Do funding sources affect reporting of Knowledge Products or OICRs?',
      a: 'No. Knowledge Products are always reported in TIP and OICRs are always initiated in STAR, whatever funded them.'
    }
  ];

  private readonly FAQS_PLATFORM: Faq[] = [
    {
      q: 'How does reporting contribute to performance monitoring?',
      a: 'Research result indicators are used as dimensions for measuring contribution to selected institutional performance areas and objectives — so what you report in TIP, STAR or PRMS feeds directly into how Alliance performance is assessed.'
    },
    {
      q: 'Can reporting support my performance appraisal?',
      a: 'Yes. A PDF summary of submitted results can be exported and attached as supporting evidence of individual contributions to relevant institutional performance areas.'
    },
    {
      q: 'What is the timeline for reporting?',
      a: 'Knowledge Products in TIP and results reported through STAR can generally be submitted throughout the year, reflecting the nature of those results. PRMS operates through dedicated reporting windows established and communicated by the CGIAR System Office.'
    },
    {
      q: 'I have more questions. Where can I find additional support?',
      a: 'Guidance materials, reporting resources, webinars and reporting clinics are available throughout the reporting process. You can also contact the relevant technical support team directly.'
    }
  ];

  readonly indicator = signal<IndicatorId | null>(null);
  readonly funding = signal<FundingId | null>(null);

  /** Which quick-access platform cards are expanded ("View more"). */
  private readonly expandedPlatforms = signal<ReadonlySet<string>>(new Set());

  isPlatformExpanded(name: string): boolean {
    return this.expandedPlatforms().has(name);
  }

  togglePlatform(name: string): void {
    const next = new Set(this.expandedPlatforms());
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    this.expandedPlatforms.set(next);
  }

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
  readonly resultInk = computed(() => this.platform()?.ink ?? '');
  readonly resultBtn = computed(() => this.platform()?.btn ?? '');
  readonly resultEvidence = computed(() => this.currentIndicator()?.evidence ?? '');
  readonly resultPitfall = computed(() => this.currentIndicator()?.pitfall ?? '');
  readonly resultResponsibility = computed(() =>
    this.platform()?.name === 'PRMS' ? 'PI and the Science Program/Accelerator team' : 'PI and research team'
  );

  /** FAQ set + heading depend on the current step. */
  readonly faqs = computed<Faq[]>(() => {
    if (this.showResult()) return this.FAQS_PLATFORM;
    if (this.showQ2()) return this.FAQS_FUNDING;
    return this.FAQS_LANDING;
  });
  readonly faqsTitle = computed(() => {
    if (this.showResult()) return 'Common questions — reporting platforms';
    if (this.showQ2()) return 'Common questions — funding sources';
    return 'Common questions';
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
