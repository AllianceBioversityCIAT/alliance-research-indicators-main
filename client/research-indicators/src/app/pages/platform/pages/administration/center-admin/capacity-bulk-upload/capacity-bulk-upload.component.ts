import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActionsService } from '@services/actions.service';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { ApiService } from '@shared/services/api.service';
import {
  appendAccessTokenToEmbedUrl,
  getBulkUploadEmbedUrl
} from '@shared/interfaces/bulk-upload-config.interface';

@Component({
  selector: 'app-capacity-bulk-upload',
  standalone: true,
  imports: [],
  templateUrl: './capacity-bulk-upload.component.html'
})
export default class CapacityBulkUploadComponent implements OnInit {
  private readonly actions = inject(ActionsService);
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly missingUrl = signal(false);
  readonly safeEmbedUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit(): void {
    void this.loadEmbed();
  }

  private async loadEmbed(): Promise<void> {
    try {
      const [configRes] = await Promise.all([
        this.api.GET_ConfigurationByKey(APPLICATION_CONFIGURATION_KEY.BULK_UPLOAD_EMBED_URL),
        this.actions.isTokenExpired()
      ]);

      const baseUrl = getBulkUploadEmbedUrl(configRes?.data);
      const token = this.actions.cache.dataCache().access_token?.trim();

      if (!baseUrl) {
        this.missingUrl.set(true);
        return;
      }
      if (!token) {
        this.loadError.set(true);
        return;
      }

      const urlWithToken = appendAccessTokenToEmbedUrl(baseUrl, token);
      this.safeEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(urlWithToken));
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
