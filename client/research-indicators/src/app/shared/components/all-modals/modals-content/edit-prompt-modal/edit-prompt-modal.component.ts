import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { PromptManagerService } from '@shared/services/prompt-manager.service';
import { PromptItem } from '@shared/interfaces/prompt-manager.interface';

@Component({
  selector: 'app-edit-prompt-modal',
  standalone: true,
  imports: [TextareaComponent],
  templateUrl: './edit-prompt-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditPromptModalComponent {
  readonly allModals = inject(AllModalsService);
  readonly service = inject(PromptManagerService);

  sectionKeys(item: PromptItem): string[] {
    return this.service.sectionKeys(item);
  }

  sectionLabel(key: string): string {
    return this.service.sectionLabel(key);
  }

  onSave(): void {
    void this.service.saveEdit();
  }
}
