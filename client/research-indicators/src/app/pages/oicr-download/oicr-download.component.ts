import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OicrDownloadService } from '@shared/services/oicr-download.service';
import { ApiService } from '@shared/services/api.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { resolvePortfolioId } from '@shared/utils/oicr-template-download.util';

/** Shown when metadata fails or the result has no portfolio. The page does not download. */
export const OICR_DOWNLOAD_PAGE_PORTFOLIO_ERROR =
  "This OICR's portfolio could not be resolved, so the template was not downloaded.";

interface OicrDownloadPageResult {
  success: boolean;
  error?: string;
  message?: string;
}

@Component({
  selector: 'app-oicr-download',
  standalone: true,
  templateUrl: './oicr-download.component.html'
})
export default class OicrDownloadComponent implements OnInit {
  oicrDownloadService = inject(OicrDownloadService);
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  processing = signal(false);
  result: OicrDownloadPageResult | null = null;

  private async portfolioFor(resultCode: string | number): Promise<number | null> {
    const response = await this.api.GET_Metadata(resultCode as number).catch(() => null);
    if (response?.data == null) return null;
    return resolvePortfolioId(response.data);
  }

  private getResultCodePath(resultCode: string | number): string {
    if (typeof resultCode === 'string' && resultCode.includes('-')) {
      return resultCode;
    }
    return `${PLATFORM_CODES.STAR}-${resultCode}`;
  }

  async generateAndDownload(resultCode: string | number) {
    this.processing.set(true);
    this.result = null;

    try {
      const portfolioId = await this.portfolioFor(resultCode);
      if (portfolioId == null) {
        this.result = { success: false, error: OICR_DOWNLOAD_PAGE_PORTFOLIO_ERROR };
        return;
      }

      await this.oicrDownloadService.download(resultCode, portfolioId);
      this.result = { success: true };
      const resultPath = this.getResultCodePath(resultCode);
      this.router.navigate(['/result', resultPath, 'general-information']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not download the OICR template. Please try again.';
      this.result = { success: false, error: message };
    } finally {
      this.processing.set(false);
    }
  }

  ngOnInit(): void {
    const pathCode = this.route.snapshot.paramMap.get('resultCode');
    if (pathCode) {
      this.generateAndDownload(pathCode);
      return;
    }

    const queryCode = this.route.snapshot.queryParamMap.get('resultCode');
    if (queryCode) {
      this.router.navigate(['/oicr/download', queryCode], { replaceUrl: true });
      return;
    }

    this.result = {
      success: false,
      error: 'Missing resultCode parameter. Please provide a valid resultCode in the URL.'
    };
  }
}
