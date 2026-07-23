import { Component, effect, EventEmitter, inject, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { CheckboxChangeEvent, CheckboxModule } from 'primeng/checkbox';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SubmissionService } from '@shared/services/submission.service';
import { TextareaModule } from 'primeng/textarea';
import { GetInnovationDetails, InstitutionType } from '@shared/interfaces/get-innovation-details.interface';
import { NgTemplateOutlet } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { GetInstitutionTypesService } from '@shared/services/control-list/get-institution-types.service';
import { GetClarisaInstitutionsSubTypesService } from '@shared/services/get-clarisa-institutions-subtypes.service';
import { InputTextModule } from 'primeng/inputtext';
import { PartnerSelectedItemComponent } from '@shared/components/partner-selected-item/partner-selected-item.component';
import { GetInstitutionsService } from '@shared/services/control-list/get-institutions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';

@Component({
  selector: 'app-organization-item',
  imports: [
    CheckboxModule,
    FormsModule,
    InputTextModule,
    PartnerSelectedItemComponent,
    TextareaModule,
    NgTemplateOutlet,
    ReactiveFormsModule,
    SelectModule
  ],
  templateUrl: './organization-item.component.html'
})
export class OrganizationItemComponent implements OnInit {
  @Output() deleteOrganizationEvent = new EventEmitter();
  @Input() organization: InstitutionType = new InstitutionType();
  @Input() index: number | null = null;
  @Input() organizationNumber: number | null = null;
  @Input() bodySignal: WritableSignal<GetInnovationDetails> = signal(new GetInnovationDetails());
  body = signal<InstitutionType>(new InstitutionType());
  submission = inject(SubmissionService);
  isPrivate = false;
  private updateTimeout: ReturnType<typeof setTimeout> | undefined;
  institutionsService = inject(GetInstitutionsService);
  institutionService = inject(GetInstitutionTypesService);
  subTypesService = inject(GetClarisaInstitutionsSubTypesService);
  showSubTypeSelect = signal(false);
  allModalsService = inject(AllModalsService);

  syncBodyFromParent(): void {
    if (this.index === null) return;
    const parentOrganization = this.bodySignal().institution_types?.[this.index];
    const currentTypeId = this.body().institution_type_id;
    const parentTypeId = parentOrganization?.institution_type_id;
    const parentInstitutionId = parentOrganization?.institution_id;
    const currentInstitutionId = this.body().institution_id;

    if (parentInstitutionId !== currentInstitutionId) {
      this.body.set({ ...this.body(), institution_id: parentInstitutionId });
    }

    if (parentTypeId !== currentTypeId && parentOrganization) {
      this.body.set(parentOrganization);
      this.initializeSubTypes(parentOrganization);
    } else if (parentOrganization && JSON.stringify(parentOrganization) !== JSON.stringify(this.body())) {
      const currentIsKnown = this.body().is_organization_known;
      this.body.set({ ...parentOrganization, is_organization_known: currentIsKnown });
    }
  }

  syncBody = effect(() => this.syncBodyFromParent());

  onChange = effect(
    () => {
      if (this.index === null) return;

      this.bodySignal.update((body: GetInnovationDetails) => {
        if (!body.institution_types) {
          body.institution_types = [];
        }

        // Ensure array has enough elements
        while (body.institution_types.length <= this.index!) {
          body.institution_types.push(new InstitutionType());
        }

        return { ...body };
      });
    },
    { allowSignalWrites: true }
  );

  ngOnInit() {
    this.body.set(this.organization);
    this.initializeSubTypes(this.organization).catch(error => {
      console.error('Error initializing subtypes:', error);
    });
  }

  private async initializeSubTypes(organization: InstitutionType) {
    if (organization.institution_type_id) {
      await this.subTypesService.getSubTypes(2, organization.institution_type_id);
      const hasSubTypes = this.subTypesService.list(organization.institution_type_id).length > 0;
      this.showSubTypeSelect.set(hasSubTypes);

      if (hasSubTypes && organization.sub_institution_type_id) {
        this.body.update(body => ({
          ...body,
          sub_institution_type_id: organization.sub_institution_type_id
        }));
      } else if (!hasSubTypes) {
        this.body.update(body => ({
          ...body,
          sub_institution_type_id: undefined
        }));
      }
    } else {
      this.showSubTypeSelect.set(false);
    }
  }

  deleteOrganization() {
    this.deleteOrganizationEvent.emit();
  }

  isFieldInvalid(): boolean {
    const institution_type_custom_name = this.body().institution_type_custom_name;
    return !institution_type_custom_name || institution_type_custom_name.trim() === '';
  }

  setSectionAndOpenModal(section: string) {
    this.allModalsService.setPartnerRequestSection(section);
    this.allModalsService.openModal('requestPartner');
  }

  setValue(value: string) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    const lowerCaseValue = value;
    this.updateTimeout = setTimeout(() => {
      if (this.body().institution_type_custom_name !== lowerCaseValue) {
        this.body.set({
          ...this.body(),
          institution_type_custom_name: lowerCaseValue
        });

        if (this.index !== null) {
          this.bodySignal.update(current => {
            const updatedInstitutions = [...(current.institution_types || [])];
            updatedInstitutions[this.index!] = this.body();
            return { ...current, institution_types: updatedInstitutions };
          });
        }
      }
    }, 300);
  }

  get organizationMissing(): boolean {
    return !this.body()?.institution_type_id;
  }
  get subTypeMissing(): boolean {
    return !this.body()?.sub_institution_type_id;
  }

  async onInstitutionTypeChange(event: number) {
    const updatedInstitution = {
      ...this.body(),
      institution_type_id: event,
      sub_institution_type_id: undefined
    };

    if (event === 78) {
      updatedInstitution.institution_type_custom_name = this.body().institution_type_custom_name;
    } else {
      updatedInstitution.institution_type_custom_name = undefined;
    }

    this.body.set(updatedInstitution);

    if (this.index !== null) {
      this.bodySignal.update(current => {
        const updatedInstitutions = [...(current.institution_types || [])];
        updatedInstitutions[this.index!] = updatedInstitution;
        return { ...current, institution_types: updatedInstitutions };
      });
    }

    if (event === 78) {
      this.showSubTypeSelect.set(false);
    } else {
      await this.initializeSubTypes({ ...this.body(), institution_type_id: event });
    }
  }

  getSelectedInstitution() {
    return this.institutionsService?.list()?.find(institution => institution.institution_id === this.body()?.institution_id);
  }

  filteredInstitutions() {
    return this.institutionsService?.list() || [];
  }

  onInstitutionChange(institutionId: number) {
    this.body.update(current => ({
      ...current,
      institution_id: institutionId
    }));

    if (this.index !== null) {
      this.bodySignal.update(current => {
        const updatedInstitutions = [...(current.institution_types || [])];
        updatedInstitutions[this.index!] = this.body();
        return { ...current, institution_types: updatedInstitutions };
      });
    }
  }
  onCheckboxChange(event: CheckboxChangeEvent) {
    this.body.update(current => ({
      ...current,
      is_organization_known: event.checked
    }));

    if (this.index !== null) {
      this.bodySignal.update(current => {
        const updatedInstitutions = [...(current.institution_types || [])];
        updatedInstitutions[this.index!] = this.body();
        return { ...current, institution_types: updatedInstitutions };
      });
    }
  }

  get institutionMissing(): boolean {
    return !this.body()?.institution_id;
  }
}
