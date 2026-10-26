import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OicrDownloadService } from '@shared/services/oicr-download.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

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
  route = inject(ActivatedRoute);
  router = inject(Router);

  processing = signal(false);
  result: OicrDownloadPageResult | null = null;

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
      // T-10: resolve the portfolio from metadata and pass it here. Until then this page keeps the server path.
      await this.oicrDownloadService.download(resultCode, 2);
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
