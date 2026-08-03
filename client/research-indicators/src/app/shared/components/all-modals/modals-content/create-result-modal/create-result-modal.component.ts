import { Component, inject } from '@angular/core';

import { CreateResultFormComponent } from './components/create-result-form/create-result-form.component';
import { ResultAiAssistantComponent } from './components/result-ai-assistant/result-ai-assistant.component';
import { CreateOicrFormComponent } from './components/create-oicr-form/create-oicr-form.component';
import { CreateResultManagementService } from './services/create-result-management.service';

@Component({
  selector: 'app-create-result-modal',
  imports: [CreateResultFormComponent, ResultAiAssistantComponent, CreateOicrFormComponent],
  templateUrl: './create-result-modal.component.html'
})
export class CreateResultModalComponent {
  createResultManagementService = inject(CreateResultManagementService);
}
