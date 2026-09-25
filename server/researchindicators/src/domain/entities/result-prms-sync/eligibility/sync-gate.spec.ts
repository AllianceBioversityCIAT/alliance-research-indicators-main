import { HttpStatus } from '@nestjs/common';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import {
  evaluateSyncGate,
  SYNC_GATE_ENTRIES,
  SyncGateDecision,
  SyncGateEntry,
  SyncGateSnapshot,
} from './sync-gate';

/**
 * T-11-shaped send seam used only in this spec. The production gate never
 * sees a transport: a refusal must not reach ingest, and lifting a list
 * entry is what lets ingest run (QA-5 / R-F6).
 */
const attemptSend = (
  snapshot: SyncGateSnapshot,
  transport: { ingest: jest.Mock },
  entries: readonly SyncGateEntry[] = SYNC_GATE_ENTRIES,
): SyncGateDecision => {
  const decision = evaluateSyncGate(snapshot, entries);
  if (decision.allowed) {
    transport.ingest();
  }
  return decision;
};

const eligible = (
  overrides: Partial<SyncGateSnapshot> = {},
): SyncGateSnapshot => ({
  exists: true,
  is_synced_to_prms: false,
  result_status_id: ResultStatusEnum.APPROVED,
  pool_funding_alignment_green: true,
  primary_contract: {
    agreement_id: 'C-POOL-001',
    is_pool_funding_contributor: true,
  },
  indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  prms_policy_type_id: null,
  prms_sync_button_enabled: true,
  ...overrides,
});

describe('evaluateSyncGate', () => {
  let transport: { ingest: jest.Mock };

  beforeEach(() => {
    transport = { ingest: jest.fn() };
  });

  it('refuses an Approved aligned result whose primary contract is not a pool-funding contributor, naming that contract', () => {
    const snapshot = eligible({
      primary_contract: {
        agreement_id: 'C-NOT-POOL-77',
        is_pool_funding_contributor: false,
      },
    });

    const decision = attemptSend(snapshot, transport);

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('pool_funding_contributor');
    expect(decision.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(decision.description).toContain('C-NOT-POOL-77');
    expect(decision.description).toMatch(/pool-funding contributor/i);
    expect(decision.persistsRow).toBe(true);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('returns the earlier failure when two later conditions also fail', () => {
    const snapshot = eligible({
      result_status_id: ResultStatusEnum.DRAFT,
      primary_contract: {
        agreement_id: 'C-NOT-POOL-77',
        is_pool_funding_contributor: false,
      },
      indicator_id: IndicatorsEnum.INNOVATION_USE,
    });

    const decision = attemptSend(snapshot, transport);

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('approved');
    expect(decision.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(decision.description).toMatch(/not Approved/i);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('fires the contract refusal before an unmappable indicator when both fail', () => {
    const snapshot = eligible({
      primary_contract: {
        agreement_id: 'C-NOT-POOL-77',
        is_pool_funding_contributor: false,
      },
      indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
    });

    const decision = attemptSend(snapshot, transport);

    expect(decision.entryId).toBe('pool_funding_contributor');
    expect(decision.description).toContain('C-NOT-POOL-77');
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('refuses with 503 and persistsRow false when the PRMS sync button flag is off', () => {
    const decision = attemptSend(
      eligible({ prms_sync_button_enabled: false }),
      transport,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('feature_enabled');
    expect(decision.httpStatus).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(decision.description).toMatch(/PRMS sync/i);
    expect(decision.description).toMatch(/administrative pause/i);
    expect(decision.persistsRow).toBe(false);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('refuses with feature_enabled before result existence when the flag is off and the result does not exist', () => {
    const decision = attemptSend(
      eligible({ prms_sync_button_enabled: false, exists: false }),
      transport,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('feature_enabled');
    expect(decision.httpStatus).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('returns 404 without a log row when the result does not exist', () => {
    const decision = attemptSend(eligible({ exists: false }), transport);

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('result_exists');
    expect(decision.httpStatus).toBe(HttpStatus.NOT_FOUND);
    expect(decision.persistsRow).toBe(false);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('returns 409 without a log row when the result is already synced', () => {
    const decision = attemptSend(
      eligible({ is_synced_to_prms: true }),
      transport,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('not_already_synced');
    expect(decision.httpStatus).toBe(HttpStatus.CONFLICT);
    expect(decision.persistsRow).toBe(false);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('refuses an Approved result whose Pool Funding Alignment is not green-checked', () => {
    const decision = attemptSend(
      eligible({ pool_funding_alignment_green: false }),
      transport,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('alignment_green');
    expect(decision.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(decision.description).toBe(
      'Pool Funding Alignment is not green-checked',
    );
    expect(decision.persistsRow).toBe(true);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('gives unmappable, Innovation Use, and policy-type-1 refusals distinct descriptions and never sends', () => {
    const unmappable = attemptSend(
      eligible({ indicator_id: IndicatorsEnum.OICR }),
      transport,
    );
    const gatedUse = attemptSend(
      eligible({ indicator_id: IndicatorsEnum.INNOVATION_USE }),
      transport,
    );
    const gatedPolicy = attemptSend(
      eligible({
        indicator_id: IndicatorsEnum.POLICY_CHANGE,
        prms_policy_type_id: 1,
      }),
      transport,
    );

    expect(unmappable.entryId).toBe('indicator_mappable');
    expect(gatedPolicy.entryId).toBe('policy_type_not_gated');

    // Innovation Use is NO LONGER gated (entry lifted 2026-09-18): STAR now lets
    // the payload reach PRMS so PRMS's own contract decides whether the
    // investment declarations are required.
    expect(gatedUse.allowed).toBe(true);
    expect(gatedUse.entryId).toBe(null);

    expect(unmappable.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(gatedPolicy.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

    const descriptions = [unmappable.description, gatedPolicy.description];
    expect(new Set(descriptions).size).toBe(2);
    expect(unmappable.description).toMatch(/unmappable/i);
    expect(gatedPolicy.description).toMatch(/status_amount|amount/i);

    // The two still-gated types never reach transport; Innovation Use now does.
    expect(transport.ingest).toHaveBeenCalledTimes(1);
  });

  it('sends Innovation Use -- the gate entry was lifted, with no builder involved', () => {
    // Was: "lets Innovation Use send AFTER that list entry is removed". The entry
    // is now gone from SYNC_GATE_ENTRIES itself, so the assertion is direct.
    // Still proves family R-F6 / QA-5: lifting cost one list entry and zero
    // builder files, because the Innovation Use builder was always built.
    const snapshot = eligible({
      indicator_id: IndicatorsEnum.INNOVATION_USE,
    });

    const decision = attemptSend(snapshot, transport);

    expect(decision.allowed).toBe(true);
    expect(decision.entryId).toBe(null);
    expect(transport.ingest).toHaveBeenCalledTimes(1);
  });

  it('carries no gate entry that refuses a type unconditionally by indicator alone', () => {
    // The lifted entry's `fails` only asked "is this Innovation Use?" while its
    // description blamed usd_budget / is_determined -- a refusal whose stated
    // reason it never actually checked. This guards the shape, not the type:
    // no remaining entry may name an indicator without also reading a data field.
    const ids = SYNC_GATE_ENTRIES.map((entry) => entry.id);

    expect(ids).not.toContain('indicator_not_gated');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('still refuses Knowledge Product (indicator 3) when every other gate entry would pass', () => {
    const decision = attemptSend(
      eligible({ indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT }),
      transport,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('indicator_mappable');
    expect(decision.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(decision.description).toMatch(/Knowledge Product/i);
    expect(transport.ingest).not.toHaveBeenCalled();
  });

  it('lets an eligible Capacity Sharing result send', () => {
    const decision = attemptSend(eligible(), transport);

    expect(decision.allowed).toBe(true);
    expect(decision.entryId).toBe(null);
    expect(decision.httpStatus).toBe(null);
    expect(transport.ingest).toHaveBeenCalledTimes(1);
  });
});
