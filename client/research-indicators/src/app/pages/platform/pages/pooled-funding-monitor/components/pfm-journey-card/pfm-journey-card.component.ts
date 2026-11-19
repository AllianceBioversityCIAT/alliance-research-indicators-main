import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PFM_STATE } from '@shared/constants/pfm-status-colors';
import { PFM_HELP } from '../../pfm-help';
import { PfmChip, PfmJourney, PfmScope } from '../../pfm.interfaces';

/** How a part of a stage is labelled: still needs work, done for good, or moves to the next stage. */
type PartKind = 'act' | 'done' | 'next' | 'synced';

/** Where a card leads: the queue view of exactly its results, or the projects table (stage 1). */
type PartTarget = PfmChip | 'projects_with' | 'projects_without';

interface StagePart {
  label: string;
  note: string;
  value: number;
  color: string;
  kind: PartKind;
  target: PartTarget;
}

interface StageAction {
  value: number;
  label: string;
  note: string;
  cta: string;
  /** Where the CTA leads: a Results queue quick view, or the projects table below (stage 1). */
  chip: PfmChip | null;
  ink: string;
}

interface Stage {
  title: string;
  value: number;
  caption: string;
  story: string;
  parts: StagePart[];
  action: StageAction;
}

const PART_TAG: Record<PartKind, string> = { act: 'Needs action', done: 'Finished', next: 'Moves on', synced: 'Synced' };

/** STAR's own status colours for Draft / Submitted / Approved (result_status config). */
const STAR_DRAFT = 'var(--ac-light-blue-300)';
const STAR_SUBMITTED = 'var(--ac-primary-blue-500)';
/** The Completed in TIP status colour (result_status 20 config text), as its tag shows it. */
const TIP_COMPLETED = 'var(--ac-green-500)';

/**
 * Coverage tab, "the journey of a result": five stages a result goes through, each a subset of
 * the one before. A stage is chosen in the stepper; its detail says how its results split and
 * what to do next. Stage 1 is about projects: its action is the projects table under the card.
 */
@Component({
  selector: 'app-pfm-journey-card',
  imports: [DecimalPipe],
  templateUrl: './pfm-journey-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmJourneyCardComponent {
  journey = input.required<PfmJourney>();
  scope = input.required<PfmScope>();
  /** 0-based selected stage; owned by the coverage tab. */
  stage = input(0);
  stageChange = output<number>();
  /** A stage CTA that leads to the Results queue. */
  openQueue = output<PfmChip>();
  /** Stage 1 CTA: show the projects without results in the table below. */
  showProjectsWithoutResults = output<void>();
  /** Stage 1 card: show the projects that have results in the table below. */
  showProjectsWithResults = output<void>();

  readonly partTag = PART_TAG;

  private readonly who = computed(() => (this.scope() === 'all' ? 'all PIs and delegates' : 'you or your delegates'));

  /** Knowledge products reported and completed in TIP (DD-PFM-40). 0 from an older server. */
  private readonly completedInTip = computed(() => this.journey().star.completed_in_tip ?? 0);

  /** Every result reported, in STAR or in TIP. */
  reported = computed(() => {
    const s = this.journey().star;
    return s.draft + s.submitted + s.approved + this.completedInTip();
  });

  /** Results that reach stage 3: approved in STAR or completed in TIP. */
  private readonly approvedOrCompleted = computed(() => this.journey().star.approved + this.completedInTip());

  headline = computed(() => {
    const j = this.journey();
    const fmt = (n: number) => n.toLocaleString('en-US');
    return `Across ${this.scope() === 'all' ? 'the' : 'your'} ${fmt(j.projects.total)} bilateral projects mapped to the CGIAR portfolio, ${fmt(this.reported())} results have been reported so far.`;
  });

  /** Results nothing more is expected from: no SP contribution, or in PRMS and not rejected. */
  doneTotal = computed(() => {
    const j = this.journey();
    return j.answer.no_sp + j.sync.synced - j.sync.rejected;
  });

  /** Results someone still has to act on, at any stage. */
  actionTotal = computed(() => {
    const j = this.journey();
    return j.star.draft + j.star.submitted + j.answer.not_answered + j.mapping.incomplete + j.sync.ready + j.sync.rejected;
  });

  stages = computed<Stage[]>(() => {
    const j = this.journey();
    const fmt = (n: number) => n.toLocaleString('en-US');
    const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 100) : 0}%`;
    const reported = this.reported();
    const contributes = j.answer.contributes;
    const mapped = j.mapping.complete;
    const tip = this.completedInTip();
    const approved = this.approvedOrCompleted();
    return [
      {
        title: 'Create results per project',
        value: j.projects.total,
        caption: 'Bilateral projects',
        story: `${fmt(j.projects.with_results)} of ${fmt(j.projects.total)} bilateral projects (${pct(j.projects.with_results, j.projects.total)}) have created results in STAR. Every project mapped to the CGIAR portfolio is expected to report at least one result.`,
        parts: [
          {
            label: 'Projects with results',
            note: 'At least one result created in STAR',
            value: j.projects.with_results,
            color: PFM_STATE.complete.fill,
            kind: 'next',
            target: 'projects_with'
          },
          {
            label: 'Projects without results',
            note: 'No results created yet',
            value: j.projects.without_results,
            color: PFM_STATE.alert.fill,
            kind: 'act',
            target: 'projects_without'
          }
        ],
        action: {
          value: j.projects.without_results,
          label: 'Create results for the projects that have none',
          note: "Ask the Principal Investigator or the project team to create the project's results in STAR. Once created, they enter the approval stage.",
          cta: 'Show projects without results',
          chip: null,
          ink: PFM_STATE.alert.fg
        }
      },
      {
        title: 'Approve or reject results',
        value: reported,
        caption: 'Results reported',
        story: tip
          ? `${fmt(reported)} results have been reported under ${fmt(j.projects.with_results)} bilateral projects mapped to the CGIAR portfolio: ${fmt(reported - tip)} in STAR and ${fmt(tip)} knowledge products in TIP. Before anything can go to PRMS, a STAR result has to be approved in STAR; a TIP knowledge product arrives completed in TIP.`
          : `${fmt(reported)} results have been reported under ${fmt(j.projects.with_results)} bilateral projects mapped to the CGIAR portfolio. Before anything can go to PRMS, each one has to be approved in STAR.`,
        parts: [
          { label: 'Draft', note: 'Being written by the team', value: j.star.draft, color: STAR_DRAFT, kind: 'act', target: 'journey_draft' },
          {
            label: 'Submitted',
            note: 'Waiting for the PI or a delegate to approve',
            value: j.star.submitted,
            color: STAR_SUBMITTED,
            kind: 'act',
            target: 'journey_submitted'
          },
          {
            label: 'Approved',
            note: 'Approved in STAR, ready for the next stage',
            value: j.star.approved,
            color: PFM_STATE.approved.fill,
            kind: 'next',
            target: 'journey_approved'
          },
          // The Completed in TIP status colour, the same as its tag in every row; shown only when there are any.
          ...(tip
            ? [
                {
                  label: 'Completed in TIP',
                  note: PFM_HELP.completedInTip,
                  value: tip,
                  color: TIP_COMPLETED,
                  kind: 'next' as const,
                  target: 'journey_completed_in_tip' as const
                }
              ]
            : [])
        ],
        action: {
          value: j.star.draft + j.star.submitted,
          label: 'Approve or reject the reported results',
          note: 'Review each result reported in STAR. Approve it to move it forward, or reject it so the team can fix it. Draft results have to be submitted first.',
          cta: 'Open results awaiting approval',
          chip: 'awaiting_pi',
          ink: PFM_STATE.progress.fg
        }
      },
      {
        title: 'Define if it contributes to CGIAR',
        value: approved,
        caption: 'Approved results to classify',
        story: `${fmt(approved)} results (${pct(approved, reported)}) are approved${tip ? ' in STAR or completed in TIP' : ''}. The CGIAR Portfolio alignment can be answered at any time, but only approved results count from here on.`,
        parts: [
          {
            label: 'Mapping not answered',
            note: 'No Yes / No answer yet',
            value: j.answer.not_answered,
            color: PFM_STATE.progress.fill,
            kind: 'act',
            target: 'journey_not_answered'
          },
          {
            label: 'Yes · contributes',
            note: 'Continue to Define the mapping',
            value: contributes,
            color: PFM_STATE.complete.fill,
            kind: 'next',
            target: 'journey_contributes'
          },
          {
            label: 'No Science Program contribution',
            note: 'Not contributing — nothing else to do',
            value: j.answer.no_sp,
            color: PFM_STATE.out.fill,
            kind: 'done',
            target: 'journey_no_sp'
          }
        ],
        action: {
          value: j.answer.not_answered,
          label: 'Define which approved results contribute to the CGIAR portfolio',
          note: 'For each approved result, answer Yes and pick the Science Program it contributes to, or No if it does not contribute. Both answers are valid.',
          cta: 'Open approved results to classify',
          chip: 'mapping_incomplete',
          ink: PFM_STATE.progress.fg
        }
      },
      {
        title: 'Define the mapping',
        value: contributes,
        caption: 'Contributing results to map',
        story: `${fmt(contributes)} approved results contribute to the CGIAR portfolio. For each one, define the mapping — the Science Program it contributes to — so it can be synced.`,
        parts: [
          {
            label: 'Mapping incomplete',
            note: 'Science Program still missing',
            value: j.mapping.incomplete,
            color: PFM_STATE.progress.fill,
            kind: 'act',
            target: 'journey_mapping_incomplete'
          },
          {
            label: 'Mapping complete',
            note: 'Continue to Sync to PRMS',
            value: mapped,
            color: PFM_STATE.complete.fill,
            kind: 'next',
            target: 'journey_mapping_complete'
          }
        ],
        action: {
          value: j.mapping.incomplete,
          label: 'Define the mapping of the contributing results',
          note: 'Open each result marked Yes and select the Science Program it contributes to in the CGIAR portfolio.',
          cta: 'Open results with incomplete mapping',
          chip: 'mapping_incomplete',
          ink: PFM_STATE.progress.fg
        }
      },
      {
        title: 'Sync to PRMS',
        value: mapped,
        caption: 'Mapped results to sync',
        story: `${fmt(mapped)} results are approved and fully mapped. ${fmt(j.sync.ready)} still need to be synced; ${fmt(j.sync.synced)} are already in PRMS for Science Program QA.`,
        parts: [
          {
            label: 'Ready to sync',
            note: 'Approved and mapped, not synced yet',
            value: j.sync.ready,
            color: PFM_STATE.ready.fill,
            kind: 'act',
            target: 'journey_ready'
          },
          {
            label: 'Synced',
            note: 'Sent to PRMS for Science Program QA',
            value: j.sync.synced,
            color: PFM_STATE.done.fill,
            kind: 'synced',
            target: 'journey_synced'
          }
        ],
        action: {
          value: j.sync.ready,
          label: 'Sync the mapped results to PRMS',
          note: 'These results meet both conditions — Approved in STAR and mapping complete. Rejected ones need to be fixed and synced again.',
          cta: 'Open results ready to sync',
          chip: 'ready_to_sync',
          ink: PFM_STATE.ready.fg
        }
      }
    ];
  });

  /** How many stages there are and the last one's index; nothing assumes five. */
  readonly stageCount = computed(() => this.stages().length);
  readonly lastIndex = computed(() => this.stageCount() - 1);

  current = computed(() => {
    const i = Math.max(0, Math.min(this.lastIndex(), this.stage()));
    const stage = this.stages()[i];
    const base = stage.parts.reduce((n, p) => n + p.value, 0);
    return {
      index: i,
      stage,
      parts: stage.parts.map(p => ({ ...p, share: `${base ? Math.round((p.value / base) * 100) : 0}%`, tag: PART_TAG[p.kind] })),
      who: this.who(),
      nextHint: this.nextHint(i)
    };
  });

  private nextHint(i: number): string {
    const fmt = (n: number) => n.toLocaleString('en-US');
    const all = this.stages();
    if (i === 0) {
      return `Next: Approve or reject results — ${fmt(this.reported())} results created by ${fmt(this.journey().projects.with_results)} projects.`;
    }
    if (i < this.lastIndex()) return `Next: ${all[i + 1].title} — ${fmt(all[i + 1].value)} results continue.`;
    return 'Last step. Once PRMS approves them, synced results are complete.';
  }

  select(i: number): void {
    if (i < 0 || i > this.lastIndex()) return;
    this.stageChange.emit(i);
  }

  /** A card leads to exactly its results: a journey view of the queue, or the projects table. */
  openPart(target: PartTarget): void {
    if (target === 'projects_without') this.showProjectsWithoutResults.emit();
    else if (target === 'projects_with') this.showProjectsWithResults.emit();
    else this.openQueue.emit(target);
  }

  act(): void {
    const chip = this.current().stage.action.chip;
    if (chip) this.openQueue.emit(chip);
    else this.showProjectsWithoutResults.emit();
  }
}
