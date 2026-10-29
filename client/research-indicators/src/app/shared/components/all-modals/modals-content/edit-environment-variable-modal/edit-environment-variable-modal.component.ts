import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { VariableConfigurationJsonRowComponent } from '@pages/platform/pages/administration/configuration/variable-configuration/components/variable-configuration-json-row/variable-configuration-json-row.component';

// @akili-spec docs/specs/bilateral/pool-funding-feature-toggles — T-06 / R-PFT-005, D-6
// Client-side keys selecting the boolean toggle branch. The control's two
// positions write exactly 'true' and 'false'; the fail-open parser disables
// the feature only on the exact string 'false'.
export const POOL_FUNDING_FLAG_KEYS = [
  APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_SECTION_ENABLED,
  APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED
] as const;

@Component({
  selector: 'app-edit-environment-variable-modal',
  standalone: true,
  imports: [InputComponent, TextareaComponent, VariableConfigurationJsonRowComponent, FormsModule, ToggleSwitchModule],
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
        const item = this.service.editingItem();
        this.variableNameDisplay.set({ key: item?.key ?? '' });
      },
      { allowSignalWrites: true }
    );
  }

  isPoolFundingFlagKey(key: string): boolean {
    return (POOL_FUNDING_FLAG_KEYS as readonly string[]).includes(key);
  }

  onPoolFundingFlagChange(value: string): void {
    const simple_value = value === 'false' ? 'false' : 'true';
    this.service.editForm.update(form => ({ ...form, simple_value }));
  }

  onSave(): void {
    void this.service.saveEdit();
  }
}
