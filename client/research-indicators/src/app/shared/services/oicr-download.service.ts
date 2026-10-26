// @akili-spec results/oicr-word-template-2026
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { downloadBlob } from '@shared/utils/download-blob.util';
import { OicrLegacyDownloadService } from './oicr-legacy-download.service';

/** Shown when the error body is missing, empty, or not the JSON envelope. */
export const OICR_WORD_TEMPLATE_GENERIC_ERROR = 'Could not download the OICR template. Please try again.';

/** Shown when the portfolio is neither 1 (legacy) nor 2 (server). */
export const OICR_WORD_TEMPLATE_UNKNOWN_PORTFOLIO_ERROR = 'This OICR does not have a Word template download for its portfolio.';

/** Shown when the Portfolio 1 (2025) path throws instead of returning `{ success: false }`. */
export const OICR_LEGACY_DOWNLOAD_ERROR = 'Could not download the 2025 OICR template. Please try again.';

@Injectable({
  providedIn: 'root'
})
export class OicrDownloadService {
  private api = inject(ApiService);
  private legacy = inject(OicrLegacyDownloadService);

  async download(code: string | number, portfolioId: number | null | undefined): Promise<void> {
    if (portfolioId === 1) {
      let result: Awaited<ReturnType<OicrLegacyDownloadService['generateAndDownload']>>;
      try {
        result = await this.legacy.generateAndDownload(code);
      } catch {
        throw new Error(OICR_LEGACY_DOWNLOAD_ERROR);
      }
      if (!result.success) {
        throw new Error(result.error);
      }
      return;
    }

    if (portfolioId === 2) {
      try {
        const blob = await this.api.GET_OicrWordTemplate(code);
        downloadBlob(blob, oicrWordTemplateFileName(code, new Date()));
      } catch (error) {
        throw new Error(await oicrWordTemplateErrorMessage(error));
      }
      return;
    }

    throw new Error(OICR_WORD_TEMPLATE_UNKNOWN_PORTFOLIO_ERROR);
  }
}

/** `STAR_OICR_<code>_<yyyyMMdd>_<HHmm>.docx` in local time. */
function oicrWordTemplateFileName(code: string | number, now: Date): string {
  const dateTimeString =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    '_' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
  return `STAR_OICR_${code}_${dateTimeString}.docx`;
}

/**
 * `errors`, then `description`, then the generic text.
 * Reads the body with FileReader so the JSON branch works when `Blob.text()` is missing.
 */
export async function oicrWordTemplateErrorMessage(error: unknown): Promise<string> {
  try {
    const body = error instanceof HttpErrorResponse ? error.error : undefined;
    if (!(body instanceof Blob)) {
      return OICR_WORD_TEMPLATE_GENERIC_ERROR;
    }
    return messageFromEnvelopeText(await readBlobText(body));
  } catch {
    return OICR_WORD_TEMPLATE_GENERIC_ERROR;
  }
}

function messageFromEnvelopeText(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return OICR_WORD_TEMPLATE_GENERIC_ERROR;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return OICR_WORD_TEMPLATE_GENERIC_ERROR;
  }
  const body = parsed as { errors?: unknown; description?: unknown };
  const fromErrors = readableText(body.errors);
  if (fromErrors) {
    return fromErrors;
  }
  const fromDescription = readableText(body.description);
  if (fromDescription) {
    return fromDescription;
  }
  return OICR_WORD_TEMPLATE_GENERIC_ERROR;
}

function readableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the error body'));
    reader.readAsText(blob);
  });
}
