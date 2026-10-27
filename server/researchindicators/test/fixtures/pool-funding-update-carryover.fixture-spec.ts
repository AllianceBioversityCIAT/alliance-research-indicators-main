import { EntityManager } from 'typeorm';
import { dataSource } from '../../src/db/config/mysql/orm.test.config';
import { GreenCheckRepository } from '../../src/domain/entities/green-checks/repository/green-checks.repository';
import { AppConfig } from '../../src/domain/shared/utils/app-config.util';

/**
 * Real-MySQL fixture for T-02, `docs/specs/bilateral/pool-funding-update-carryover`.
 *
 * Calls the REAL `GreenCheckRepository.carryOverPoolFunding` inside a real
 * transaction, and the REAL `SP_versioning` / `SP_delete_result_version`
 * routines for the re-approval cases, against the scratch schema. Nothing
 * here asserts on emitted SQL strings (KZ-001 / KZ-017).
 *
 * `result_official_code` band (FP-45): `906_000` — the highest band claimed
 * by any sibling `*.fixture-spec.ts` header at the time of writing was
 * `905_000` (`sp-versioning-pool-funding`), so `906_000` is unused.
 * Report year `2118` — the highest sibling year is `2117`.
 *
 * Copy-path discipline (FP-48): every copied column carries a distinct
 * sentinel so a transposed column in an INSERT list is visible.
 */

type Row = Record<string, unknown>;

describe('Pool Funding carry-over on Update result (T-02)', () => {
  const uniqueSuffix = Date.now();
  const codeBase = 906_000_000_000_000 + uniqueSuffix;
  const codeCopy = codeBase + 0;
  const codeReplace = codeBase + 1;
  const codeMappingTwin = codeBase + 2;
  const codeCycles = codeBase + 3;
  const codeEmpty = codeBase + 4;
  const codeRemap = codeBase + 5;
  const allCodes = [
    codeCopy,
    codeReplace,
    codeMappingTwin,
    codeCycles,
    codeEmpty,
    codeRemap,
  ];

  const reportYear = 2118;
  const actingUserId = 906_001;
  let reportYearSeeded = false;

  const repository = new GreenCheckRepository(dataSource, {} as AppConfig);

  async function insertResult(code: number, isSnapshot: 0 | 1) {
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'STAR', ?, ?, NULL)`,
      [code, reportYear, isSnapshot],
    );
    return Number(result.insertId);
  }

  async function insertAlignment(
    resultId: number,
    hasContribution: number,
    isActive = 1,
  ) {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_alignment (is_active, result_id, has_contribution, created_by)
       VALUES (?, ?, ?, 1)`,
      [isActive, resultId, hasContribution],
    );
    return Number(result.insertId);
  }

  async function insertSp(
    alignmentId: number,
    spCode: string,
    spRole: string,
    isActive = 1,
  ) {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_alignment_sp (is_active, alignment_id, sp_code, sp_role, created_by)
       VALUES (?, ?, ?, ?, 1)`,
      [isActive, alignmentId, spCode, spRole],
    );
    return Number(result.insertId);
  }

  async function insertToc(resultId: number, spCode: string, isActive = 1) {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_toc_alignment
         (is_active, result_id, sp_code, aligns_with_toc, level, toc_result_id,
          indicator_id, quantitative_contribution, toc_result_title,
          indicator_description, unit_messurament, target_value, target_year,
          created_by)
       VALUES (?, ?, ?, 1, 'OUTCOME', 7311, 7322, 7.25, 'toc-title', 'ind-desc', 'unit-x', 'target-y', 2031, 1)`,
      [isActive, resultId, spCode],
    );
    return Number(result.insertId);
  }

  async function insertMapping(
    resultId: number,
    lever: string,
    indicator: string,
    isActive = 1,
    knowledgeProductId: number | null = null,
  ) {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_indicator_mapping
         (is_active, result_id, lever_code, indicator_code, indicator_type,
          result_knowledge_product_id, other_contribution_narrative, is_stale, created_by)
       VALUES (?, ?, ?, ?, 'type-kp', ?, 'narrative-z', 1, 1)`,
      [isActive, resultId, lever, indicator, knowledgeProductId],
    );
    return Number(result.insertId);
  }

  async function insertKnowledgeProduct(resultId: number) {
    await dataSource.query(
      `INSERT INTO result_knowledge_products (result_id) VALUES (?)`,
      [resultId],
    );
  }

  async function carryOver(liveId: number, snapshotId: number) {
    await dataSource.transaction((manager: EntityManager) =>
      repository.carryOverPoolFunding(
        manager,
        liveId,
        snapshotId,
        actingUserId,
      ),
    );
  }

  const alignmentsFor = (resultId: number): Promise<Row[]> =>
    dataSource.query(
      `SELECT * FROM result_pool_funding_alignment WHERE result_id = ? ORDER BY id`,
      [resultId],
    );
  const spsFor = (resultId: number): Promise<Row[]> =>
    dataSource.query(
      `SELECT sp.* FROM result_pool_funding_alignment_sp sp
         INNER JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id
        WHERE a.result_id = ? ORDER BY sp.id`,
      [resultId],
    );
  const tocsFor = (resultId: number): Promise<Row[]> =>
    dataSource.query(
      `SELECT * FROM result_pool_funding_toc_alignment WHERE result_id = ? ORDER BY id`,
      [resultId],
    );
  const mappingsFor = (resultId: number): Promise<Row[]> =>
    dataSource.query(
      `SELECT * FROM result_pool_funding_indicator_mapping WHERE result_id = ? ORDER BY id`,
      [resultId],
    );
  const active = (rows: Row[]) => rows.filter((r) => Number(r.is_active) === 1);
  const idsAndFlags = (rows: Row[]) =>
    rows.map((r) => `${r.id}:${Number(r.is_active)}`);

  const TOC_PAYLOAD = [
    'sp_code',
    'aligns_with_toc',
    'level',
    'toc_result_id',
    'indicator_id',
    'quantitative_contribution',
    'toc_result_title',
    'indicator_description',
    'unit_messurament',
    'target_value',
    'target_year',
  ];
  const MAPPING_PAYLOAD = [
    'lever_code',
    'indicator_code',
    'indicator_type',
    'other_contribution_narrative',
    'is_stale',
  ];
  const expectInsertAudit = (rows: Row[]) => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Number(row.created_by)).toBe(actingUserId);
      expect(Number(row.updated_by)).toBe(actingUserId);
      expect(row.deleted_at).toBeNull();
    }
  };
  const expectDeactivatedAudit = (row: Row | undefined) => {
    expect(Number(row?.is_active)).toBe(0);
    expect(row?.deleted_at).not.toBeNull();
    expect(Number(row?.updated_by)).toBe(actingUserId);
  };
  const pick = (row: Row, keys: string[]) =>
    Object.fromEntries(keys.map((k) => [k, String(row[k])]));

  beforeAll(async () => {
    await dataSource.initialize();
    const [existingYear] = await dataSource.query(
      `SELECT report_year FROM report_years WHERE report_year = ?`,
      [reportYear],
    );
    if (!existingYear) {
      await dataSource.query(
        `INSERT INTO report_years (report_year) VALUES (?)`,
        [reportYear],
      );
      reportYearSeeded = true;
    }
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    try {
      const rows: { result_id: number }[] = await dataSource.query(
        `SELECT result_id FROM results WHERE result_official_code IN (${allCodes.join(',')})`,
      );
      const ids = rows.map((r) => r.result_id).join(',');
      if (ids) {
        await dataSource.query(
          `DELETE sp FROM result_pool_funding_alignment_sp sp
             INNER JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id
            WHERE a.result_id IN (${ids})`,
        );
        for (const table of [
          'result_pool_funding_alignment',
          'result_pool_funding_toc_alignment',
          'result_pool_funding_indicator_mapping',
          'result_knowledge_products',
          'results',
        ]) {
          await dataSource.query(
            `DELETE FROM ${table} WHERE result_id IN (${ids})`,
          );
        }
      }
      if (reportYearSeeded) {
        await dataSource.query(
          `DELETE FROM report_years WHERE report_year = ?`,
          [reportYear],
        );
      }
    } finally {
      await dataSource.destroy();
    }
  });

  it('S-1: copies exactly the snapshot active rows onto the live result and leaves the snapshot untouched', async () => {
    const liveId = await insertResult(codeCopy, 0);
    const snapId = await insertResult(codeCopy, 1);
    // has_contribution = 0 here (S-2 copies a 1) so a hard-coded value is caught (FP-48)
    const snapAlignment = await insertAlignment(snapId, 0);
    await insertSp(snapAlignment, 'SP06', 'PRIMARY');
    await insertSp(snapAlignment, 'SP09', 'CONTRIBUTING');
    await insertSp(snapAlignment, 'SP03', 'CONTRIBUTING', 0);
    await insertToc(snapId, 'SP06');
    await insertToc(snapId, 'SP03', 0);
    await insertMapping(snapId, 'L-COPY', 'I-COPY');

    const snapBefore = {
      alignments: idsAndFlags(await alignmentsFor(snapId)),
      sps: idsAndFlags(await spsFor(snapId)),
      tocs: idsAndFlags(await tocsFor(snapId)),
      mappings: idsAndFlags(await mappingsFor(snapId)),
    };

    await carryOver(liveId, snapId);

    const liveAlignments = await alignmentsFor(liveId);
    expect(liveAlignments).toHaveLength(1);
    expect(Number(liveAlignments[0].is_active)).toBe(1);
    expect(Number(liveAlignments[0].has_contribution)).toBe(0);
    expectInsertAudit(liveAlignments);

    const liveSps = await spsFor(liveId);
    expect(
      liveSps.map((s) => [s.sp_code, s.sp_role, Number(s.is_active)]),
    ).toEqual([
      ['SP06', 'PRIMARY', 1],
      ['SP09', 'CONTRIBUTING', 1],
    ]);
    expect(liveSps.every((s) => s.alignment_id === liveAlignments[0].id)).toBe(
      true,
    );
    expectInsertAudit(liveSps);

    const snapTocs = active(await tocsFor(snapId));
    const liveTocs = await tocsFor(liveId);
    expect(liveTocs).toHaveLength(1);
    expect(pick(liveTocs[0], TOC_PAYLOAD)).toEqual(
      pick(snapTocs[0], TOC_PAYLOAD),
    );
    expectInsertAudit(liveTocs);

    const snapMappings = await mappingsFor(snapId);
    const liveMappings = await mappingsFor(liveId);
    expect(liveMappings).toHaveLength(1);
    expect(pick(liveMappings[0], MAPPING_PAYLOAD)).toEqual(
      pick(snapMappings[0], MAPPING_PAYLOAD),
    );
    expectInsertAudit(liveMappings);

    expect({
      alignments: idsAndFlags(await alignmentsFor(snapId)),
      sps: idsAndFlags(await spsFor(snapId)),
      tocs: idsAndFlags(await tocsFor(snapId)),
      mappings: idsAndFlags(await mappingsFor(snapId)),
    }).toEqual(snapBefore);
  });

  it('S-2: soft-deactivates the live alignment, SP and ToC rows it replaces and keeps one active alignment', async () => {
    const liveId = await insertResult(codeReplace, 0);
    const liveAlignment = await insertAlignment(liveId, 0);
    const liveSp = await insertSp(liveAlignment, 'SP01', 'PRIMARY');
    const liveToc = await insertToc(liveId, 'SP01');
    const snapId = await insertResult(codeReplace, 1);
    const snapAlignment = await insertAlignment(snapId, 1);
    await insertSp(snapAlignment, 'SP06', 'PRIMARY');
    await insertToc(snapId, 'SP06');

    await carryOver(liveId, snapId);

    const alignments = await alignmentsFor(liveId);
    expectDeactivatedAudit(alignments.find((a) => a.id === liveAlignment));
    expect(active(alignments)).toHaveLength(1);
    expect(Number(active(alignments)[0].has_contribution)).toBe(1);

    const sps = await spsFor(liveId);
    expectDeactivatedAudit(sps.find((s) => s.id === liveSp));
    expect(active(sps).map((s) => s.sp_code)).toEqual(['SP06']);

    const tocs = await tocsFor(liveId);
    expectDeactivatedAudit(tocs.find((t) => t.id === liveToc));
    expect(active(tocs).map((t) => t.sp_code)).toEqual(['SP06']);
  });

  it('S-2b: a live mapping sharing a key with the snapshot (active and inactive twin) is replaced, and the result can be re-approved with SP_versioning', async () => {
    const liveId = await insertResult(codeMappingTwin, 0);
    await insertMapping(liveId, 'L-K', 'I-K', 1);
    await insertMapping(liveId, 'L-K', 'I-K', 0);
    const snapId = await insertResult(codeMappingTwin, 1);
    await insertAlignment(snapId, 1);
    await insertMapping(snapId, 'L-K', 'I-K', 1);
    await insertMapping(snapId, 'L-OTHER', 'I-OTHER', 0);
    const snapMappingsBefore = idsAndFlags(await mappingsFor(snapId));

    await carryOver(liveId, snapId);

    const liveMappings = await mappingsFor(liveId);
    expect(
      liveMappings.map((m) => [m.lever_code, Number(m.is_active)]),
    ).toEqual([['L-K', 1]]);
    expect(idsAndFlags(await mappingsFor(snapId))).toEqual(snapMappingsBefore);

    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      codeMappingTwin,
      reportYear,
    ]);
    await expect(
      dataSource.query(`CALL SP_versioning(?)`, [codeMappingTwin]),
    ).resolves.toBeDefined();
    expect(
      (await mappingsFor(liveId)).map((m) => [
        m.lever_code,
        Number(m.is_active),
      ]),
    ).toEqual([['L-K', 0]]);
  });

  it('S-8: approve → carry-over → re-approve → carry-over runs twice with the real routines and keeps the KP link on the live result', async () => {
    const liveId = await insertResult(codeCycles, 0);
    await insertKnowledgeProduct(liveId);
    const alignment = await insertAlignment(liveId, 1);
    await insertSp(alignment, 'SP06', 'PRIMARY');
    await insertToc(liveId, 'SP06');
    await insertMapping(liveId, 'L-C', 'I-C', 1, liveId);

    const snapshotOf = async (): Promise<number> => {
      const [row] = await dataSource.query(
        `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE AND is_active = TRUE`,
        [codeCycles],
      );
      return Number(row.result_id);
    };
    const assertLiveCarried = async () => {
      expect(active(await alignmentsFor(liveId))).toHaveLength(1);
      expect(active(await spsFor(liveId)).map((s) => s.sp_code)).toEqual([
        'SP06',
      ]);
      expect(active(await tocsFor(liveId)).map((t) => t.sp_code)).toEqual([
        'SP06',
      ]);
      const mappings = await mappingsFor(liveId);
      expect(mappings).toHaveLength(1);
      expect(Number(mappings[0].is_active)).toBe(1);
      expect(Number(mappings[0].result_knowledge_product_id)).toBe(liveId);
    };

    await dataSource.query(`CALL SP_versioning(?)`, [codeCycles]);
    await carryOver(liveId, await snapshotOf());
    await assertLiveCarried();

    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      codeCycles,
      reportYear,
    ]);
    await dataSource.query(`CALL SP_versioning(?)`, [codeCycles]);
    await carryOver(liveId, await snapshotOf());
    await assertLiveCarried();
  });

  it('S-4: a version with no Pool Funding rows leaves the live section empty', async () => {
    const liveId = await insertResult(codeEmpty, 0);
    await insertAlignment(liveId, 1);
    await insertToc(liveId, 'SP02');
    await insertMapping(liveId, 'L-E', 'I-E');
    const snapId = await insertResult(codeEmpty, 1);

    await carryOver(liveId, snapId);

    expect(active(await alignmentsFor(liveId))).toHaveLength(0);
    expect(active(await tocsFor(liveId))).toHaveLength(0);
    expect(await mappingsFor(liveId)).toHaveLength(0);
  });

  it('S-5: a non-null mapping section link is rewritten to the live result id and null links stay null', async () => {
    const liveId = await insertResult(codeRemap, 0);
    await insertKnowledgeProduct(liveId);
    const snapId = await insertResult(codeRemap, 1);
    await insertKnowledgeProduct(snapId);
    await insertMapping(snapId, 'L-R', 'I-R', 1, snapId);

    await carryOver(liveId, snapId);

    const [mapping] = await mappingsFor(liveId);
    expect(Number(mapping.result_knowledge_product_id)).toBe(liveId);
    expect(mapping.result_capacity_sharing_id).toBeNull();
    expect(mapping.result_policy_change_id).toBeNull();
    expect(mapping.result_innovation_dev_id).toBeNull();
  });
});
