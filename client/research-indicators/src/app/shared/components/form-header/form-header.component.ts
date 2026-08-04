import { Component, inject, computed } from '@angular/core';
import { VersionSelectorComponent } from '@pages/platform/pages/result/components/version-selector/version-selector.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

@Component({
  selector: 'app-form-header',
  imports: [VersionSelectorComponent, FormatDatePipe],
  templateUrl: './form-header.component.html'
})
export class FormHeaderComponent {
  cache = inject(CacheService);
  dateFormatConfig = inject(DateFormatConfigService);

  sectionTitle = computed(() => {
    const title = this.cache.currentMetadata().result_title || '';
    const words = title.split(' ');

    if (words.length > 30) {
      return words.slice(0, 30).join(' ') + '...';
    }

    if (title.length > 200) {
      return title.slice(0, 200) + '...';
    }

    return title;
  });

  syncedDate = computed(() => this.cache.currentMetadata().updated_at);

  publicLink = computed(() => this.cache.currentMetadata().public_link);

  externalLink = computed(() => this.cache.currentMetadata().external_link);

  /** Same button copy rules as `ResultInformationModalComponent`'s deep-link button. */
  externalLinkLabel = computed(() => {
    const platformCode = this.cache.currentMetadata().platform_code;
    if (platformCode === PLATFORM_CODES.AICCRA) {
      return 'Open result in MARLO';
    }
    if (platformCode === PLATFORM_CODES.PRMS) {
      return 'Open result in PRMS';
    }
    return 'Open link to result';
  });

  /** Same open-in-new-tab behavior as `ResultInformationModalComponent.openDocumentLink()`. */
  openPublicLink(): void {
    const link = this.publicLink();
    if (!link) return;
    globalThis.open(link, '_blank', 'noopener');
  }

  /** Same open-in-new-tab behavior as `ResultInformationModalComponent.openExternalLink()`. */
  openExternalLink(): void {
    const link = this.externalLink();
    if (!link) return;

    const platformCode = this.cache.currentMetadata().platform_code;
    const isSupportedPlatform = platformCode === PLATFORM_CODES.TIP || platformCode === PLATFORM_CODES.AICCRA || platformCode === PLATFORM_CODES.PRMS;
    if (isSupportedPlatform) {
      globalThis.open(link, '_blank', 'noopener');
    }
  }
}
