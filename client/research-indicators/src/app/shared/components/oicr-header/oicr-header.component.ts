import { Component, Input, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DownloadOicrTemplateComponent } from '@shared/components/download-oicr-template/download-oicr-template.component';
import { OicrHeaderData } from '@shared/interfaces/oicr-header-data.interface';
import { CustomTagComponent } from '../custom-tag/custom-tag.component';
import { OicrWorkflowStatusComponent } from '../oicr-workflow-status/oicr-workflow-status.component';

@Component({
  selector: 'app-oicr-header',
  standalone: true,
  templateUrl: './oicr-header.component.html',
  imports: [DatePipe, ButtonModule, DownloadOicrTemplateComponent, CustomTagComponent, OicrWorkflowStatusComponent]
})
export class OicrHeaderComponent {
  @Input() data: OicrHeaderData | null = null;
  @Input() showDownload = false;
  @Input() showTag = false;
  @Input() cgspaceLink: string | null = null;

  readonly intermediateStatusIds = [10, 12, 13, 14];
  readonly publishedStatusId = 14;

  shouldShowWorkflow = computed(() => {
    const statusId = this.data?.status_id;
    if (!statusId) return false;
    const statusIdNum = Number(statusId);
    return this.intermediateStatusIds.includes(statusIdNum);
  });

  isPublished = computed(() => Number(this.data?.status_id) === this.publishedStatusId);

  showDownloadTemplate = computed(() => this.showDownload && !this.isPublished());

  showHandleLinkButton = computed(() => {
    const link = this.cgspaceLink?.trim();
    return this.showDownload && this.isPublished() && !!link;
  });

  cgspacePublicationHref = computed(() => this.cgspaceLink?.trim() ?? '');

  openHandleLink(): void {
    const href = this.cgspacePublicationHref();
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
}


