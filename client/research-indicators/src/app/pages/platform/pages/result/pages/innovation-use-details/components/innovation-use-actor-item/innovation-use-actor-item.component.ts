// @akili-spec docs/specs/innovation-use/details-page (T-05 — innovation use actor card)
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, effect, inject, signal, WritableSignal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { InnovationUseActor } from '@shared/interfaces/get-innovation-use-details.interface';
import { GetActorTypesService } from '@shared/services/control-list/get-actor-types.service';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';

/**
 * CLARISA actor-type value reserved for "OTHER". A client-side literal, not an import:
 * `ClarisaActorTypesEnum.OTHER = 5` exists only in the server tree
 * (server/researchindicators/src/domain/tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum.ts) —
 * a grep of client/research-indicators/src returns zero matches, and the reference card
 * (innovation-details/components/actor-item) hardcodes the same literal for the same reason
 * (judgment.md -> C-2; requirements.md -> A4).
 */
const OTHER_ACTOR_TYPE_ID = 5;

/**
 * Innovation Use actor card. Pure `@Input`/`@Output` component (DD-5) — never takes a
 * `WritableSignal` of the parent's body and never writes through a parent array key. The
 * parent owns row identity: this card never sets, copies, or clears `result_actors_id`.
 */
@Component({
  selector: 'app-innovation-use-actor-item',
  standalone: true,
  imports: [FormsModule, InputTextModule, CheckboxModule, SelectModule, InputComponent, NgTemplateOutlet],
  templateUrl: './innovation-use-actor-item.component.html'
})
export class InnovationUseActorItemComponent implements OnInit, OnChanges {
  @Input() actor: InnovationUseActor = new InnovationUseActor();
  @Input() actorNumber = 1;
  @Input() disabled = false;
  @Input() duplicateType = false;
  @Output() update = new EventEmitter<InnovationUseActor>();
  @Output() remove = new EventEmitter<void>();

  actorService = inject(GetActorTypesService);
  readonly otherActorTypeId = OTHER_ACTOR_TYPE_ID;

  /**
   * Local copy of the row. Never the parent's signal (DD-5), and never the parent's *object*
   * either — both ingress paths (`ngOnInit`, `ngOnChanges`) shallow-spread `actor` before storing
   * it, so `app-input`'s in-place write (`UtilsService.setNestedPropertyWithReduceSignal` mutates
   * the object before cloning it) lands on this card's own copy, not on the parent's row.
   */
  body: WritableSignal<InnovationUseActor> = signal(new InnovationUseActor());
  private initialized = false;

  /**
   * Derived total (§6.2, transcribed from chunk 2 §5.5): aggregate mode -> `actors_count`;
   * disaggregated -> sum of the four counts, treating null/undefined as absent, and `null`
   * (never `0`) when all four are absent. `0` would tell the user they reported a count of
   * zero when they reported nothing.
   */
  total = computed<number | null>(() => {
    const current = this.body();
    if (current.sex_age_disaggregation_not_apply) {
      return current.actors_count ?? null;
    }
    const counts = [current.women_youth_count, current.women_not_youth_count, current.men_youth_count, current.men_not_youth_count];
    const present = counts.filter((count): count is number => count !== null && count !== undefined);
    if (present.length === 0) return null;
    return present.reduce((sum, count) => sum + count, 0);
  });

  private valueEffect = effect(() => {
    if (this.initialized) {
      this.update.emit(this.body());
    }
  });

  ngOnInit(): void {
    this.body.set({ ...(this.actor ?? new InnovationUseActor()) });
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['actor'] && this.initialized) {
      const next = { ...(this.actor ?? new InnovationUseActor()) };
      if (JSON.stringify(this.body()) !== JSON.stringify(next)) {
        this.body.set(next);
      }
    }
  }

  get actorTypeMissing(): boolean {
    return !this.body().actor_type_id;
  }

  get otherNameMissing(): boolean {
    return this.body().actor_type_id === this.otherActorTypeId && !this.body().actor_type_custom_name;
  }

  /** Selecting away from OTHER clears `actor_type_custom_name` (R-IUP-010 AC.3). */
  onActorTypeChange(actorTypeId: number): void {
    this.body.update(current => ({
      ...current,
      actor_type_id: actorTypeId,
      actor_type_custom_name: actorTypeId === this.otherActorTypeId ? current.actor_type_custom_name : undefined
    }));
  }

  onCustomNameChange(value: string): void {
    this.body.update(current => ({ ...current, actor_type_custom_name: value }));
  }

  /** Toggling the mode clears the fields of the mode being left (R-IUP-007). */
  onModeChange(aggregate: boolean): void {
    this.body.update(current => ({
      ...current,
      sex_age_disaggregation_not_apply: aggregate,
      ...(aggregate
        ? {
            women_youth_count: undefined,
            women_not_youth_count: undefined,
            men_youth_count: undefined,
            men_not_youth_count: undefined
          }
        : { actors_count: undefined })
    }));
  }

  onRemove(): void {
    if (this.disabled) return;
    this.remove.emit();
  }
}
