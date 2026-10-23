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
      await this.oicrDownloadService.download(resultCode);
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
    // Get resultCode from query params
    this.route.queryParams.subscribe(params => {
      const resultCode = params['resultCode'];

      if (!resultCode) {
        this.result = {
          success: false,
          error: 'Missing resultCode parameter. Please provide a valid resultCode in the URL.'
        };
        return;
      }

      // Auto-trigger download when component loads
      this.generateAndDownload(resultCode);
    });
  }
}
