import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges, effect, inject, signal, WritableSignal } from '@angular/core';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { SubmissionService } from '@shared/services/submission.service';

export interface QuantificationItemData {
  number: number | null;
  unit: string;
  comments: string;
}

@Component({
  selector: 'app-quantification-item',
  standalone: true,
  imports: [InputComponent, TextareaComponent],
  templateUrl: './quantification-item.component.html'
})
export class QuantificationItemComponent implements OnInit, OnChanges {
  @Input() quantification!: QuantificationItemData;
  @Input() index!: number;
  @Input() quantNumber = 1;
  @Input() headerLabel = 'ACTUAL COUNT';
  /** External-result / non-editable-status gate, passed from the parent call site. Defaults to false so this component's own editable-status behavior is unaffected. */
  @Input() disabled = false;
  // @akili-spec docs/specs/changes/innovation-use-required-fields (T-03 — DD-4: fieldsRequired split into five per-field inputs; R-IUR-010, R-IUR-013)
  /** Renders the Number field's asterisk (card-owned, template `@if`) and feeds its `[isRequired]`. Defaults to `true`, reproducing OICR's current required rendering for this field byte-identically (R-IUR-013). */
  @Input() numberRequired = true;
  /** Renders the Unit field's asterisk (card-owned, template `@if`) and feeds its `[isRequired]`. Defaults to `true`, same rationale as `numberRequired`. */
  @Input() unitRequired = true;
  /** Renders the Comments field's asterisk (card-owned, template `@if`) and feeds `app-textarea`'s own `[isRequired]`. `app-textarea` has no `requiredMode` — the field is boolean-only by design (DD-4). Defaults to `true`. */
  @Input() commentsRequired = true;
  /** Forwarded straight through to the Number field's `app-input` `[requiredMode]` (DD-1/DD-2). Defaults to `'off'` — OICR passes nothing and keeps its existing untrimmed falsy `isRequired` behavior for `0` (R-IUR-010 AC.5, R-IUR-013). Innovation Use passes `'nonzero'`: `0` invalid, negatives valid. */
  @Input() numberRequiredMode: 'off' | 'filled' | 'positive' | 'nonzero' = 'off';
  /** Forwarded straight through to the Unit field's `app-input` `[requiredMode]`. Defaults to `'off'`, same byte-identical-OICR rationale as `numberRequiredMode`. Innovation Use passes `'filled'`, which trims whitespace-only strings (§3.3) — `Unit` is free text, not a positivity rule. */
  @Input() unitRequiredMode: 'off' | 'filled' | 'positive' | 'nonzero' = 'off';
  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — DD-4: min/max/placeholder promoted to inputs, defaulting to today's literals)
  /** Forwarded to the Number field's app-input. Defaults to today's literal (`0`, `app-input`'s own default) — additive, so every existing consumer is unaffected. */
  @Input() min = 0;
  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — DD-4/DD-14: max promoted to input, defaulting to today's value)
  /** Forwarded to the Number field's app-input. Defaults to today's value (`Number.MAX_SAFE_INTEGER`, `app-input`'s own default since T-09) — additive, so every existing consumer is unaffected. Innovation Use passes a scale-derived bound (DD-14). */
  @Input() max = Number.MAX_SAFE_INTEGER;
  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — DD-4: placeholder promoted to input, defaulting to today's copy)
  /** Forwarded to the Number field's app-input. Defaults to today's copy — additive, so every existing consumer is unaffected. Innovation Use passes copy without "positive". */
  @Input() placeholder = 'Enter a positive number';
  private _maxFractionDigits = 0;
  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — DD-12: default changed from undefined to 0; R-MSD-012 AC.1: scale-domain guard)
  /**
   * Forwarded to the Number field's app-input. Defaults to `0` — **the one changed default in this
   * spec** (was `undefined`). OICR passes nothing and now receives an explicit `0` rather than
   * PrimeNG's own `undefined` resolution (Intl `maximumFractionDigits` of 3); `U-4` established the
   * direction is safe either way — decimals are already refused when typing under both defaults, and
   * paste/formatting only tightens (3 decimals → 0), never loosens. Scale domain is 0–4 (4 is the
   * `quantification_number` column's scale, DD-14); a value outside that domain is a configuration
   * error surfaced immediately as a thrown error, not silently clamped (R-MSD-012 AC.1).
   *
   * The guard rejects `null`, non-integers (e.g. `2.5`), and `NaN` via `Number.isInteger` before
   * ever reaching the range check — this is load-bearing, not decorative. `null >= 0` and
   * `null <= 4` both evaluate `true` (JS coerces `null` to `0`), so a plain range check lets `null`
   * through; `null` forwarded to `app-input` resolves via `?? undefined` back to PrimeNG's own
   * 3-fraction-digit default, silently undoing the one changed default this task exists to deliver.
   * A non-integer like `2.5` also passes a plain range check, and `Intl`'s `DefaultNumberOption`
   * floors it to `2` rather than rejecting it. `Number.isInteger` rejects all three (`null`, `2.5`,
   * `NaN`) in one call, so it preserves the deliberate `NaN` coverage while closing both holes.
   */
  @Input()
  set maxFractionDigits(value: number) {
    if (!(Number.isInteger(value) && value >= 0 && value <= 4)) {
      throw new Error(
        `QuantificationItemComponent.maxFractionDigits must be within the declared scale domain 0-4 (received ${value}).`
      );
    }
    this._maxFractionDigits = value;
  }
  get maxFractionDigits(): number {
    return this._maxFractionDigits;
  }
  @Output() update = new EventEmitter<QuantificationItemData>();
  @Output() delete = new EventEmitter<void>();

  submission = inject(SubmissionService);

  body: WritableSignal<QuantificationItemData> = signal({ number: null, unit: '', comments: '' });
  private initialized = false;

  valueEffect = effect(() => {
    if (this.initialized) {
      this.update.emit(this.body());
    }
  });

  ngOnInit(): void {
    this.body.set(this.quantification || { number: null, unit: '', comments: '' });
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['quantification'] && this.initialized) {
      const next = this.quantification || { number: null, unit: '', comments: '' };
      if (JSON.stringify(this.body()) !== JSON.stringify(next)) {
        this.body.set(next);
      }
    }
  }

  onValueChange() {
    this.update.emit(this.body());
  }

  onDelete() {
    if (!this.submission.isEditableStatus()) return;
    this.delete.emit();
  }
}


