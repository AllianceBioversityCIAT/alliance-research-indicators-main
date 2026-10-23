import { Component, inject, Input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CacheService } from '@shared/services/cache/cache.service';
import { OicrDownloadService, OICR_WORD_TEMPLATE_GENERIC_ERROR } from '@shared/services/oicr-download.service';
import { ActionsService } from '@shared/services/actions.service';

@Component({
  selector: 'app-download-oicr-template',
  imports: [ButtonModule, TooltipModule],
  templateUrl: './download-oicr-template.component.html'
})
export class DownloadOicrTemplateComponent {
  @Input() onlyIcon = false;
  oicrDownloadService = inject(OicrDownloadService);
  processing = signal(false);
  cache = inject(CacheService);
  private actions = inject(ActionsService);

  async downloadOicrTemplate() {
    this.processing.set(true);
    try {
      await this.oicrDownloadService.download(this.cache.getCurrentNumericResultId());
    } catch (error) {
      const detail = error instanceof Error && error.message.trim() !== '' ? error.message : OICR_WORD_TEMPLATE_GENERIC_ERROR;
      this.actions.showToast({ severity: 'error', summary: 'Error', detail });
    } finally {
      this.processing.set(false);
    }
  }
}
