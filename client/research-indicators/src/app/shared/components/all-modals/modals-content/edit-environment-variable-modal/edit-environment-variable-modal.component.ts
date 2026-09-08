import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ApiService } from '@shared/services/api.service';
import { VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { VariableConfigurationJsonRowComponent } from '@pages/platform/pages/administration/configuration/variable-configuration/components/variable-configuration-json-row/variable-configuration-json-row.component';
import { ClarisaProjectPhaseCount } from '@interfaces/bilateral/bilateral-project-mapping.interface';

// @akili-spec docs/specs/bilateral/clarisa-phase-config-variable — T-03 / R-CPC-004, DD-4
// Client-side key constant selecting the CLARISA phase selector branch in
// the control dispatch below. Deliberately NOT sourced from entity metadata
// (the `field` column, DD-4): with exactly two keys in `AppConfigKey`, a
// metadata-driven registry would be speculative generality for a contract
// nobody has designed yet.
export const CLARISA_PHASE_CONFIG_KEY = 'ARI_CLARISA_PROJECTS_PHASE';

interface PhaseSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-edit-environment-variable-modal',
  standalone: true,
  imports: [InputComponent, TextareaComponent, VariableConfigurationJsonRowComponent, FormsModule, SelectModule],
  templateUrl: './edit-environment-variable-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditEnvironmentVariableModalComponent {
  readonly allModals = inject(AllModalsService);
  readonly roles = inject(RolesService);
  readonly service = inject(VariableConfigurationService);
  private readonly api = inject(ApiService);

  readonly variableNameDisplay = signal({ key: '' });

  // CLARISA phase selector state (R-CPC-003 client half, R-CPC-004, DD-7).
  readonly phaseOptions = signal<ClarisaProjectPhaseCount[]>([]);
  readonly phaseAbsentCount = signal(0);
  readonly phaseOptionsLoading = signal(false);
  readonly phaseOptionsError = signal(false);

  constructor() {
    effect(
      () => {
        const item = this.service.editingItem();
        this.variableNameDisplay.set({ key: item?.key ?? '' });
        if (item?.key === CLARISA_PHASE_CONFIG_KEY) {
          void this.loadPhaseOptions();
        }
      },
      { allowSignalWrites: true }
    );
  }

  isClarisaPhaseKey(key: string): boolean {
    return key === CLARISA_PHASE_CONFIG_KEY;
  }

  /**
   * Options for the phase `p-select`: the derived eligible cohort (DD-7 —
   * labelled with a per-year count) plus the currently configured value,
   * injected when the derived set does not already contain it (R-CPC-003).
   */
  readonly phaseSelectOptions = computed<PhaseSelectOption[]>(() => {
    const options: PhaseSelectOption[] = this.phaseOptions().map(p => ({
      value: String(p.phase),
      label: `${p.phase} (${p.count})`
    }));

    const configuredValue = this.service.editingItem()?.simple_value?.trim();
    if (configuredValue && !options.some(o => o.value === configuredValue)) {
      options.push({ value: configuredValue, label: configuredValue });
    }

    return options;
  });

  /**
   * Empty-state hint text — branches on `phaseAbsentCount` (forward pointer
   * from T-02, `execution.md`). A non-zero absent count means CLARISA IS
   * serving eligible projects, they simply carry no phase, so the honest
   * message is "no phase data upstream" rather than "no projects"
   * (R-CPC-003 scenario 2). `null` while loading/erroring — those states
   * render their own messaging.
   */
  readonly phaseEmptyHint = computed<string | null>(() => {
    if (this.phaseOptionsLoading() || this.phaseOptionsError()) return null;
    if (this.phaseOptions().length > 0) return null;

    return this.phaseAbsentCount() > 0
      ? 'CLARISA publishes no phase data for these projects. The value below is what is configured today — you can still enter a year manually.'
      : 'No eligible CLARISA projects found. You can still enter a year manually.';
  });

  onPhaseValueChange(value: string): void {
    this.service.editForm.update(form => ({ ...form, simple_value: value }));
  }

  onSave(): void {
    void this.service.saveEdit();
  }

  private async loadPhaseOptions(): Promise<void> {
    this.phaseOptionsLoading.set(true);
    this.phaseOptionsError.set(false);
    const res = await this.api.GET_ClarisaProjectPhases();
    if (res?.successfulRequest) {
      this.phaseOptions.set(res.data?.phases ?? []);
      this.phaseAbsentCount.set(res.data?.phaseAbsentCount ?? 0);
    } else {
      // Do NOT swallow the failure into an empty-but-successful-looking
      // state — that is exactly the pattern that made the original defect
      // invisible (root CLAUDE.md §4.3 / bilateral-mapping.service.ts).
      this.phaseOptionsError.set(true);
      this.phaseOptions.set([]);
      this.phaseAbsentCount.set(0);
    }
    this.phaseOptionsLoading.set(false);
  }
}
