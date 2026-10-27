# Judgment Day — bilateral/pool-funding-update-carryover

- **Target:** requirements.md, design.md, tasks.md at `d59c5d6db` + uncommitted spec files
- **Judges:** 2 blind read-only (Sonnet; author Opus — author ≠ auditor)
- **Owner limit:** one round, a second only if needed (2026-10-08)

## Round 1 — ledger

| ID | Judges | Severity | Finding | Disposition |
| --- | --- | --- | --- | --- |
| JD-1 (A J-1, B F-1/F-2) | both | **severe, confirmed** | `uq_rpfim_result_indicator_active` is a plain UNIQUE incl. `is_active`; deactivate-then-insert collides (1062) on a second Update and on re-approval; no fixture case could see it | Fixed: D-9 purge step 0, P-10, R-PUC-001 S-2 clause + S-8, T-02 S-2b/S-8 + falsifier f8, O-3 for the latent save-path defect. Orchestrator re-verified `baseline.sql:3723` |
| JD-2 (A J-2, B F-3) | both | warning | Premise count said 8, table had 9 | Fixed (count now matches table) |
| JD-3 (A J-3, B F-5) | both | warning | `insertId` reliance without premise | Fixed by design: re-select active live alignment id |
| JD-4 (A J-4, B F-6) | both | warning | Lookup / status update proven only by mocks | T-01 case (e) + accepted gap stated in T-01 Disqualifier |
| JD-5 (A J-5) | one | warning (suspect) | display_only applies to PRMS-coded live results | Already O-2; owner decision |
| JD-6 (A J-6) | one | warning (suspect) | Remap FK needs live section row; S-5 seed unrealistic | P-12 `UNVERIFIED` owned by T-02; S-5 seed rationale stated |
| JD-7 (B F-4) | one | warning (suspect) | Consumers of live rows (PRMS sync/webhook) missing | P-11 added (sync requires Approved; webhook diff uses snapshots) |
| JD-8 (A J-7, B F-7) | both | suggestion | History `from = APPROVED` | Stated in design §6 and T-01 (e) |
| JD-9 (B F-8) | one | info | Band/year free | No change |

Counts: 1 severe confirmed · 0 contradictions · 3 suspect · 5 info/warning.

## Round 2 — scoped re-judgment (both judges)

| ID | Judges | Severity | Finding | Disposition |
| --- | --- | --- | --- | --- |
| R2-1 | both | **severe, confirmed** (fix-caused) | Round-1 purge ran before deactivation; with a live active K shared with the snapshot, carry-over leaves K(0)+K(1) and re-approval (`SP_versioning`) hits 1062 | Final bounded fix: D-9 now hard-deletes **all** live mapping rows before copying (invariant: zero inactive live mappings). S-2/S-8 reworded; T-02 S-2b now ends with a real re-approval; falsifiers f8 (soft-deactivate → red) and f9 (snapshot touched → red) |
| R2-2 | both | warning | S-2b could not fail on the "only colliding" clause / never re-approved | Superseded by the new D-9 and S-2b |
| R2-3/R2-5 | both | suggestion | P-12 settleable from source | P-12 verified (no section-table UPDATE/DELETE in `SP_versioning`; KP not copied) |
| R2-4 | both | suggestion | Purge safety: no inbound FK on mapping `id` | Cited in D-9 |
| R2-4 (B) | one | suggestion | `sync-gate.ts` lines | Corrected to `:131-138` |
| R2-6 | one | suggestion | Budget likely low | Raised to ~500 LOC |

## Terminal state

**JUDGMENT: ESCALATED ⚠️ → continued under owner pre-authorization.** Round 2 re-judgment found a fix-caused severe defect; the final bounded fix round was applied, and the owner's limit (2026-10-08: "one round, a second only if needed, no more") forbids a third judgment. The fix is not re-judged; it is bound instead to **executed evidence**: T-02 S-2b (carry-over then real `SP_versioning` re-approval, no 1062) with falsifier f8 observed red. If S-2b cannot go green, `/akili-execute` takes the Pivot Protocol and stops.
