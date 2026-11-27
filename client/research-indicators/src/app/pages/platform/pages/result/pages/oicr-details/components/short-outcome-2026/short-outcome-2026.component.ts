import { Component, computed, effect, input, WritableSignal } from '@angular/core';
import { TextareaModule } from 'primeng/textarea';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { WordCounterComponent } from '@shared/components/custom-fields/word-counter/word-counter.component';
import { PatchOicr } from '@shared/interfaces/oicr-creation.interface';
import { QuantificationUnitCategory } from '@shared/interfaces/oicr-catalogs.interface';
import { OTHER_UNIT_MACRO, PERCENT_TEXT_PATTERN, QuantificationItemData } from '@components/quantification-item/quantification-item.component';

export interface Q4SourceChip {
  label: string;
}

/**
 * The measure part of one Actual count row: number, then unit and category.
 * `20 Individuals (Community Members)`, `45% Adoption Rate`, `15 hectares restored` (macro Other).
 */
export const describeMeasure = (q: QuantificationItemData, categories: QuantificationUnitCategory[] = []): string => {
  const unit = (q.unit ?? '').trim();
  const macro = (q.unit_macro_category ?? '').trim();
  const isOther = macro === OTHER_UNIT_MACRO;
  const percentCategory = categories.some(c => c.macro_category === macro && c.name === unit && c.is_percentage);
  const isPercentage = !!unit && (isOther ? PERCENT_TEXT_PATTERN.test(unit) : percentCategory);

  const hasNumber = q.number !== null && q.number !== undefined && `${q.number}` !== '';
  const suffix = isPercentage ? '%' : '';
  const amount = hasNumber ? `${Number(q.number).toLocaleString('en-US')}${suffix}` : '';

  let unitText = unit;
  if (unit && macro && !isOther && !isPercentage) unitText = `${macro} (${unit})`;
  else if (!unit && macro && !isOther) unitText = macro;

  return [amount, unitText].filter(Boolean).join(' ');
};

/**
 * OICR Details 2026 — Short Outcome/Impact Statement as four questions.
 * "What outcome or impact was achieved?" is read-only: it is written from the Actual count rows,
 * one line per measure (`<number> <unit> (<category>): <narrative>`), and always follows them.
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
  /** Unit category catalog, to tell percentage categories apart. */
  unitCategories = input<QuantificationUnitCategory[]>([]);
  disabled = input(false);

  /** Actual count rows with anything filled in, in order, with their 1-based position. */
  private readonly measureRows = computed(() =>
    this.quantifications()
      .map((q, i) => ({
        no: i + 1,
        unit: (q.unit ?? '').trim(),
        measure: describeMeasure(q, this.unitCategories()),
        comment: (q.comments ?? '').trim()
      }))
      .filter(r => r.measure || r.comment)
  );

  /** One line per measure: `<number> <unit> (<category>): <narrative>`. */
  readonly autoText = computed(() =>
    this.measureRows()
      .map(r => (r.measure && r.comment ? `${r.measure}: ${r.comment}` : r.measure || r.comment))
      .join('\n')
  );

  readonly sourceChips = computed<Q4SourceChip[]>(() =>
    this.measureRows().map(r => ({ label: `ACTUAL COUNT # ${r.no}${r.unit ? ' · ' + r.unit : ''}` }))
  );

  readonly q4Value = computed(() => this.body()().outcome_achieved ?? '');
  readonly q4Invalid = computed(() => this.q4Value().trim().length === 0);

  readonly q4Note = computed(() =>
    this.autoText()
      ? 'Written from Quantification [Actual count]: the number, unit, category and narrative of each measure. To change it, edit those measures below.'
      : 'This answer fills in by itself with each measure you report in Quantification [Actual count], below: its number, unit, category and narrative.'
  );

  /** Q4 always follows the Actual count rows; a hand-edited answer saved earlier is replaced too. */
  private readonly followQuantification = effect(() => {
    const auto = this.autoText();
    const current = this.body()();
    if (this.disabled()) return;
    if ((current.outcome_achieved ?? '') === auto && !current.outcome_achieved_edited) return;
    this.body().update(b => ({ ...b, outcome_achieved: auto, outcome_achieved_edited: false }));
  });
}
