import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { Result } from '@shared/interfaces/result/result.interface';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

@Component({
  selector: 'app-result-information-modal',
  imports: [CommonModule, ButtonModule, TooltipModule, S3ImageUrlPipe, CustomTagComponent],
  templateUrl: './result-information-modal.component.html'
})
export class ResultInformationModalComponent {
  readonly externalSystemRedirectTooltip = 'You will be redirected to the Information System where this information was captured.';
  readonly publicLinkTooltip =
    'You will be redirected to the public source where the full result metadata is available.';
  allModals = inject(AllModalsService);

  result = computed(() => this.allModals.selectedResultForInfo());

  close = () => this.allModals.closeModal('resultInformation');

  getPlatformColors(platformCode: string): { text: string; background: string } | undefined {
    return PLATFORM_COLOR_MAP[platformCode];
  }
  formatResultCode(code: string | number | null | undefined): string {
    if (code === null || code === undefined) return '';
    const str = String(code);
    if (!str) return '';
    return str.padStart(3, '0');
  }
  getValue(result?: Result): string {
    const r = result ?? this.result();
    if (!r) return '-';
    const levers = (r.result_levers as { is_primary: number | string; lever?: { short_name?: string } }[] | undefined) ?? [];
    if (!Array.isArray(levers) || levers.length === 0) return '-';
    const primaryLever = levers.find(l => Number(l.is_primary) === 1);
    if (!primaryLever) return '-';
    return primaryLever.lever?.short_name ?? '-';
  }

  getPrimaryContract(): string | null {
    const r = this.result();
    if (!r?.result_contracts) return null;

    const contracts = Array.isArray(r.result_contracts) ? r.result_contracts : [r.result_contracts];
    const primaryContract = contracts.find((contract: { is_primary?: number | string; contract_id?: string }) => Number(contract.is_primary) === 1);

    return primaryContract?.contract_id ?? null;
  }

  getContributingContracts(): string[] {
    const r = this.result();
    if (!r?.result_contracts) return [];

    const contracts = Array.isArray(r.result_contracts) ? r.result_contracts : [r.result_contracts];
    const contributing = contracts
      .filter((contract: { is_primary?: number | string; contract_id?: string }) => Number(contract.is_primary) !== 1 && contract.contract_id)
      .map((contract: { contract_id: string }) => contract.contract_id);

    return contributing;
  }

  getContributingProjects(): (string | number)[] {
    const contracts = this.getContributingContracts();
    const snapshotYears = this.result()?.snapshot_years ?? [];
    return [...contracts, ...snapshotYears];
  }

  openExternalLink(): void {
    const currentResult = this.result();
    const link = currentResult?.external_link;
    if (!currentResult || !link) return;

    const isSupportedPlatform =
      currentResult.platform_code === PLATFORM_CODES.TIP ||
      currentResult.platform_code === PLATFORM_CODES.AICCRA ||
      currentResult.platform_code === PLATFORM_CODES.PRMS;
    if (isSupportedPlatform) {
      globalThis.open(link, '_blank', 'noopener');
    }
  }

  openDocumentLink(): void {
    const currentResult = this.result();
    const link = currentResult?.public_link;
    if (!currentResult || !link) return;
    globalThis.open(link, '_blank', 'noopener');
  }
}
