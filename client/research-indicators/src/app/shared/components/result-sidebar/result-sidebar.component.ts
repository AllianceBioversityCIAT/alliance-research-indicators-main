import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CacheService } from '../../services/cache/cache.service';
import { GreenChecks } from '../../interfaces/get-green-checks.interface';
import { CommonModule } from '@angular/common';
import { ActionsService } from '@shared/services/actions.service';
import { TooltipModule } from 'primeng/tooltip';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ApiService } from '../../services/api.service';
import { GetMetadataService } from '../../services/get-metadata.service';
import { SubmissionService } from '../../services/submission.service';
import { CustomTagComponent } from '../custom-tag/custom-tag.component';
import { StatusDropdownComponent } from '../status-dropdown/status-dropdown.component';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { RolesService } from '@shared/services/cache/roles.service';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { CurrentResultService } from '@shared/services/cache/current-result.service';
import { BilateralService } from '@shared/services/bilateral.service';
import { PoolFundingFlagsService } from '@shared/services/pool-funding-flags.service';
import { AlignmentResponse } from '@interfaces/bilateral/pool-funding-alignment.interface';
import {
  isHomeEntryFromUrl,
  isResultsCenterEntryFromUrl,
  RESULT_ENTRY_SOURCE_QUERY,
  RESULT_ENTRY_SOURCE_VALUE_HOME,
  RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER
} from '@shared/constants/result-entry-source';

interface SubmissionAlertData {
  severity: 'success' | 'warning';
  summary: string;
  detail: string;
  placeholder: string;
}
interface SidebarOption {
  label: string;
  path: string;
  indicator_id?: number;
  disabled?: boolean;
  underConstruction?: boolean;
  hide?: boolean;
  greenCheckKey: string;
  greenCheck?: boolean;
  /** Optional sections render under a divider and don't count toward completion or gate submission (AR.3). */
  optional?: boolean;
}

@Component({
  selector: 'app-result-sidebar',
  imports: [CustomTagComponent, StatusDropdownComponent, RouterLink, RouterLinkActive, ButtonModule, CommonModule, TooltipModule, S3ImageUrlPipe],
  templateUrl: './result-sidebar.component.html',
  styleUrl: './result-sidebar.component.scss'
})
export class ResultSidebarComponent {
  cache = inject(CacheService);
  actions = inject(ActionsService);
  allModalsService = inject(AllModalsService);
  api = inject(ApiService);
  metadata = inject(GetMetadataService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  submissionService = inject(SubmissionService);
  roles = inject(RolesService);
  currentResultService = inject(CurrentResultService);
  bilateralService = inject(BilateralService);
  poolFundingFlags = inject(PoolFundingFlagsService);
  private readonly publishedOicrStatusId = 14;

  allOptionsWithGreenChecks = computed(() => {
    const alignment = this.bilateralService.currentAlignment();
    return this.allOptions()
      .filter(
        option =>
          (option?.indicator_id === this.cache.currentMetadata()?.indicator_id || !option?.indicator_id) &&
          !this.shouldHidePoolFundingTab(option, alignment)
      )
      .map(option => ({
        ...option,
        // `?? {}` as well as the guard in updateGreenChecks: this computed feeds
        // the section list, the counter and the submit gate, so a single bad
        // write must not be able to blank the sidebar.
        greenCheck: Boolean((this.cache.greenChecks() ?? {})[option.greenCheckKey as keyof GreenChecks])
      }));
  });

  // Three gates, applied at ONE point so the `OPTIONAL` divider, the Pool
  // funding alignment item and the PRMS SYNC button cannot disagree with each
  // other (the button reads `hasPoolFundingOption()`, which derives from this
  // same filter). The section flag can only subtract: `true` leaves the
  // existing rules in charge.
  //
  //  1. CONTRACT — `alignment.eligible` is the server's
  //     `toBoolean(context.is_pool_funding_contributor)`: the result's primary
  //     contract does not contribute to pool funding. Pre-existing behaviour.
  //  2. YEAR — `alignment.version_locked` is the server's
  //     `report_year_id !== MAPPABLE_LIVE_VERSION`. The reporting year is NOT a
  //     configurable parameter anywhere in this system (no app_config row, no ENV
  //     var, and `report_years.is_active` is the soft-delete flag, not a reporting
  //     window); it is the constant in toc-level-rules.util.ts, and the server
  //     resolves the comparison for us. Compared with `=== true` on purpose: a
  //     server that omits the field leaves the section VISIBLE, matching today.
  //  3. SECTION FLAG — hidden when the flag resolves to disabled. OR-ed with
  //     the rules above; never a replacement of them.
  private shouldHidePoolFundingTab(option: SidebarOption, alignment: AlignmentResponse | null): boolean {
    if (option.path !== 'pool-funding-alignment') return false;
    const meta = this.cache.currentMetadata();
    const hiddenByExistingRules = meta?.indicator_id === 5 || !alignment || alignment.eligible === false || alignment.version_locked === true;
    return hiddenByExistingRules || !this.poolFundingFlags.sectionEnabled();
  }

  /** Optional sections (AR.3) — excluded from the progress counter and from submit gating. */
  private countsTowardSectionCompletion(option: SidebarOption): boolean {
    return !option.optional;
  }

  /** Caption + tooltip for the optional-sections group divider in the sidebar. */
  readonly OPTIONAL_GROUP_LABEL = 'Optional';
  readonly OPTIONAL_GROUP_TOOLTIP = 'This section does not count toward completed sections and is not required to submit the result.';

  canSyncPrms = computed(() => {
    const meta = this.cache.currentMetadata();
    const isApproved = meta?.status_id === 6;
    const isPoolFundingComplete = Boolean(this.cache.greenChecks()?.pool_funding_alignment);
    // Completeness is NOT the same as "there is something to sync". Answering
    // "No" to the Science Program question is a COMPLETE answer -- the
    // validation function returns true for it ("Answered No: nothing else
    // applies", pool_funding_alignment_validation) -- so the green check goes
    // green with nothing to send to PRMS. An unanswered question (null) is
    // likewise nothing to sync.
    const contributesToPoolFunding = this.bilateralService.currentAlignment()?.has_contribution === true;
    return isApproved && isPoolFundingComplete && contributesToPoolFunding;
  });

  prmsAlreadySynced = computed(() => !!this.bilateralService.currentAlignment()?.is_synced_to_prms);

  /** Why PRMS SYNC is unavailable, so a disabled button never explains itself wrongly. */
  prmsSyncTooltip = computed(() => {
    // Already-synced wins: canSyncPrms can still be true for a synced result
    // (the button is disabled by prmsAlreadySynced), and returning '' there
    // would leave the disabled button unexplained.
    if (this.prmsAlreadySynced()) {
      return 'This result has already been synced to PRMS.';
    }
    if (this.canSyncPrms()) {
      return '';
    }
    if (this.bilateralService.currentAlignment()?.has_contribution === false) {
      return 'This result does not contribute to a Science Program or Accelerator, so there is nothing to sync to PRMS.';
    }
    return 'This button will become available once the result is approved and Pool Funding Alignment is completed.';
  });

  // Shown under the PRMS SYNC button once PRMS has assigned a code. Mirrors the
  // `Result code #…` line at the top of the sidebar so the two read as one family.
  // Null/absent -- the normal state before a sync -- renders nothing at all rather
  // than an empty label.
  prmsResultCode = computed(() => this.bilateralService.currentAlignment()?.prms_result_code ?? null);

  prmsSyncInFlight = signal(false);

  hasPoolFundingOption = computed(() => {
    return this.allOptionsWithGreenChecks().some(o => o.path === 'pool-funding-alignment' && !o.hide);
  });

  async onPrmsSync(): Promise<void> {
    if (!this.canSyncPrms() || this.prmsSyncInFlight() || this.prmsAlreadySynced()) return;
    this.prmsSyncInFlight.set(true);
    try {
      const response = await this.api.POST_PrmsSync(this.cache.getCurrentNumericResultId());
      if (response.successfulRequest) {
        await this.metadata.update(this.cache.getCurrentNumericResultId());
        const resultCode = this.route.snapshot.paramMap.get('id') ?? String(this.cache.getCurrentNumericResultId());
        await this.bilateralService.getAlignment(resultCode);
        // A successful push is a terminal, irreversible event -- the result becomes
        // read-only in STAR -- so it gets a blocking modal rather than a toast that
        // scrolls away unseen. Reuses the SAME `showGlobalAlert` the reporting-year
        // change uses in General Information; no new modal component.
        //   severity 'success'   -> green `pi pi-check-circle` + green title (#509C55)
        //   generalButton        -> the full-width blue Continue button
        //   hasNoCancelButton    -> single button, per the approved design
        // `.summary` is uppercased by CSS, so the copy is written in sentence case.
        // `detail` renders through [innerHTML], which is why the line break is a <br>.
        this.actions.showGlobalAlert({
          severity: 'success',
          summary: 'Successfully synchronized with PRMS',
          detail: 'This result was successfully synchronized.<br>You can now access it in PRMS.',
          hasNoCancelButton: true,
          generalButton: true,
          confirmCallback: { label: 'Continue' }
        });
      } else {
        // Same modal shape as the success path, so a failure is as impossible to
        // miss as a success. `severity: 'error'` gives the red `pi pi-times-circle`.
        //
        // The TECHNICAL reason is deliberately NOT shown: the strings that reach
        // here are developer-facing -- "Missing mandatory field 'actors'", or a raw
        // PRMS JSON-Schema path like
        // "/innovation_use/current_innovation_use_numbers must have required
        // property 'innov_use_to_be_determined'". Nothing is lost by hiding it: the
        // server persists it verbatim in `result_prms_sync_log.failure_reason`, and
        // it is logged to the console below for whoever is debugging.
        //
        // "was not synchronized" is a claim about STAR, which is safe to make: any
        // non-ACCEPTED outcome leaves `is_synced_to_prms` false. It deliberately
        // does NOT say PRMS received nothing -- on a timeout that is unknowable.
        console.error('PRMS sync failed:', this.prmsSyncFailureMessage(response));

        // PRMS's own validation messages, when it sent any, are shown verbatim --
        // they name the field and say what to do about it. Everything else keeps
        // the generic copy, because those failures are developer-facing.
        const rejections = this.prmsRejectionMessages(response);
        // A real <ul>, not bullet characters joined by <br>. `.alert` is
        // text-align: center, so hand-made bullets centre line by line and never
        // line up. The alignment lives in a CSS class rather than an inline
        // style because Angular's [innerHTML] sanitizer strips `style` but keeps
        // `class`.
        const detail = rejections.length
          ? 'This result was not synchronized. PRMS reported:' +
            `<ul class="alert-detail-list">${rejections.map(message => `<li>${this.escapeHtml(message)}</li>`).join('')}</ul>`
          : 'This result was not synchronized.<br>Please try again. If the problem continues, contact support.';

        this.actions.showGlobalAlert({
          severity: 'error',
          summary: 'Could not synchronize with PRMS',
          detail,
          hasNoCancelButton: true,
          generalButton: true,
          confirmCallback: { label: 'Continue' }
        });
      }
    } finally {
      this.prmsSyncInFlight.set(false);
    }
  }

  private prmsSyncFailureMessage(response: { description?: string; errorDetail?: { errors?: string; description?: string } | null }): string {
    return (
      response.errorDetail?.errors ||
      response.errorDetail?.description ||
      response.description ||
      'Unable to send the result to PRMS, please try again.'
    );
  }

  /**
   * The validation messages PRMS itself returned, if any.
   *
   * These are written FOR the reporter -- "Links to file storage platforms
   * (Google Drive, Dropbox...) are not accepted as evidence. Provide a publicly
   * accessible link (CGSpace, DOI or a public site) instead." -- so unlike STAR's
   * internal build errors they belong on screen.
   *
   * They arrive buried in `failure_reason`, which the server stores as
   * `HTTP <code>: <text> - <json>`; the JSON carries `response.message`, a string
   * OR an array of strings. Parsing never throws: anything unexpected returns []
   * and the modal falls back to the generic copy.
   */
  private prmsRejectionMessages(response: unknown): string[] {
    // Read structurally rather than by type: the server's envelope carries `data`
    // on an error body, but the shared `ErrorResponse` interface does not declare
    // it. Widening that shared type for one consumer would reach every caller in
    // the app, so the narrowing stays here.
    const raw = (
      response as {
        errorDetail?: { data?: { failure_reason?: unknown } | null } | null;
      }
    )?.errorDetail?.data?.failure_reason;
    if (typeof raw !== 'string' || raw.trim() === '') return [];

    const start = raw.indexOf('{');
    if (start === -1) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.slice(start));
    } catch {
      return [];
    }

    return this.collectPrmsMessages(parsed);
  }

  /**
   * PRMS does not normalise its error bodies, so two shapes have been seen in
   * production and both are handled:
   *
   *   1. Bad Request -- `{ response: { message: string | string[] } }`
   *   2. validation_failed -- `{ rejected: [ { detailedErrors: [ { message } ] } ] }`
   *      (the rejected entry may arrive on its own, because the server stores
   *      `JSON.stringify(chosen)` when it cannot find a plain string reason)
   *
   * Both are searched; whichever yields messages wins, and duplicates are
   * dropped so a body carrying the same text twice does not repeat it on screen.
   */
  private collectPrmsMessages(parsed: unknown): string[] {
    const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : value == null ? [] : [value]);

    const root = parsed as {
      response?: { message?: unknown };
      detailedErrors?: unknown;
      rejected?: unknown;
    };

    const fromDetailed = (entry: unknown): unknown[] =>
      asList((entry as { detailedErrors?: unknown })?.detailedErrors).map(detail => (detail as { message?: unknown })?.message);

    const candidates = [...asList(root?.response?.message), ...fromDetailed(root), ...asList(root?.rejected).flatMap(fromDetailed)];

    const seen = new Set<string>();
    return candidates
      .map(entry => (entry == null ? '' : String(entry).trim()))
      .filter(entry => {
        if (entry.length === 0 || seen.has(entry)) return false;
        seen.add(entry);
        return true;
      });
  }

  /** Escapes before the modal renders it: `detail` goes through [innerHTML], and
   * these strings come from an external system. */
  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  showOicrStatusDropdown = computed(() => {
    const meta = this.cache.currentMetadata();
    return this.roles.isAdmin() && meta.indicator_id === 5 && meta.status_id !== this.publishedOicrStatusId && !this.cache.isExternalResult();
  });

  getResultChildQueryParams(): Record<string, string> {
    const m = this.route.snapshot.queryParamMap;
    const o: Record<string, string> = {};
    const v = m.get('version');
    const f = m.get('from');
    if (v) o['version'] = v;
    if (f === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER || f === RESULT_ENTRY_SOURCE_VALUE_HOME) {
      o[RESULT_ENTRY_SOURCE_QUERY] = f;
    }
    return o;
  }

  allOptions: WritableSignal<SidebarOption[]> = signal([
    {
      label: 'General information',
      path: 'general-information',
      greenCheckKey: 'general_information'
    },
    {
      label: 'Alliance alignment',
      path: 'alliance-alignment',
      greenCheckKey: 'alignment'
    },
    // @akili-spec docs/specs/innovation-use/details-page (T-10 — reachability wiring)
    {
      label: 'Innovation use details',
      path: 'innovation-use-details',
      indicator_id: 6,
      greenCheckKey: 'innovation_use'
    },
    {
      label: 'OICR Details',
      path: 'oicr-details',
      indicator_id: 5,
      greenCheckKey: 'oicr'
    },
    {
      label: 'Innovation details',
      path: 'innovation-details',
      indicator_id: 2,
      greenCheckKey: 'innovation_dev'
    },
    {
      label: 'CapSharing details',
      path: 'capacity-sharing',
      indicator_id: 1,
      greenCheckKey: 'cap_sharing'
    },
    {
      label: 'Policy Change details',
      path: 'policy-change',
      indicator_id: 4,
      greenCheckKey: 'policy_change'
    },
    {
      label: 'Results partners',
      path: 'partners',
      greenCheckKey: 'partners'
    },
    {
      label: 'Geographic scope',
      path: 'geographic-scope',
      underConstruction: false,
      hide: false,
      greenCheckKey: 'geo_location'
    },
    {
      label: 'Links to result',
      path: 'links-to-result',
      indicator_id: 5,
      greenCheckKey: 'link_result'
    },
    {
      label: 'Evidence',
      path: 'evidence',
      greenCheckKey: 'evidences'
    },
    {
      label: 'IP rights',
      path: 'ip-rights',
      indicator_id: 1,
      greenCheckKey: 'ip_rights'
    },
    {
      label: 'IP rights',
      path: 'ip-rights',
      indicator_id: 2,
      greenCheckKey: 'ip_rights'
    },
    // @akili-spec docs/specs/innovation-use/details-page (T-10 — reachability wiring)
    {
      label: 'IP rights',
      path: 'ip-rights',
      indicator_id: 6,
      greenCheckKey: 'ip_rights'
    },
    {
      label: 'Pool funding alignment',
      path: 'pool-funding-alignment',
      greenCheckKey: 'pool_funding_alignment',
      optional: true
    }
  ]);

  submissionAlertData = computed(
    (): SubmissionAlertData => ({
      severity: 'success',
      placeholder: 'Add any additional comments here',
      summary: 'CONFIRM SUBMISSION',
      detail: `The result <span class="font-medium">"${this.cache.currentMetadata().result_title}"</span> is about to be <span class="font-medium">submitted</span>. Once confirmed, no further changes can be made. If you have any comments, feel free to add them below.`
    })
  );

  unsavedChangesAlertData = computed(
    (): SubmissionAlertData => ({
      severity: 'warning',
      placeholder: 'Please share your feedback about the unsubmission',
      summary: 'CONFIRM UNSUBMISSION',
      detail: `You are about to <span class="font-medium">unsubmit</span> the result <span class="font-medium">"${this.cache.currentMetadata().result_title}"</span>. To continue, please provide a brief reason for the unsubmission.`
    })
  );

  getCompletedCount(): number {
    return this.allOptionsWithGreenChecks().filter(option => !option.hide && this.countsTowardSectionCompletion(option) && option.greenCheck).length;
  }

  getTotalCount(): number {
    return this.allOptionsWithGreenChecks().filter(option => !option.hide && this.countsTowardSectionCompletion(option)).length;
  }

  submmitConfirm() {
    if (this.cache.isExternalResult()) return;
    const { severity, placeholder, summary, detail } = this.submissionService.currentResultIsSubmitted()
      ? this.unsavedChangesAlertData()
      : this.submissionAlertData();

    this.actions.showGlobalAlert({
      severity,
      summary,
      detail,
      placeholder,
      commentLabel: this.submissionService.currentResultIsSubmitted() ? 'Feedback about the unsubmission' : 'Comment',
      commentRequired: this.submissionService.currentResultIsSubmitted(),
      confirmCallback: {
        label: 'Confirm',
        event: (data?: { comment?: string; selected?: string }) => {
          (async () => {
            const response = await this.api.PATCH_SubmitResult({
              resultCode: this.cache.getCurrentNumericResultId(),
              comment: data?.comment ?? '',
              status: this.submissionService.currentResultIsSubmitted() ? 4 : 2
            });
            this.metadata.update(this.cache.getCurrentNumericResultId());
            this.submissionService.refreshSubmissionHistory.update(v => v + 1);
            if (!response.successfulRequest) {
              this.actions.showToast({ severity: 'error', summary: 'Error', detail: response.errorDetail.errors });
            } else if (!this.submissionService.currentResultIsSubmitted()) {
              this.actions.showGlobalAlert({
                severity: 'success',
                hasNoButton: true,
                summary: 'RESULT SUBMITTED',
                detail: 'The result was submitted successfully.'
              });
            }
          })();
        }
      }
    });
  }

  async approveResult() {
    if (this.cache.isExternalResult()) return;
    const response = await this.api.PATCH_SubmitResult({
      resultCode: this.cache.getCurrentNumericResultId(),
      status: 6
    });
    if (response.successfulRequest) {
      await this.metadata.update(this.cache.getCurrentNumericResultId());
      this.submissionService.refreshSubmissionHistory.update(v => v + 1);
      this.actions.showToast({
        severity: 'success',
        summary: 'Result approved',
        detail: 'The result has been approved successfully.'
      });
    } else {
      this.actions.showToast({
        severity: 'error',
        summary: 'Error',
        detail: response.errorDetail?.errors || 'Unable to approve result, please try again.'
      });
    }
  }

  navigateTo(option: SidebarOption, event: Event) {
    if (option.disabled) {
      event.preventDefault();
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    const m = this.route.snapshot.queryParamMap;
    const version = m.get('version');
    const from = m.get('from');
    const commands = ['/result', id, option.path];

    const queryParams: Record<string, string> = {};
    if (version) {
      queryParams['version'] = version;
    }
    if (from === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER || from === RESULT_ENTRY_SOURCE_VALUE_HOME) {
      queryParams[RESULT_ENTRY_SOURCE_QUERY] = from;
    }

    this.router.navigate(commands, {
      queryParams,
      replaceUrl: false
    });
  }

  getRouterLink(option: SidebarOption): string[] | null {
    if (option.disabled) return null;

    const id = this.route.snapshot.paramMap.get('id');
    return ['/result', id!, option.path];
  }

  async onStatusChange(newStatusId: number): Promise<void> {
    if (this.cache.isExternalResult()) return;
    const specialAlert = this.getSpecialStatusAlert(newStatusId);
    if (specialAlert) {
      this.actions.showGlobalAlert({
        severity: specialAlert.severity,
        summary: specialAlert.summary,
        detail: specialAlert.detail,
        placeholder: specialAlert.placeholder,
        icon: specialAlert.icon,
        iconClass: specialAlert.iconClass,
        color: specialAlert.color,
        commentLabel: 'Justification',
        commentAsTextArea: true,
        commentRequired: true,
        confirmCallback: {
          label: 'Confirm',
          event: (data?: { comment?: string }) => {
            void this.updateResultStatus(newStatusId, data?.comment ?? '');
          }
        },
        cancelCallback: {
          label: 'Cancel'
        }
      });
      return;
    }

    await this.updateResultStatus(newStatusId, '');
  }

  private getSpecialStatusAlert(statusId: number): GlobalAlert | null {
    const resultTitle = this.cache.currentMetadata().result_title ?? '';

    if (statusId === 11) {
      return {
        severity: 'warning',
        summary: 'POSTPONE THIS OICR?',
        detail: `You are about to <span class="font-medium">postpone</span> the result "<span class="font-medium">${resultTitle}</span>". To continue, please provide a brief reason.`,
        placeholder: 'TProvide the justification to reject this OICR.',
        icon: 'pi pi-minus-circle',
        iconClass: 'text-[#E69F00]',
        color: '#E69F00',
        commentAsTextArea: true
      };
    }

    if (statusId === 15) {
      return {
        severity: 'error',
        summary: 'DO NOT ACCEPT this OICR?',
        detail: `You are about to <span class="font-medium">not accept</span> the result "<span class="font-medium">${resultTitle}</span>". To continue, please provide a brief reason.`,
        placeholder: 'Provide the justification to reject this OICR',
        icon: 'pi pi-times-circle',
        iconClass: 'text-[#CF0808]',
        color: '#CF0808',
        commentAsTextArea: true
      };
    }

    return null;
  }

  private async updateResultStatus(status: number, comment: string): Promise<void> {
    try {
      const response = await this.api.PATCH_SubmitResult({
        resultCode: this.cache.getCurrentNumericResultId(),
        comment,
        status
      });

      if (response.successfulRequest) {
        await this.handleSuccessfulStatusUpdate(status);
      } else {
        this.actions.showToast({
          severity: 'error',
          summary: 'Error',
          detail: response.errorDetail?.errors || 'Unable to update status, please try again'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      this.actions.showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'Unable to update status, please try again'
      });
    }
  }

  private async handleSuccessfulStatusUpdate(status: number): Promise<void> {
    await this.metadata.update(this.cache.getCurrentNumericResultId());

    const { indicator_id, status_id, result_contract_id, result_title, result_official_code } = this.cache.currentMetadata() || {};

    if (this.currentResultService.validateOpenResult(indicator_id ?? 0, status_id ?? 0)) {
      const isDraft = (status_id ?? 0) === 10 || (status_id ?? 0) === 12 || (status_id ?? 0) === 13;
      if (!isDraft || (isDraft && !this.roles.isAdmin())) {
        if (result_contract_id) {
          await this.openOicrEditModalAfterProjectOrResultsCenterNavigation(
            String(result_contract_id),
            result_title,
            indicator_id ?? 0,
            status_id ?? 0,
            result_official_code ?? 0
          );
          return;
        }
      }
    }

    this.actions.showToast({
      severity: 'success',
      summary: 'Status updated',
      detail: 'The status has been updated successfully'
    });

    if (status === 11 || status === 15 || status === 7) {
      await this.handlePostponeOrRejectRedirect();
    }
  }

  private async handlePostponeOrRejectRedirect(): Promise<void> {
    const { indicator_id, status_id, result_contract_id, result_title, result_official_code } = this.cache.currentMetadata() || {};

    if (!this.currentResultService.validateOpenResult(indicator_id ?? 0, status_id ?? 0)) {
      return;
    }

    const isDraft = (status_id ?? 0) === 4 || (status_id ?? 0) === 14 || (status_id ?? 0) === 12 || (status_id ?? 0) === 13;

    if (isDraft || !result_contract_id) {
      return;
    }

    await this.openOicrEditModalAfterProjectOrResultsCenterNavigation(
      String(result_contract_id),
      result_title,
      indicator_id ?? 0,
      status_id ?? 0,
      result_official_code ?? 0
    );
  }

  private async openOicrEditModalAfterProjectOrResultsCenterNavigation(
    resultContractId: string,
    resultTitle: string | undefined | null,
    indicatorId: number,
    statusId: number,
    resultOfficialCode: number
  ): Promise<void> {
    const fromResultsCenter = isResultsCenterEntryFromUrl(this.router.url);
    const fromHome = isHomeEntryFromUrl(this.router.url);
    if (fromResultsCenter) {
      await this.router.navigate(['/results-center']);
    } else if (fromHome) {
      await this.router.navigate(['/home']);
    } else {
      await this.router.navigate(['/project-detail', resultContractId]);
      if (!this.router.url.includes('/project-detail/')) {
        this.cache.projectResultsSearchValue.set(resultTitle ?? '');
      }
    }
    let creationContext: 'results-center' | 'project' | undefined;
    if (fromResultsCenter) {
      creationContext = 'results-center';
    } else if (!fromHome) {
      creationContext = 'project';
    }
    await this.currentResultService.openEditRequestdOicrsModal(indicatorId, statusId, resultOfficialCode, creationContext);
  }
}
