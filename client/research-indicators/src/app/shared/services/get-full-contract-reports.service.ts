import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ContractFullReports } from '@interfaces/contract-full-reports.interface';

/**
 * Single-source data layer for the project dashboard's ranked charts (R-PDB-001).
 *
 * Component-scoped (DD-9) — do NOT add `providedIn: 'root'`. Provide it on
 * `ProjectDashboardComponent`, matching the four `GetTop*Service`s it replaces;
 * root scope would retain the previous contract's payload across navigation.
 *
 * Per DD-2r the service holds exactly one `payload` signal; every per-section
 * accessor below is a `computed` derived from it — never an independent
 * imperative signal — so a `loadError` reset of `payload` resets every section
 * for free.
 */
@Injectable()
export class GetFullContractReportsService {
  apiService = inject(ApiService);

  contractId = '';

  payload = signal<ContractFullReports | null>(null);
  loading = signal(false);
  loadError = signal(false);

  topPartners = computed(() => this.payload()?.top_partners ?? []);
  topPrimaryLevers = computed(() => this.payload()?.top_primary_levers ?? []);
  topMainContactPersons = computed(() => this.payload()?.top_main_contact_persons ?? []);
  topContributors = computed(() => this.payload()?.top_contributors ?? []);
  staff = computed(() => this.payload()?.staff ?? []);
  geoScope = computed(() => this.payload()?.geo_scope ?? null);

  // Indicator-metadata sections (indicator-metadata-charts spec, T-10).
  // Same `payload` signal, same computed-accessor pattern (DD-2r) — no
  // second source of truth.
  innovationNature = computed(() => this.payload()?.innovation_nature ?? []);
  innovationType = computed(() => this.payload()?.innovation_type ?? []);
  innovationReadiness = computed(() => this.payload()?.innovation_readiness ?? []);
  oicrMaturity = computed(() => this.payload()?.oicr_maturity ?? []);
  policyType = computed(() => this.payload()?.policy_type ?? []);
  policyStage = computed(() => this.payload()?.policy_stage ?? []);
  sessionFormat = computed(() => this.payload()?.session_format ?? []);
  sessionType = computed(() => this.payload()?.session_type ?? []);
  genderDistribution = computed(() => this.payload()?.gender_distribution ?? []);
  degree = computed(() => this.payload()?.degree ?? []);

  main(contractId: string) {
    this.contractId = contractId;
    void this.update();
  }

  update = async () => {
    if (!this.contractId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_FullContractReports(this.contractId);
      // `ToPromiseService` never rejects on an HTTP failure (its `catchError`
      // resolves with a `successfulRequest: false` envelope), so the failure
      // path is driven by that flag, not by a caught rejection. The `catch`
      // block below is defense-in-depth only.
      if (response?.successfulRequest) {
        this.payload.set(response.data ?? null);
      } else {
        this.payload.set(null);
        this.loadError.set(true);
      }
    } catch {
      this.payload.set(null);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  };
}
