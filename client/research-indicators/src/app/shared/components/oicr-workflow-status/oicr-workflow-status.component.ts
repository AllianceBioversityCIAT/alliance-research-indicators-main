import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-oicr-workflow-status',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './oicr-workflow-status.component.html',
  styleUrl: './oicr-workflow-status.component.scss'
})
export class OicrWorkflowStatusComponent {
  @Input() currentStatusId: number | string | null = null;
  @Input() statusDescription?: string;
  @Input() iconName?: string;
  @Input() iconColor?: string;

  readonly workflowSteps = [
    { id: 10, name: 'ACCEPTED' },
    { id: 12, name: 'SCIENCE EDITION' },
    { id: 13, name: 'KM CURATION' },
    { id: 14, name: 'PUBLISHED' }
  ];

  currentStatusIdNumber = computed(() => {
    const statusId = this.currentStatusId;
    return statusId ? Number(statusId) : null;
  });

  isCurrentStep(stepId: number): boolean {
    return this.currentStatusIdNumber() === stepId;
  }
}
