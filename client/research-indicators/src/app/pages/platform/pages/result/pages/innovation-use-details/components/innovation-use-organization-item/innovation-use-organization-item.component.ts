// @akili-spec docs/specs/innovation-use/details-page (T-06 — innovation use organization card)
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  effect,
  inject,
  signal,
  WritableSignal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { InnovationUseOrganization } from '@shared/interfaces/get-innovation-use-details.interface';
import { GetInstitutionsService } from '@shared/services/control-list/get-institutions.service';
import { GetInstitutionTypesService } from '@shared/services/control-list/get-institution-types.service';
import { GetClarisaInstitutionsSubTypesService } from '@shared/services/get-clarisa-institutions-subtypes.service';
import { ClarisaInstitutionsSubTypes } from '@shared/interfaces/get-clarisa-institutions-subtypes.interface';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { PartnerSelectedItemComponent } from '@shared/components/partner-selected-item/partner-selected-item.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';

/**
 * CLARISA institution-type value reserved for "OTHER" (requirements A5). A client-side literal,
 * not an import: no client-side enum exists for this value, and the reference card
 * (innovation-details/components/organization-item, line 92/173/189) hardcodes the same literal
 * for the same reason.
 */
const OTHER_INSTITUTION_TYPE_ID = 78;

/**
 * Innovation Use organization card. Pure `@Input`/`@Output` component (DD-5) — never takes a
 * `WritableSignal` of the parent's body and never writes through a parent array key. The parent
 * owns row identity: this card never sets, copies, or clears `result_institution_type_id`.
 */
@Component({
  selector: 'app-innovation-use-organization-item',
  standalone: true,
  imports: [FormsModule, InputTextModule, CheckboxModule, SelectModule, InputComponent, PartnerSelectedItemComponent, NgTemplateOutlet],
  templateUrl: './innovation-use-organization-item.component.html'
})
export class InnovationUseOrganizationItemComponent implements OnInit, OnChanges {
  @Input() organization: InnovationUseOrganization = new InnovationUseOrganization();
  @Input() organizationNumber = 1;
  @Input() disabled = false;
  @Output() update = new EventEmitter<InnovationUseOrganization>();
  @Output() remove = new EventEmitter<void>();

  institutionsService = inject(GetInstitutionsService);
  institutionTypesService = inject(GetInstitutionTypesService);
  subTypesService = inject(GetClarisaInstitutionsSubTypesService);
  allModalsService = inject(AllModalsService);
  readonly otherInstitutionTypeId = OTHER_INSTITUTION_TYPE_ID;

  /**
   * Local copy of the row. Never the parent's signal (DD-5), and never the parent's *object*
   * either — both ingress paths (`ngOnInit`, `ngOnChanges`) shallow-spread `organization` before
   * storing it, so `app-input`'s in-place write lands on this card's own copy, not on the
   * parent's row.
   */
  body: WritableSignal<InnovationUseOrganization> = signal(new InnovationUseOrganization());
  private initialized = false;
  /**
   * Signal, not a plain field (REWORK/Lens A): a plain field's staleness is invisible to
   * `touched` unless every write path happens to sit next to a `body.set`. Making it a signal
   * turns that dependency into a real one, so a future ingress path that forgets to refresh it
   * fails loudly (a stale `touched()`) rather than silently.
   */
  private initialSnapshot = signal('');

  /**
   * `GetClarisaInstitutionsSubTypesService.list()` is not a signal — it reads a plain Map
   * populated by the async `getSubTypes()` call. This card mirrors that result into its own
   * signal so the sub-type control's presence (c2) is reactive to the resolved rows.
   */
  subTypeOptions: WritableSignal<ClarisaInstitutionsSubTypes[]> = signal([]);

  /** True once the row has diverged from the value it was given (R-IUP-012 AC.5 / c5). */
  touched = computed<boolean>(() => JSON.stringify(this.body()) !== this.initialSnapshot());

  selectedInstitution = computed(() => this.institutionsService.list().find(institution => institution.institution_id === this.body().institution_id));

  private valueEffect = effect(() => {
    if (this.initialized) {
      this.update.emit(this.body());
    }
  });

  ngOnInit(): void {
    const initial = { ...(this.organization ?? new InnovationUseOrganization()) };
    this.body.set(initial);
    this.initialSnapshot.set(JSON.stringify(initial));
    this.initialized = true;

    this.syncSubTypes(initial);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organization'] && this.initialized) {
      const next = { ...(this.organization ?? new InnovationUseOrganization()) };
      if (JSON.stringify(this.body()) !== JSON.stringify(next)) {
        this.body.set(next);
        this.initialSnapshot.set(JSON.stringify(next));
        this.syncSubTypes(next);
      }
    }
  }

  /**
   * Bootstraps/refreshes the sub-type option list for a row (REWORK/Lens A). `ngOnInit` and the
   * `body.set` branch of `ngOnChanges` are both parent-driven ingress paths for the same row
   * shape and must render the same sub-type control for the same data — this is the single place
   * that decides it.
   */
  private syncSubTypes(row: InnovationUseOrganization): void {
    if (!row.is_organization_known && row.institution_type_id) {
      void this.loadSubTypes(row.institution_type_id);
    } else {
      this.subTypeOptions.set([]);
    }
  }

  /** Neither path clears the other's fields — mirrors the reference card's own rule (§5.5). */
  onKnownToggle(known: boolean | undefined): void {
    this.body.update(current => ({ ...current, is_organization_known: !!known }));
  }

  onInstitutionChange(institutionId: number): void {
    this.body.update(current => ({ ...current, institution_id: institutionId }));
  }

  /** Changing type resets the sub-type and, leaving OTHER, clears the custom name (mirrors §5.5). */
  async onInstitutionTypeChange(typeId: number): Promise<void> {
    this.body.update(current => ({
      ...current,
      institution_type_id: typeId,
      sub_institution_type_id: undefined,
      institution_type_custom_name: typeId === this.otherInstitutionTypeId ? current.institution_type_custom_name : undefined
    }));
    await this.loadSubTypes(typeId);
  }

  onSubTypeChange(subTypeId: number): void {
    this.body.update(current => ({ ...current, sub_institution_type_id: subTypeId }));
  }

  onCustomNameChange(value: string): void {
    this.body.update(current => ({ ...current, institution_type_custom_name: value }));
  }

  onRequestPartner(): void {
    if (this.disabled) return;
    this.allModalsService.openModal('requestPartner');
  }

  onRemove(): void {
    if (this.disabled) return;
    this.remove.emit();
  }

  /** c2 — the sub-type control appears only when the CLARISA service resolves rows for the type. */
  private async loadSubTypes(typeId: number | undefined): Promise<void> {
    if (!typeId) {
      this.subTypeOptions.set([]);
      return;
    }
    await this.subTypesService.getSubTypes(2, typeId);
    // Guard against out-of-order resolution (REWORK/Lens A): if the row's type changed again
    // while this call was in flight, the losing type's rows must not land.
    if (this.body().institution_type_id !== typeId) return;
    this.subTypeOptions.set(this.subTypesService.list(typeId));
  }

  get identitySatisfied(): boolean {
    const current = this.body();
    return current.is_organization_known ? !!current.institution_id : !!current.institution_type_id;
  }

  get showNotIdentifiedMessage(): boolean {
    return this.touched() && !this.identitySatisfied;
  }
}
