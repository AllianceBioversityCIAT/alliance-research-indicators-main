import { CommonModule } from '@angular/common';
import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { GetOsResultService } from '../../../../shared/services/opensearch/get-os-result.service';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { getIndicatorTypeIcon } from '@shared/constants/result-ai.constants';
import { GetOsResult } from '@shared/interfaces/get-os-result.interface';
import { Router } from '@angular/router';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-search-a-result',
  imports: [CommonModule, ButtonModule, PaginatorModule, TooltipModule, CustomProgressBarComponent, S3ImageUrlPipe],
  templateUrl: './search-a-result.component.html',
  styleUrl: './search-a-result.component.scss'
})
export default class SearchAResultComponent {
  api = inject(ApiService);
  serviceLocator = inject(ServiceLocatorService);
  getOsResultService = inject(GetOsResultService);
  first = signal(0);
  rows = signal(5);

  cache = inject(CacheService);

  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  onPageChange(event: PaginatorState) {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 5);
  }

  getIndicatorTypeIcon(type: string) {
    return getIndicatorTypeIcon(type);
  }
  openResult(item: GetOsResult) {
    const resultCode = `${item.platform_code}-${item.result_official_code}`;
    this.router.navigate([`/result/${resultCode}/general-information`]);
  }
}
