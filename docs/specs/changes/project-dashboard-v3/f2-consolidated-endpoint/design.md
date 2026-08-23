# Technical Design — Project Dashboard v3 / F2: Consolidated Dashboard Endpoint

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/project-dashboard-v3/f2-consolidated-endpoint/` |
| Parent Spec | `changes/project-dashboard-v3` (see `../family.md`) |
| Type | Change |
| Depth | Full |
| Approval Mode | gated |
| Depends on | `f1-hero-layout` (Status: done) |
| Date | 2026-08-23 |
| Author | JuanCode (via AKILI-SPECS) |
| Status | Specified |

---

## 2. Executive Summary

This technical design details the consolidation of the seven disparate dashboard analytic queries into a single endpoint `GET /api/v1/agresso/contracts/reports/dashboard?contract-id=`. The backend repository composes the seven existing optimized query methods concurrently via `Promise.allSettled`, isolates errors on a per-section basis, and returns a unified composite DTO. The client replaces seven independent services with a single `GetContractDashboardService`, guaranteeing synchronized snapshot hydration and reducing round-trips from 7 to 1.

---

## 3. Architecture Overview

```
[ Client: Project Dashboard Component ]
                  │
                  ▼
   [ GetContractDashboardService ]
                  │ (HTTP GET /api/v1/agresso/contracts/reports/dashboard?contract-id=...)
                  ▼
   [ AgressoContractController ]
                  │
                  ▼
     [ AgressoContractService ]
                  │
                  ▼
   [ AgressoContractRepository ] ─── Concurrent Promise.allSettled ───┐
                  ├─────────────────────────────────────────────────┤
                  ├──> getResultsSummaryReport(contractId)          │
                  ├──> getTopPartnersReport(contractId)             │
                  ├──> getTopPrimaryLeversReport(contractId)        │
                  ├──> getTopMainContactPersonsReport(contractId)   │
                  ├──> getTopContributorsReport(contractId)         │
                  ├──> getGeoScopeReport(contractId)                │
                  └──> getSpAlignmentReport(contractId)             │
                                                                    ▼
                                                    [ MySQL Database (Read-Only) ]
```

---

## 4. Extended Directory Structure

```
server/researchindicators/src/domain/entities/agresso-contract/
├── agresso-contract.controller.ts            # +1 GET reports/dashboard endpoint; deprecation tags
├── agresso-contract.controller.spec.ts       # Controller unit tests
├── agresso-contract.service.ts               # +getContractDashboard method
├── agresso-contract.service.spec.ts          # Service unit tests
├── dto/
│   └── contract-dashboard-report.dto.ts      # New composite DTO
└── repositories/
    ├── agresso-contract.repository.ts        # +getContractDashboard composition method
    └── agresso-contract.repository.spec.ts   # Concurrent composition & partial failure tests

client/research-indicators/src/app/
├── pages/platform/pages/project-detail/
│   └── components/project-dashboard/
│       ├── project-dashboard.component.ts    # Migrated to GetContractDashboardService
│       └── project-dashboard.component.spec.ts
└── shared/
    ├── interfaces/
    │   └── contract-dashboard.interface.ts   # Consolidated dashboard interfaces
    └── services/
        ├── api.service.ts                    # +GET_ContractDashboard, -7 deprecated endpoints
        ├── api.service.spec.ts
        ├── get-contract-dashboard.service.ts # New consolidated state service
        └── get-contract-dashboard.service.spec.ts
```

---

## 5. Data Model & DTO Specification

### Composite Response Schema (`ContractDashboardReportDto`)

```typescript
export class ContractDashboardTopsDto {
  partners: TopPartnerDto[] | null;
  primary_levers: TopPrimaryLeverDto[] | null;
  main_contacts: TopMainContactPersonDto[] | null;
  contributors: TopContributorsContractsDto[] | null;
}

export class ContractDashboardReportDto {
  summary: ContractResultsSummaryDto | null;
  tops: ContractDashboardTopsDto | null;
  geo_scope: GeoScopeDto | null;
  sp_alignment: ContractSpAlignmentDto | null;
}
```

---

## 6. API Design

### `GET /api/v1/agresso/contracts/reports/dashboard`

- **Tags:** `Agresso Contracts`
- **Security:** Bearer JWT / Machine Token
- **Query Parameters:**
  - `contract-id` (string, required): Contract ID or Agreement ID to aggregate.
- **Success Response (HTTP 200):**
  ```jsonc
  {
    "data": {
      "summary": {
        "total": 42,
        "by_status": [ /* ... */ ],
        "by_year": [ /* ... */ ],
        "by_indicator_year": [ /* ... */ ],
        "partner_institutions": 12
      },
      "tops": {
        "partners": [ /* ... */ ],
        "primary_levers": [ /* ... */ ],
        "main_contacts": [ /* ... */ ],
        "contributors": [ /* ... */ ]
      },
      "geo_scope": {
        "global": 2,
        "regional": 5,
        "countries": 10,
        "sub_national": 0,
        "yet_to_be_determined": 0,
        "top_regions": [ /* ... */ ],
        "top_countries": [ /* ... */ ]
      },
      "sp_alignment": {
        "sps": [ /* ... */ ]
      }
    },
    "status": 200,
    "description": "Contract dashboard report retrieved successfully",
    "errors": [],
    "timestamp": "2026-08-23T18:00:00.000Z",
    "path": "/api/v1/agresso/contracts/reports/dashboard"
  }
  ```
- **Partial Failure Response (HTTP 200):**
  If a single subquery fails (e.g. `geo_scope`), `data.geo_scope` is `null`, other sections return valid data, and `errors` contains `["Failed to load geo_scope section: <reason>"]`.

---

## 7. Backend Implementation Details

### Concurrent Composition in `AgressoContractRepository`

The repository method `getContractDashboard(contractId)` wraps each subquery in `Promise.allSettled`:

```typescript
async getContractDashboard(contractId: string): Promise<{ data: ContractDashboardReportDto; errors: string[] }> {
  const [
    summaryResult,
    partnersResult,
    leversResult,
    contactsResult,
    contributorsResult,
    geoScopeResult,
    spAlignmentResult
  ] = await Promise.allSettled([
    this.getResultsSummaryReport(contractId),
    this.getTopPartnersReport(contractId),
    this.getTopPrimaryLeversReport(contractId),
    this.getTopMainContactPersonsReport(contractId),
    this.getTopContributorsReport(contractId),
    this.getGeoScopeReport(contractId),
    this.getSpAlignmentReport(contractId)
  ]);

  const errors: string[] = [];

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : (errors.push(`summary: ${summaryResult.reason}`), null);
  const partners = partnersResult.status === 'fulfilled' ? partnersResult.value : (errors.push(`partners: ${partnersResult.reason}`), null);
  const levers = leversResult.status === 'fulfilled' ? leversResult.value : (errors.push(`levers: ${leversResult.reason}`), null);
  const contacts = contactsResult.status === 'fulfilled' ? contactsResult.value : (errors.push(`contacts: ${contactsResult.reason}`), null);
  const contributors = contributorsResult.status === 'fulfilled' ? contributorsResult.value : (errors.push(`contributors: ${contributorsResult.reason}`), null);
  const geoScope = geoScopeResult.status === 'fulfilled' ? geoScopeResult.value : (errors.push(`geo_scope: ${geoScopeResult.reason}`), null);
  const spAlignment = spAlignmentResult.status === 'fulfilled' ? spAlignmentResult.value : (errors.push(`sp_alignment: ${spAlignmentResult.reason}`), null);

  return {
    data: {
      summary,
      tops: {
        partners,
        primary_levers: levers,
        main_contacts: contacts,
        contributors
      },
      geo_scope: geoScope,
      sp_alignment: spAlignment
    },
    errors
  };
}
```

---

## 8. Frontend Architecture & Service Design

### `GetContractDashboardService`

```typescript
@Injectable({ providedIn: 'root' })
export class GetContractDashboardService {
  private readonly apiService = inject(ApiService);

  readonly data = signal<ContractDashboardReport | null>(null);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<boolean>(false);
  readonly loadedContractId = signal<string | null>(null);

  readonly summary = computed(() => this.data()?.summary ?? null);
  readonly tops = computed(() => this.data()?.tops ?? null);
  readonly topPartners = computed(() => this.tops()?.partners ?? []);
  readonly topPrimaryLevers = computed(() => this.tops()?.primary_levers ?? []);
  readonly topMainContactPersons = computed(() => this.tops()?.main_contacts ?? []);
  readonly topContributors = computed(() => this.tops()?.contributors ?? []);
  readonly geoScope = computed(() => this.data()?.geo_scope ?? null);
  readonly spAlignment = computed(() => this.data()?.sp_alignment ?? null);

  async load(contractId: string, options?: { force?: boolean }): Promise<void> {
    if (!options?.force && this.loadedContractId() === contractId && this.data()) {
      return;
    }
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const response = await this.apiService.GET_ContractDashboard(contractId);
      this.data.set(response?.data ?? null);
      this.loadedContractId.set(contractId);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async update(): Promise<void> {
    const contractId = this.loadedContractId();
    if (contractId) {
      await this.load(contractId, { force: true });
    }
  }
}
```

---

## 9. Design Decisions & Trade-offs

### DD-1: Concurrent Subquery Execution vs Query Unification
- **Decision:** Retain existing, proven individual query builders and run them in parallel via `Promise.allSettled` rather than attempting a massive multi-join SQL query.
- **Rationale:** The individual queries are already optimized on the shared seed subquery (`buildPrimaryContractResultsSubquery`). Combining them into one SQL query would produce a massive cross-product explosion of rows across different aggregation dimensions (regions × countries × levers × partners).
- **KZ-001 Application:** Query outputs are mapped directly to strictly-typed DTOs matching live production shapes.

### DD-2: Partial Failure Resilience & Error Reporting
- **Decision:** When an individual section query throws, the composite payload sets that section to `null` and appends an error message to `ServerResponseDto.errors`.
- **Rationale:** Prevents a failure in secondary analytics (like SP alignment or Geo Scope) from crashing the entire project dashboard.

### DD-3: Phased Deprecation Strategy
- **Decision:** Mark legacy report endpoints as deprecated first; delete them only after the client migration is complete and verified.
- **Rationale:** Ensures zero downtime or breaks during the transition.

---

## 10. Budget Tripwire

- **Expected Tasks:** 6 tasks (T-01 to T-06)
- **Expected LOC:** ~600-700 LOC across server and client
- **Expected Review Rounds:** 1-2 per task
- **Tripwire Threshold:** If execution exceeds 8 tasks or 1000 LOC, halt and escalate.
