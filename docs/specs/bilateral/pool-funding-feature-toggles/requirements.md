# Requirements — Bilateral / Pool Funding Feature Toggles

## 0. Document control

| Field | Value |
| --- | --- |
| Spec path | `docs/specs/bilateral/pool-funding-feature-toggles` |
| Depth | **Lite** |
| Type | Change (feature flags) |
| Approval mode | interactive |
| Author | d.casanas@cgiar.org |
| Date | 2026-09-24 |
| Baseline commit | `37d8f875` |
| Time box | One morning (owner-stated) |

---

## 1. Context

Two administrative kill switches for the Pool Funding Alignment feature, stored as
rows in `app_config`.

**Why now.** The section and the PRMS SYNC button are already governed by *product*
rules (primary contract contributes to pool funding, reporting year, indicator type).
Those rules answer *"does this result qualify?"*. They cannot answer *"should this
feature be available at all right now?"* — which is an operational question that
today has no answer short of a deploy.

**The shape of the switch matters.** Each flag can only ever **subtract**
availability. `true` does not mean "show it"; it means "let the existing rules
decide". This is stated as a requirement rather than left to implementation because
the opposite reading — a flag that forces the section visible — would expose Pool
Funding on results that do not qualify for it.

### 1.1 Current behavior (verified at `37d8f875`)

| Claim | Evidence as run |
| --- | --- |
| One client choke point decides all three surfaces — the `Optional` divider, the sidebar item, and the PRMS SYNC button | `shouldHidePoolFundingTab()` at `result-sidebar.component.ts:100`; the button's `@if (hasPoolFundingOption())` at `result-sidebar.component.html:143` reads the same filtered list built at `:68-83` |
| The server already refuses ineligible syncs through an ordered data-driven ladder | `SYNC_GATE_ENTRIES` at `eligibility/sync-gate.ts:69` — 7 entries, first-failure-wins |
| `app_config` stores values as text; there is no `is_active` column | `app-config.entity.ts` — columns `description`, `category`, `subcategory`, `field`, `simple_value`, `json_value`; `grep -c is_active` → **0** |
| `GET /api/configuration/:key` is public (excluded from `JwtMiddleware`) | `app.module.ts:78` — `path: 'configuration/:key'` in the exclude list |
| Server-side config reads are **not** cached | `app-config.util.ts` — no TTL, no memo; queries the `DataSource` per call. This is **not** the K-016 5-minute trap, which belongs to `MappingPhaseResolver` and `ClarisaProjectsService` only |

---

## 2. Requirement numbering

`R-PFT-NNN` functional · `NFR-PFT-NNN` non-functional.

---

## 3. Functional requirements

### R-PFT-001 — The section flag can only subtract

The system SHALL hide the Pool Funding Alignment section whenever the section flag
resolves to `false`, and SHALL otherwise leave the existing visibility rules
unchanged.

#### Scenario: Flag off hides a qualifying result

- GIVEN a result that today shows the Pool Funding Alignment section
- WHEN the section flag resolves to `false`
- THEN the sidebar item, the `Optional` divider and the PRMS SYNC button are all absent
- BUT it must NOT alter any stored alignment data

#### Scenario: Flag on does not override the product rules

- GIVEN a result whose primary contract does not contribute to pool funding
- WHEN the section flag resolves to `true`
- THEN the section stays hidden, exactly as today
- AND IT MUST be hidden for the pre-existing reason, not re-evaluated

### R-PFT-002 — The button flag hides only the button

The system SHALL hide the PRMS SYNC button when the button flag resolves to `false`,
leaving the Pool Funding Alignment section itself reachable.

#### Scenario: Button off, section on

- GIVEN a result that qualifies for Pool Funding and for PRMS sync
- WHEN the button flag resolves to `false` and the section flag resolves to `true`
- THEN the PRMS SYNC button is absent
- AND the sidebar item and the section remain reachable
- BUT it must NOT hide the PRMS result code caption for results already synced

#### Scenario: Section off wins over button on

- GIVEN the section flag resolves to `false`
- WHEN the button flag resolves to `true`
- THEN the button is absent, because its host surface is gone

### R-PFT-003 — Fail-open on every unreadable state

The system SHALL treat the feature as **enabled** whenever a flag cannot be read as
an explicit disable.

#### Scenario: Every absent-value path

- GIVEN any of: the `app_config` row is missing · `simple_value` is `NULL` · `simple_value` is empty or whitespace · `simple_value` holds an unrecognised string · the configuration request fails or times out
- WHEN visibility is resolved
- THEN the feature behaves as if the flag were `true`
- AND IT MUST be covered by an explicit test per path, not by a code comment

> This mirrors the deliberate convention beside it: `alignment.version_locked === true`
> at `result-sidebar.component.ts:104`, commented so that a server omitting the field
> leaves the section **visible**. A configuration read error must never blank a
> production section.

### R-PFT-004 — The server refuses a sync when the button flag is off

The system SHALL refuse a PRMS sync request while the button flag resolves to
`false`, regardless of what the client displays.

#### Scenario: Stale tab cannot push

- GIVEN a user whose browser loaded the page before the flag was turned off
- WHEN they trigger a PRMS sync
- THEN the server refuses the request with a message naming the disabled feature
- AND IT MUST refuse **before** any call to PRMS is made
- BUT it must NOT consume a sync attempt number or write a `REFUSED_BY_STAR` row —
  an administrative pause is not a verdict about the result

### R-PFT-005 — Both flags are editable from the existing admin screen

The system SHALL expose both flags in the existing variable-configuration screen,
rendered as a boolean control rather than a free-text field.

#### Scenario: Admin toggles a flag

- GIVEN a `SYSTEM_ADMIN` or `TECHNICAL_SUPPORT` user on the configuration screen
- WHEN they open either flag
- THEN the editor presents an on/off control, not a text input
- AND saving writes the canonical encoding defined in `design.md`
- BUT it must NOT allow a free-text value that the parser would read as enabled by accident

#### Scenario: A flag row always exists to be edited

- GIVEN a freshly migrated environment
- WHEN an admin opens the configuration screen
- THEN both flag rows are present and set to enabled

---

## 4. Non-functional requirements

### NFR-PFT-001 — A flag change needs no restart

Turning a flag off SHALL take effect on the server without a process restart or a
cache-expiry wait, because `app-config.util.ts` holds no cache.

**Explicitly out of scope:** the client caches its read for the session (see
`design.md` D-4). A user with the page already open sees the change on their next
load. The server gate (R-PFT-004) is what makes that lag safe, and no UI may imply
the client updates instantly.

### NFR-PFT-002 — The single choke point survives

The three client surfaces SHALL continue to derive from one filter, so they cannot
disagree about whether Pool Funding is available.

---

## 5. Defect classes and their gates

| Defect class this spec can produce | Gate that catches it | Can it go red? |
| --- | --- | --- |
| Flag inverted (off shows, on hides) | Client unit tests asserting both directions per surface | Yes — flip the comparison, tests red |
| Flag turned into an **override** (on forces visible) | A test where flag `true` + non-contributing contract still hides | Yes — change `&&` to `\|\|`, test red |
| Fail-open regressed to fail-closed | One test per absent-value path in R-PFT-003 | Yes — default to `false`, tests red |
| Server gate ordered wrong (writes a log row, or runs after the PRMS call) | Server unit test on gate order + `persistsRow` | Yes — set `persistsRow: true`, test red |
| Parser accepts a value it should reject, or vice versa | Table-driven parser test over the full absent-value set | Yes |
| Seed rows missing after deploy | **No automated gate** — migrations are not applied by the pipeline (K-015) | **Accepted risk**, mitigated by R-PFT-003 fail-open and recorded in `tasks.md` T-01 Done criteria |
| Admin control renders as text instead of a toggle | Client component test on the modal branch | Yes |

**Accepted blind spot.** Nothing in CI proves the seed migration ran on a given
environment. Fail-open is the deliberate mitigation: an unmigrated environment
behaves exactly as today rather than losing the section.

---

## 6. Data requirements

Two new `app_config` rows. Key names, encoding and parser are pinned in
`design.md` §5 — they are implementation contract, not observable behavior.

---

## 7. API surface delta

No new endpoint. `GET /api/configuration/:key` and `PATCH /api/configuration/:key`
are reused as-is. The PRMS sync endpoint gains one refusal reason.

---

## 8. Assumptions, dependencies, risks

| # | Item | Impact if wrong |
| --- | --- | --- |
| A-1 | The seed migration is applied by a human before the flags are relied on (K-015: the pipeline deploys code, not migrations) | Flags absent → fail-open → today's behavior. Low |
| A-2 | No consumer outside the sidebar reads Pool Funding visibility | A second surface could disagree. Checked in `design.md` Premise Ledger P-6 |

---

## 9. Open questions

None. The three decisions that shaped this spec — section-off also hides the button,
server refusal in addition to client hiding, client reads `app_config` directly
rather than via the alignment response — were settled with the owner on 2026-09-24.

---

## 10. Requirement ID index

| ID | Title |
| --- | --- |
| R-PFT-001 | The section flag can only subtract |
| R-PFT-002 | The button flag hides only the button |
| R-PFT-003 | Fail-open on every unreadable state |
| R-PFT-004 | The server refuses a sync when the button flag is off |
| R-PFT-005 | Both flags are editable from the existing admin screen |
| NFR-PFT-001 | A flag change needs no restart |
| NFR-PFT-002 | The single choke point survives |
