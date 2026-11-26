import { Component, computed, effect, input, WritableSignal } from '@angular/core';
import { TextareaModule } from 'primeng/textarea';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { WordCounterComponent } from '@shared/components/custom-fields/word-counter/word-counter.component';
import { PatchOicr } from '@shared/interfaces/oicr-creation.interface';
import { QuantificationItemData } from '@components/quantification-item/quantification-item.component';

export interface Q4SourceChip {
  label: string;
}

/**
 * OICR Details 2026 — Short Outcome/Impact Statement as four questions.
 * "What outcome or impact was achieved?" follows the Actual count narratives until the user
 * types their own text (`outcome_achieved_edited = true`); Restore hands it back to them.
 */
@Component({
  selector: 'app-short-outcome-2026',
  standalone: true,
  imports: [TextareaModule, TextareaComponent, WordCounterComponent],
  templateUrl: './short-outcome-2026.component.html'
})
export class ShortOutcome2026Component {
  readonly wordLimit = 25;
  body = input.required<WritableSignal<PatchOicr>>();
  quantifications = input<QuantificationItemData[]>([]);
  disabled = input(false);

  /** Actual count rows that carry a narrative, in order, with their 1-based position. */
  private readonly narrativeRows = computed(() =>
    this.quantifications()
      .map((q, i) => ({ no: i + 1, unit: (q.unit ?? '').trim(), comment: (q.comments ?? '').trim() }))
      .filter(r => r.comment)
  );

  /** `<unit>: <comment>` one per line (the comment alone when the row has no unit yet). */
  readonly autoText = computed(() => this.narrativeRows().map(r => (r.unit ? `${r.unit}: ${r.comment}` : r.comment)).join('\n'));

  readonly sourceChips = computed<Q4SourceChip[]>(() =>
    this.narrativeRows().map(r => ({ label: `ACTUAL COUNT # ${r.no}${r.unit ? ' · ' + r.unit : ''}` }))
  );

  readonly edited = computed(() => !!this.body()().outcome_achieved_edited);
  readonly q4Value = computed(() => this.body()().outcome_achieved ?? '');
  readonly q4Invalid = computed(() => this.q4Value().trim().length === 0);

  readonly q4Note = computed(() => {
    if (this.edited()) {
      return 'Edited by hand, so it no longer follows the Quantification narratives. Use Restore from Quantification to bring them back.';
    }
    return this.autoText()
      ? 'Prefilled with the narratives from Quantification [Actual count] and kept up to date as you write them. Edit it to write your own.'
      : 'This answer fills in by itself with the narratives you write for each measure in Quantification [Actual count], below.';
  });

  private readonly followQuantification = effect(() => {
    const auto = this.autoText();
    const current = this.body()();
    if (this.disabled() || current.outcome_achieved_edited) return;
    if ((current.outcome_achieved ?? '') === auto) return;
    this.body().update(b => ({ ...b, outcome_achieved: auto }));
  });

  onQ4Input(event: Event) {
    if (this.disabled()) return;
    const value = (event.target as HTMLTextAreaElement).value;
    this.body().update(b => ({ ...b, outcome_achieved: value, outcome_achieved_edited: true }));
  }

  restore() {
    if (this.disabled()) return;
    this.body().update(b => ({ ...b, outcome_achieved: this.autoText(), outcome_achieved_edited: false }));
  }
}
