import { Component, Pipe, PipeTransform, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectComponent } from '@shared/components/custom-fields/select/select.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ContactPersonFormData } from '@shared/interfaces/contact-person.interface';

@Pipe({
  name: 'properCase',
  standalone: true
})
export class ProperCasePipe implements PipeTransform {
  transform(value?: string | null): string {
    if (!value) return '';
    const lower = String(value).toLowerCase().trim();
    return lower
      .split(/\s+/)
      .map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
      .join(' ');
  }
}

@Component({
  selector: 'app-add-contact-person-modal',
  standalone: true,
  imports: [FormsModule, SelectComponent, ProperCasePipe],
  templateUrl: './add-contact-person-modal.component.html'
})
export class AddContactPersonModalComponent {
  allModalsService = inject(AllModalsService);

  body: WritableSignal<ContactPersonFormData> = signal({
    contact_person_id: null,
    role_id: null
  });

  private wasOpen = false;

  constructor() {
    effect(() => {
      this.allModalsService.setContactPersonModalData(this.body());
    });

    effect(() => {
      const isOpen = this.allModalsService.isModalOpen('addContactPerson').isOpen;
      if (this.wasOpen && !isOpen) {
        this.clearData();
      }
      this.wasOpen = isOpen;
    });
  }

  private clearData(): void {
    this.body.set({
      contact_person_id: null,
      role_id: null
    });
  }

  getBodyData(): ContactPersonFormData {
    return this.body();
  }

  onConfirm() {
    this.allModalsService.addContactPersonConfirm?.(this.getBodyData());
  }

  onCancel() {
    this.allModalsService.toggleModal('addContactPerson');
  }
}
