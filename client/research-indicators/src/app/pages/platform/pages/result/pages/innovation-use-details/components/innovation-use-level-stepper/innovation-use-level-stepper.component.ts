// @akili-spec docs/specs/innovation-use/details-page (T-04 — innovation use level stepper)
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { InnovationUseLevel } from '@shared/interfaces/get-innovation-use-levels.interface';

/**
 * Renders the 0–9 innovation-use level stepper plus its definition callout.
 *
 * TRAP (family D-1 / R-IUP-005): the catalog's `id` is never the scale point.
 * The button LABEL is the row's `level`; the EMITTED value is the row's `id`.
 * Selection is resolved by matching `selectedLevelId` to a row's `id`, then
 * comparing that row's `level` — never by `name` (five names each cover two
 * adjacent levels, so a name lookup is ambiguous).
 */
@Component({
  selector: 'app-innovation-use-level-stepper',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './innovation-use-level-stepper.component.html'
})
export class InnovationUseLevelStepperComponent {
  @Input() levels: InnovationUseLevel[] = [];
  @Input() selectedLevelId?: number;
  @Input() disabled = false;
  @Output() levelSelected = new EventEmitter<number>();

  /** The catalog row matching `selectedLevelId`, resolved by `id` — never by `name`. */
  get selectedLevel(): InnovationUseLevel | undefined {
    return this.levels.find(candidate => candidate.id === this.selectedLevelId);
  }

  /** Highlight state for one button, resolved by comparing `level`, not `id` (the trap). */
  isSelected(level: InnovationUseLevel): boolean {
    return this.selectedLevel?.level === level.level;
  }

  /** Emits the row's `id` — never its `level` — on selection. */
  selectLevel(level: InnovationUseLevel): void {
    if (this.disabled || level.id === undefined) return;
    this.levelSelected.emit(level.id);
  }

  tooltip(level: InnovationUseLevel): string {
    return `<strong>${level.name}</strong> - ${level.definition}`;
  }

  ariaLabel(level: InnovationUseLevel): string {
    return `Innovation use level ${level.level}`;
  }
}
