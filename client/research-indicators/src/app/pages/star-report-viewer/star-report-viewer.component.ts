import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@envs/environment';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { ApiService } from '@shared/services/api.service';
import {
  getStarPdfReportName,
  isStarInnDevPdfTemporarilyDisabled,
  STAR_PDF_COMING_SOON_TOOLTIP
} from '@shared/utils/star-pdf-report.util';

@Component({
  selector: 'app-star-report-viewer',
  imports: [S3ImageUrlPipe],
  templateUrl: './star-report-viewer.component.html'
})
export default class StarReportViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly safePdfUrl = signal<SafeResourceUrl | null>(null);
  readonly isProductionEnvironment = environment.production;

  readonly resultCode = this.route.snapshot.paramMap.get('id') ?? '';
  readonly version = this.route.snapshot.queryParamMap.get('version') ?? '';

  ngOnInit(): void {
    void this.loadPdf();
  }

  private async loadPdf(): Promise<void> {
    const officialCode = this.getOfficialCode(this.resultCode);
    const numericResultId = this.getNumericResultId(this.resultCode);
    if (!officialCode || !numericResultId) {
      this.errorMessage.set('The STAR result code is missing or invalid.');
      this.loading.set(false);
      return;
    }

    try {
      const metadataResponse = await this.api.GET_Metadata(numericResultId, PLATFORM_CODES.STAR);
      if (metadataResponse?.status !== 200 || !metadataResponse?.data) {
        this.errorMessage.set('We could not load the result metadata. Please try again.');
        return;
      }

      const indicatorId = metadataResponse.data.indicator_id;
      if (isStarInnDevPdfTemporarilyDisabled(indicatorId)) {
        this.errorMessage.set(STAR_PDF_COMING_SOON_TOOLTIP);
        return;
      }

      const reportName = getStarPdfReportName(indicatorId);
      if (!reportName) {
        this.errorMessage.set('PDF report is not available for this indicator.');
        return;
      }

      const reportYear = this.version.trim() ? this.version.trim() : null;
      const response = await this.api.GET_ResultPdfReport(officialCode, PLATFORM_CODES.STAR, reportYear, reportName);
      const pdfUrl = response?.data?.trim();
      if (!pdfUrl) {
        this.errorMessage.set('The STAR PDF report is not available yet.');
        return;
      }

      this.safePdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl));
    } catch {
      this.errorMessage.set('We could not generate the STAR PDF report. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private getOfficialCode(resultCode: string): string {
    const normalized = resultCode.trim();
    if (!normalized) return '';
    const [platformCode, officialCode] = normalized.split('-', 2);
    if (platformCode?.toUpperCase() === PLATFORM_CODES.STAR && officialCode) return officialCode;
    return normalized;
  }

  private getNumericResultId(resultCode: string): number | null {
    const normalized = resultCode.trim();
    if (!normalized) return null;

    if (normalized.includes('-')) {
      const parts = normalized.split('-');
      const parsed = Number.parseInt(parts[parts.length - 1], 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
