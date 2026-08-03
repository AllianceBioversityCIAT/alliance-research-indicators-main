import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { VariableConfigurationJsonRowComponent } from '@pages/platform/pages/administration/configuration/variable-configuration/components/variable-configuration-json-row/variable-configuration-json-row.component';

@Component({
  selector: 'app-edit-environment-variable-modal',
  standalone: true,
  imports: [InputComponent, TextareaComponent, VariableConfigurationJsonRowComponent],
  templateUrl: './edit-environment-variable-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditEnvironmentVariableModalComponent {
  readonly allModals = inject(AllModalsService);
  readonly roles = inject(RolesService);
  readonly service = inject(VariableConfigurationService);

  readonly variableNameDisplay = signal({ key: '' });

  constructor() {
    effect(
      () => {
        this.variableNameDisplay.set({ key: this.service.editingItem()?.key ?? '' });
      },
      { allowSignalWrites: true }
    );
  }

  onSave(): void {
    void this.service.saveEdit();
  }
}
