import { dataSource } from '../../src/db/config/mysql/orm.test.config';

/**
 * Regression fixture for T-01,
 * `docs/specs/bugfix/pool-funding-alignment-versioning`.
 *
 * Calls the REAL `SP_versioning`, `SP_delete_result_version` and
 * `full_delete_result_version` routines against the scratch MySQL schema —
 * never asserts on emitted SQL strings or a mock (KZ-001), the same
 * stance `sp-versioning-link-results.fixture-spec.ts` established.
 *
 * `result_official_code` band (FP-45): `905_000` — the highest band
 * claimed by any sibling `*.fixture-spec.ts` header at the time of writing
 * was `904_000` (`sp-versioning-link-results`), so `905_000` is unused.
 * Report year `2117` — every sibling file's own claimed year runs from
 * `2094` through `2116`; `2117` is unused.
 *
 * Columns were read from the scratch schema (`SHOW CREATE TABLE`, 2026-09-16)
 * before any INSERT was written. `result_pool_funding_alignment_sp` has no
 * `result_id` — it is reached only through `alignment_id`. Generated
 * columns (`active_primary_alignment`, `active_result_sp`) are never
 * written.
 *
 * ## Case 1 — copy
 *
 * RED on current HEAD: `SP_versioning` has no pool-funding block, so the
 * assertion that an alignment row now exists on the new snapshot's
 * `result_id` fails. Required red for R-PFV-001.
 *
 * ## Case 2 — negative clauses of R-PFV-001
 *
 * GREEN on HEAD (nothing is copied at all). After T-02: inactive rows stay
 * off the snapshot, and every copied `_sp` row points at the NEW alignment.
 *
 * ## Case 3 — source deactivation (R-PFV-002)
 *
 * RED on HEAD: source rows stay `is_active = 1` because no deactivation
 * block exists.
 *
 * ## Case 4 — empty section
 *
 * GREEN on HEAD (`SP_versioning` has zero UPDATEs today). After T-02: the
 * `ROW_COUNT()` guard must keep it green.
 *
 * ## Case 5 — duplicate-snapshot guard (NFR-PFV-003)
 *
 * GREEN on HEAD (the `SIGNAL 45001` already exists). After T-02: a rejected
 * second call must not deactivate or resurrect.
 *
 * ## Case 6 — version delete (R-PFV-003 first scenario)
 *
 * RED on HEAD: the premise assertion (snapshot carries the copied rows)
 * fails because nothing was copied — without that premise the delete would
 * pass identically whether the copy landed or silently did not. After T-02
 * and before T-03 this case fails with MySQL 1451 instead.
 *
 * ## Case 7 — re-approval round-trip, pins AR-1 (R-PFV-003 second scenario)
 *
 * GREEN on HEAD (trivially: nothing is copied, so the second snapshot
 * carries zero pool-funding rows). Ruled behaviour of Decision 4, not a
 * bug. Real gate: stays green after T-02 + T-03 land.
 *
 * ## Case 8 — hard delete (R-PFV-003 third scenario)
 *
 * RED on HEAD: `full_delete_result_version` has no pool-funding DELETE
 * blocks, so `DELETE FROM results` raises MySQL 1451
 * (`ER_ROW_IS_REFERENCED_2`) against `fk_rpfa_result` / siblings.
 */

type AlignmentRow = {
  id: number;
  result_id: number;
  has_contribution: number;
  is_active: number;
  created_by: number | null;
  created_at: Date;
  deleted_at: Date | null;
};

type AlignmentSpRow = {
  id: number;
  alignment_id: number;
  sp_code: string;
  sp_role: string | null;
  is_active: number;
  created_by: number | null;
};

type TocRow = {
  id: number;
  result_id: number;
  sp_code: string;
  aligns_with_toc: number;
  level: string | null;
  toc_result_id: number | null;
  indicator_id: number | null;
  quantitative_contribution: string | number | null;
  toc_result_title: string | null;
  indicator_description: string | null;
  unit_messurament: string | null;
  target_value: string | null;
  target_year: number | null;
  is_active: number;
  created_by: number | null;
};

type MappingRow = {
  id: number;
  result_id: number;
  lever_code: string;
  indicator_code: string;
  indicator_type: string;
  other_contribution_narrative: string | null;
  is_stale: number;
  is_active: number;
  created_by: number | null;
};

describe('SP_versioning pool funding regression fixture (T-01)', () => {
  const uniqueSuffix = Date.now();
  const officialCodeBase = 905_000_000_000_000 + uniqueSuffix;
  const officialCodeCopy = officialCodeBase + 0;
  const officialCodeWitness = officialCodeBase + 1;
  const officialCodeInactive = officialCodeBase + 2;
  const officialCodeDeactivate = officialCodeBase + 3;
  const officialCodeEmpty = officialCodeBase + 4;
  const officialCodeDuplicate = officialCodeBase + 5;
  const officialCodeVersionDelete = officialCodeBase + 6;
  const officialCodeReapproval = officialCodeBase + 7;
  const officialCodeHardDelete = officialCodeBase + 8;

  const reportYear = 2117;

  const allOfficialCodes = [
    officialCodeCopy,
    officialCodeWitness,
    officialCodeInactive,
    officialCodeDeactivate,
    officialCodeEmpty,
    officialCodeDuplicate,
    officialCodeVersionDelete,
    officialCodeReapproval,
    officialCodeHardDelete,
  ];

  let reportYearSeeded = false;

  let copyResultId: number;
  let copyAlignmentId: number;
  let copySpPrimaryId: number;
  let copySpContributingId: number;
  let copyTocId: number;
  let copyMappingId: number;

  let witnessResultId: number;
  let witnessAlignmentId: number;
  let witnessSpId: number;
  let witnessTocId: number;
  let witnessMappingId: number;

  let inactiveResultId: number;
  let inactiveActiveAlignmentId: number;
  let inactiveFalseAlignmentId: number;
  let inactiveFalseSpId: number;
  let inactiveFalseTocId: number;
  let inactiveFalseMappingId: number;

  let deactivateResultId: number;
  let deactivateAlignmentId: number;
  let deactivateSpPrimaryId: number;
  let deactivateSpContributingId: number;
  let deactivateTocId: number;
  let deactivateMappingId: number;
  let deactivateAlignmentCreatedAt: Date;

  let emptyResultId: number;

  let duplicateResultId: number;

  let versionDeleteResultId: number;
  let versionDeleteLiveInactiveAlignmentId: number;
  let versionDeleteLiveInactiveSpId: number;
  let versionDeleteLiveInactiveTocId: number;
  let versionDeleteLiveInactiveMappingId: number;

  let reapprovalResultId: number;

  let hardDeleteResultId: number;

  async function insertResult(officialCode: number): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'STAR', ?, 0, NULL)`,
      [officialCode, reportYear],
    );
    return result.insertId;
  }

  async function insertAlignment(
    resultId: number,
    hasContribution: number,
    createdBy: number,
    isActive = 1,
  ): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_alignment
         (is_active, result_id, has_contribution, created_by)
       VALUES (?, ?, ?, ?)`,
      [isActive, resultId, hasContribution, createdBy],
    );
    return result.insertId;
  }

  async function insertSp(
    alignmentId: number,
    spCode: string,
    spRole: string,
    createdBy: number,
    isActive = 1,
  ): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_alignment_sp
         (is_active, alignment_id, sp_code, sp_role, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [isActive, alignmentId, spCode, spRole, createdBy],
    );
    return result.insertId;
  }

  async function insertToc(
    resultId: number,
    createdBy: number,
    fields: {
      sp_code: string;
      aligns_with_toc: number;
      level: string;
      toc_result_id: number;
      indicator_id: number;
      quantitative_contribution: number;
      toc_result_title: string;
      indicator_description: string;
      unit_messurament: string;
      target_value: string;
      target_year: number;
    },
    isActive = 1,
  ): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_toc_alignment
         (is_active, result_id, sp_code, aligns_with_toc, level, toc_result_id,
          indicator_id, quantitative_contribution, toc_result_title,
          indicator_description, unit_messurament, target_value, target_year,
          created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        isActive,
        resultId,
        fields.sp_code,
        fields.aligns_with_toc,
        fields.level,
        fields.toc_result_id,
        fields.indicator_id,
        fields.quantitative_contribution,
        fields.toc_result_title,
        fields.indicator_description,
        fields.unit_messurament,
        fields.target_value,
        fields.target_year,
        createdBy,
      ],
    );
    return result.insertId;
  }

  async function insertMapping(
    resultId: number,
    createdBy: number,
    fields: {
      lever_code: string;
      indicator_code: string;
      indicator_type: string;
      other_contribution_narrative: string;
      is_stale: number;
    },
    isActive = 1,
  ): Promise<number> {
    const result = await dataSource.query(
      `INSERT INTO result_pool_funding_indicator_mapping
         (is_active, result_id, lever_code, indicator_code, indicator_type,
          other_contribution_narrative, is_stale, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        isActive,
        resultId,
        fields.lever_code,
        fields.indicator_code,
        fields.indicator_type,
        fields.other_contribution_narrative,
        fields.is_stale,
        createdBy,
      ],
    );
    return result.insertId;
  }

  async function snapshotResultId(officialCode: number): Promise<number> {
    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCode],
    );
    expect(snapshot).toBeDefined();
    return snapshot.result_id;
  }

  async function alignmentsFor(
    resultId: number,
    activeOnly = false,
  ): Promise<AlignmentRow[]> {
    return dataSource.query(
      `SELECT id, result_id, has_contribution, is_active, created_by, created_at, deleted_at
         FROM result_pool_funding_alignment
        WHERE result_id = ? ${activeOnly ? 'AND is_active = 1' : ''}
        ORDER BY id`,
      [resultId],
    );
  }

  async function spsFor(resultId: number): Promise<AlignmentSpRow[]> {
    return dataSource.query(
      `SELECT sp.id, sp.alignment_id, sp.sp_code, sp.sp_role, sp.is_active, sp.created_by
         FROM result_pool_funding_alignment_sp sp
         INNER JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id
        WHERE a.result_id = ?
        ORDER BY sp.sp_code, sp.id`,
      [resultId],
    );
  }

  async function tocsFor(resultId: number): Promise<TocRow[]> {
    return dataSource.query(
      `SELECT id, result_id, sp_code, aligns_with_toc, level, toc_result_id,
              indicator_id, quantitative_contribution, toc_result_title,
              indicator_description, unit_messurament, target_value, target_year,
              is_active, created_by
         FROM result_pool_funding_toc_alignment
        WHERE result_id = ?
        ORDER BY id`,
      [resultId],
    );
  }

  async function mappingsFor(resultId: number): Promise<MappingRow[]> {
    return dataSource.query(
      `SELECT id, result_id, lever_code, indicator_code, indicator_type,
              other_contribution_narrative, is_stale, is_active, created_by
         FROM result_pool_funding_indicator_mapping
        WHERE result_id = ?
        ORDER BY id`,
      [resultId],
    );
  }

  async function assertWitnessUntouched(): Promise<void> {
    const alignments = await alignmentsFor(witnessResultId);
    expect(alignments).toHaveLength(1);
    expect(alignments[0].id).toBe(witnessAlignmentId);
    expect(Number(alignments[0].is_active)).toBe(1);
    expect(Number(alignments[0].has_contribution)).toBe(0);
    expect(Number(alignments[0].created_by)).toBe(62001);

    const sps = await spsFor(witnessResultId);
    expect(sps).toHaveLength(1);
    expect(sps[0].id).toBe(witnessSpId);
    expect(Number(sps[0].is_active)).toBe(1);
    expect(sps[0].sp_code).toBe('SP01');
    expect(sps[0].sp_role).toBe('PRIMARY');

    const tocs = await tocsFor(witnessResultId);
    expect(tocs).toHaveLength(1);
    expect(tocs[0].id).toBe(witnessTocId);
    expect(Number(tocs[0].is_active)).toBe(1);
    expect(Number(tocs[0].toc_result_id)).toBe(919191);

    const mappings = await mappingsFor(witnessResultId);
    expect(mappings).toHaveLength(1);
    expect(mappings[0].id).toBe(witnessMappingId);
    expect(Number(mappings[0].is_active)).toBe(1);
    expect(mappings[0].lever_code).toBe('L-WITNESS');
  }

  async function seedCanonicalSection(
    resultId: number,
    createdByBase: number,
  ): Promise<{
    alignmentId: number;
    spPrimaryId: number;
    spContributingId: number;
    tocId: number;
    mappingId: number;
  }> {
    const alignmentId = await insertAlignment(resultId, 1, createdByBase);
    const spPrimaryId = await insertSp(
      alignmentId,
      'SP06',
      'PRIMARY',
      createdByBase + 1,
    );
    const spContributingId = await insertSp(
      alignmentId,
      'SP09',
      'CONTRIBUTING',
      createdByBase + 2,
    );
    const tocId = await insertToc(resultId, createdByBase + 3, {
      sp_code: 'SP06',
      aligns_with_toc: 1,
      level: 'AO',
      toc_result_id: 4242,
      indicator_id: 8787,
      quantitative_contribution: 12.5,
      toc_result_title: 'T-01 PFV toc title',
      indicator_description: 'T-01 PFV indicator desc',
      unit_messurament: 'hectares',
      target_value: '100',
      target_year: 2030,
    });
    const mappingId = await insertMapping(resultId, createdByBase + 4, {
      lever_code: 'L1',
      indicator_code: 'IND-COPY',
      indicator_type: 'QUANTITATIVE',
      other_contribution_narrative: 'copy-path-narrative',
      is_stale: 0,
    });
    return {
      alignmentId,
      spPrimaryId,
      spContributingId,
      tocId,
      mappingId,
    };
  }

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

    copyResultId = await insertResult(officialCodeCopy);
    const copySeed = await seedCanonicalSection(copyResultId, 61001);
    copyAlignmentId = copySeed.alignmentId;
    copySpPrimaryId = copySeed.spPrimaryId;
    copySpContributingId = copySeed.spContributingId;
    copyTocId = copySeed.tocId;
    copyMappingId = copySeed.mappingId;

    witnessResultId = await insertResult(officialCodeWitness);
    witnessAlignmentId = await insertAlignment(witnessResultId, 0, 62001);
    witnessSpId = await insertSp(witnessAlignmentId, 'SP01', 'PRIMARY', 62002);
    witnessTocId = await insertToc(witnessResultId, 62003, {
      sp_code: 'SP01',
      aligns_with_toc: 0,
      level: 'WP',
      toc_result_id: 919191,
      indicator_id: 808080,
      quantitative_contribution: 77.77,
      toc_result_title: 'witness toc',
      indicator_description: 'witness indicator',
      unit_messurament: 'people',
      target_value: '7',
      target_year: 2027,
    });
    witnessMappingId = await insertMapping(witnessResultId, 62004, {
      lever_code: 'L-WITNESS',
      indicator_code: 'IND-WITNESS',
      indicator_type: 'OTHER',
      other_contribution_narrative: 'witness-must-not-move',
      is_stale: 0,
    });

    inactiveResultId = await insertResult(officialCodeInactive);
    inactiveActiveAlignmentId = await insertAlignment(
      inactiveResultId,
      1,
      63001,
    );
    await insertSp(inactiveActiveAlignmentId, 'SP06', 'PRIMARY', 63002);
    await insertSp(inactiveActiveAlignmentId, 'SP09', 'CONTRIBUTING', 63003);
    inactiveFalseSpId = await insertSp(
      inactiveActiveAlignmentId,
      'SP07',
      'CONTRIBUTING',
      63004,
      0,
    );
    inactiveFalseAlignmentId = await insertAlignment(
      inactiveResultId,
      0,
      63005,
      0,
    );
    await insertToc(inactiveResultId, 63006, {
      sp_code: 'SP06',
      aligns_with_toc: 1,
      level: 'AO',
      toc_result_id: 1111,
      indicator_id: 2222,
      quantitative_contribution: 1.25,
      toc_result_title: 'inactive-case active toc',
      indicator_description: 'inactive-case active indicator',
      unit_messurament: 'tonnes',
      target_value: '10',
      target_year: 2028,
    });
    inactiveFalseTocId = await insertToc(
      inactiveResultId,
      63007,
      {
        sp_code: 'SP07',
        aligns_with_toc: 0,
        level: 'EO',
        toc_result_id: 3333,
        indicator_id: 4444,
        quantitative_contribution: 0.5,
        toc_result_title: 'inactive toc',
        indicator_description: 'inactive indicator',
        unit_messurament: 'kg',
        target_value: '0',
        target_year: 2025,
      },
      0,
    );
    await insertMapping(inactiveResultId, 63008, {
      lever_code: 'L-ACTIVE',
      indicator_code: 'IND-ACTIVE',
      indicator_type: 'QUANTITATIVE',
      other_contribution_narrative: 'inactive-case active mapping',
      is_stale: 0,
    });
    inactiveFalseMappingId = await insertMapping(
      inactiveResultId,
      63009,
      {
        lever_code: 'L-INACTIVE',
        indicator_code: 'IND-INACTIVE',
        indicator_type: 'NARRATIVE',
        other_contribution_narrative: 'must-not-copy',
        is_stale: 1,
      },
      0,
    );

    deactivateResultId = await insertResult(officialCodeDeactivate);
    const deactivateSeed = await seedCanonicalSection(
      deactivateResultId,
      64001,
    );
    deactivateAlignmentId = deactivateSeed.alignmentId;
    deactivateSpPrimaryId = deactivateSeed.spPrimaryId;
    deactivateSpContributingId = deactivateSeed.spContributingId;
    deactivateTocId = deactivateSeed.tocId;
    deactivateMappingId = deactivateSeed.mappingId;
    const [deactivateAlignment] = await alignmentsFor(deactivateResultId, true);
    deactivateAlignmentCreatedAt = deactivateAlignment.created_at;

    emptyResultId = await insertResult(officialCodeEmpty);

    duplicateResultId = await insertResult(officialCodeDuplicate);
    await seedCanonicalSection(duplicateResultId, 65001);

    versionDeleteResultId = await insertResult(officialCodeVersionDelete);
    await seedCanonicalSection(versionDeleteResultId, 66001);
    versionDeleteLiveInactiveAlignmentId = await insertAlignment(
      versionDeleteResultId,
      0,
      66010,
      0,
    );
    versionDeleteLiveInactiveSpId = await insertSp(
      versionDeleteLiveInactiveAlignmentId,
      'SP03',
      'CONTRIBUTING',
      66011,
      0,
    );
    versionDeleteLiveInactiveTocId = await insertToc(
      versionDeleteResultId,
      66012,
      {
        sp_code: 'SP03',
        aligns_with_toc: 0,
        level: 'WP',
        toc_result_id: 5555,
        indicator_id: 6666,
        quantitative_contribution: 3.25,
        toc_result_title: 'live leftover toc',
        indicator_description: 'live leftover indicator',
        unit_messurament: 'ha',
        target_value: '3',
        target_year: 2024,
      },
      0,
    );
    versionDeleteLiveInactiveMappingId = await insertMapping(
      versionDeleteResultId,
      66013,
      {
        lever_code: 'L-LIVE',
        indicator_code: 'IND-LIVE',
        indicator_type: 'OTHER',
        other_contribution_narrative: 'live leftover mapping',
        is_stale: 1,
      },
      0,
    );

    reapprovalResultId = await insertResult(officialCodeReapproval);
    await seedCanonicalSection(reapprovalResultId, 67001);

    hardDeleteResultId = await insertResult(officialCodeHardDelete);
    await seedCanonicalSection(hardDeleteResultId, 68001);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    try {
      const resultRows: { result_id: number }[] = await dataSource.query(
        `SELECT result_id FROM results WHERE result_official_code IN (${allOfficialCodes.join(',')})`,
      );
      const resultIds = resultRows.map((r) => r.result_id);
      if (resultIds.length) {
        const idList = resultIds.join(',');
        await dataSource.query(
          `DELETE sp FROM result_pool_funding_alignment_sp sp
             INNER JOIN result_pool_funding_alignment a ON a.id = sp.alignment_id
            WHERE a.result_id IN (${idList})`,
        );
        await dataSource.query(
          `DELETE FROM result_pool_funding_alignment WHERE result_id IN (${idList})`,
        );
        await dataSource.query(
          `DELETE FROM result_pool_funding_toc_alignment WHERE result_id IN (${idList})`,
        );
        await dataSource.query(
          `DELETE FROM result_pool_funding_indicator_mapping WHERE result_id IN (${idList})`,
        );
        await dataSource.query(
          `DELETE FROM results WHERE result_id IN (${idList})`,
        );
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

  it('copies the active pool funding rows onto the new snapshot, remapping result_id and alignment_id, preserving payload columns, with a fresh PK on every copied row', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeCopy]);

    const newResultId = await snapshotResultId(officialCodeCopy);
    expect(newResultId).not.toBe(copyResultId);

    const copiedAlignments = await alignmentsFor(newResultId);
    expect(copiedAlignments).toHaveLength(1);
    const copiedAlignment = copiedAlignments[0];
    expect(Number(copiedAlignment.has_contribution)).toBe(1);
    expect(Number(copiedAlignment.created_by)).toBe(61001);
    expect(copiedAlignment.id).not.toBe(copyAlignmentId);

    const copiedSps = await spsFor(newResultId);
    expect(copiedSps).toHaveLength(2);
    expect(copiedSps[0].sp_code).toBe('SP06');
    expect(copiedSps[0].sp_role).toBe('PRIMARY');
    expect(copiedSps[0].alignment_id).toBe(copiedAlignment.id);
    expect(copiedSps[0].id).not.toBe(copySpPrimaryId);
    expect(Number(copiedSps[0].created_by)).toBe(61002);
    expect(copiedSps[1].sp_code).toBe('SP09');
    expect(copiedSps[1].sp_role).toBe('CONTRIBUTING');
    expect(copiedSps[1].alignment_id).toBe(copiedAlignment.id);
    expect(copiedSps[1].id).not.toBe(copySpContributingId);
    expect(Number(copiedSps[1].created_by)).toBe(61003);

    const copiedTocs = await tocsFor(newResultId);
    expect(copiedTocs).toHaveLength(1);
    expect(copiedTocs[0].id).not.toBe(copyTocId);
    expect(copiedTocs[0].result_id).toBe(newResultId);
    expect(copiedTocs[0].sp_code).toBe('SP06');
    expect(Number(copiedTocs[0].aligns_with_toc)).toBe(1);
    expect(copiedTocs[0].level).toBe('AO');
    expect(Number(copiedTocs[0].toc_result_id)).toBe(4242);
    expect(Number(copiedTocs[0].indicator_id)).toBe(8787);
    expect(Number(copiedTocs[0].quantitative_contribution)).toBe(12.5);
    expect(copiedTocs[0].toc_result_title).toBe('T-01 PFV toc title');
    expect(copiedTocs[0].indicator_description).toBe('T-01 PFV indicator desc');
    expect(copiedTocs[0].unit_messurament).toBe('hectares');
    expect(copiedTocs[0].target_value).toBe('100');
    expect(Number(copiedTocs[0].target_year)).toBe(2030);
    expect(Number(copiedTocs[0].created_by)).toBe(61004);

    const copiedMappings = await mappingsFor(newResultId);
    expect(copiedMappings).toHaveLength(1);
    expect(copiedMappings[0].id).not.toBe(copyMappingId);
    expect(copiedMappings[0].result_id).toBe(newResultId);
    expect(copiedMappings[0].lever_code).toBe('L1');
    expect(copiedMappings[0].indicator_code).toBe('IND-COPY');
    expect(copiedMappings[0].indicator_type).toBe('QUANTITATIVE');
    expect(copiedMappings[0].other_contribution_narrative).toBe(
      'copy-path-narrative',
    );
    expect(Number(copiedMappings[0].is_stale)).toBe(0);
    expect(Number(copiedMappings[0].created_by)).toBe(61005);

    await assertWitnessUntouched();
  }, 30000);

  it('does not copy is_active = FALSE alignment, _sp, ToC or mapping rows, and no copied _sp row carries the source alignment_id', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeInactive]);

    const newResultId = await snapshotResultId(officialCodeInactive);
    expect(newResultId).not.toBe(inactiveResultId);

    const copiedAlignments = await alignmentsFor(newResultId);
    expect(
      copiedAlignments.find((row) => row.id === inactiveFalseAlignmentId),
    ).toBeUndefined();
    copiedAlignments.forEach((row) => {
      expect(Number(row.is_active)).toBe(1);
      expect(row.id).not.toBe(inactiveFalseAlignmentId);
      expect(row.id).not.toBe(inactiveActiveAlignmentId);
    });

    const copiedSps = await spsFor(newResultId);
    expect(
      copiedSps.find((row) => row.id === inactiveFalseSpId),
    ).toBeUndefined();
    expect(copiedSps.find((row) => row.sp_code === 'SP07')).toBeUndefined();
    copiedSps.forEach((row) => {
      expect(row.alignment_id).not.toBe(inactiveActiveAlignmentId);
      expect(row.id).not.toBe(inactiveFalseSpId);
    });

    const copiedTocs = await tocsFor(newResultId);
    expect(
      copiedTocs.find((row) => row.id === inactiveFalseTocId),
    ).toBeUndefined();
    copiedTocs.forEach((row) => {
      expect(row.sp_code).not.toBe('SP07');
      expect(row.id).not.toBe(inactiveFalseTocId);
    });

    const copiedMappings = await mappingsFor(newResultId);
    expect(
      copiedMappings.find((row) => row.id === inactiveFalseMappingId),
    ).toBeUndefined();
    copiedMappings.forEach((row) => {
      expect(row.lever_code).not.toBe('L-INACTIVE');
      expect(row.id).not.toBe(inactiveFalseMappingId);
    });
  }, 30000);

  it('deactivates the source result pool funding rows in place after the copy, without hard-deleting them or touching the second seeded result', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeDeactivate]);

    const activeAlignments = await alignmentsFor(deactivateResultId, true);
    expect(activeAlignments).toHaveLength(0);
    const activeSps = (await spsFor(deactivateResultId)).filter(
      (row) => Number(row.is_active) === 1,
    );
    expect(activeSps).toHaveLength(0);
    const activeTocs = (await tocsFor(deactivateResultId)).filter(
      (row) => Number(row.is_active) === 1,
    );
    expect(activeTocs).toHaveLength(0);
    const activeMappings = (await mappingsFor(deactivateResultId)).filter(
      (row) => Number(row.is_active) === 1,
    );
    expect(activeMappings).toHaveLength(0);

    const [sourceAlignment] = await dataSource.query(
      `SELECT id, result_id, is_active, created_at, deleted_at
         FROM result_pool_funding_alignment WHERE id = ?`,
      [deactivateAlignmentId],
    );
    expect(sourceAlignment).toBeDefined();
    expect(sourceAlignment.result_id).toBe(deactivateResultId);
    expect(Number(sourceAlignment.is_active)).toBe(0);
    expect(new Date(sourceAlignment.created_at).getTime()).toBe(
      new Date(deactivateAlignmentCreatedAt).getTime(),
    );
    expect(sourceAlignment.deleted_at).not.toBeNull();

    const sourceSps = await dataSource.query(
      `SELECT id, is_active FROM result_pool_funding_alignment_sp WHERE id IN (?, ?)`,
      [deactivateSpPrimaryId, deactivateSpContributingId],
    );
    expect(sourceSps).toHaveLength(2);
    sourceSps.forEach((row: { is_active: number }) => {
      expect(Number(row.is_active)).toBe(0);
    });

    const [sourceToc] = await dataSource.query(
      `SELECT id, result_id, is_active FROM result_pool_funding_toc_alignment WHERE id = ?`,
      [deactivateTocId],
    );
    expect(sourceToc).toBeDefined();
    expect(sourceToc.result_id).toBe(deactivateResultId);
    expect(Number(sourceToc.is_active)).toBe(0);

    const [sourceMapping] = await dataSource.query(
      `SELECT id, result_id, is_active FROM result_pool_funding_indicator_mapping WHERE id = ?`,
      [deactivateMappingId],
    );
    expect(sourceMapping).toBeDefined();
    expect(sourceMapping.result_id).toBe(deactivateResultId);
    expect(Number(sourceMapping.is_active)).toBe(0);

    await assertWitnessUntouched();
  }, 30000);

  it('versions a result with no pool funding rows without updating anything', async () => {
    const witnessBefore = {
      alignments: await alignmentsFor(witnessResultId),
      sps: await spsFor(witnessResultId),
      tocs: await tocsFor(witnessResultId),
      mappings: await mappingsFor(witnessResultId),
    };

    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeEmpty]);

    const newResultId = await snapshotResultId(officialCodeEmpty);
    expect(newResultId).not.toBe(emptyResultId);

    expect(await alignmentsFor(emptyResultId)).toHaveLength(0);
    expect(await spsFor(emptyResultId)).toHaveLength(0);
    expect(await tocsFor(emptyResultId)).toHaveLength(0);
    expect(await mappingsFor(emptyResultId)).toHaveLength(0);
    expect(await alignmentsFor(newResultId)).toHaveLength(0);
    expect(await spsFor(newResultId)).toHaveLength(0);
    expect(await tocsFor(newResultId)).toHaveLength(0);
    expect(await mappingsFor(newResultId)).toHaveLength(0);

    expect(await alignmentsFor(witnessResultId)).toEqual(
      witnessBefore.alignments,
    );
    expect(await spsFor(witnessResultId)).toEqual(witnessBefore.sps);
    expect(await tocsFor(witnessResultId)).toEqual(witnessBefore.tocs);
    expect(await mappingsFor(witnessResultId)).toEqual(witnessBefore.mappings);
  }, 30000);

  it('rejects a second SP_versioning call with SQLSTATE 45001 and leaves source pool funding rows in the post-first-call state', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeDuplicate]);

    const afterFirst = {
      alignments: await alignmentsFor(duplicateResultId),
      sps: await spsFor(duplicateResultId),
      tocs: await tocsFor(duplicateResultId),
      mappings: await mappingsFor(duplicateResultId),
    };

    let thrown: {
      errno?: number;
      sqlState?: string;
      driverError?: { errno?: number; sqlState?: string };
    } | null = null;
    try {
      await dataSource.query(`CALL SP_versioning(?)`, [officialCodeDuplicate]);
    } catch (err) {
      thrown = err as {
        errno?: number;
        sqlState?: string;
        driverError?: { errno?: number; sqlState?: string };
      };
    }
    expect(thrown).not.toBeNull();
    expect(thrown?.sqlState ?? thrown?.driverError?.sqlState).toBe('45001');
    expect(thrown?.errno ?? thrown?.driverError?.errno).toBe(1644);

    expect(await alignmentsFor(duplicateResultId)).toEqual(
      afterFirst.alignments,
    );
    expect(await spsFor(duplicateResultId)).toEqual(afterFirst.sps);
    expect(await tocsFor(duplicateResultId)).toEqual(afterFirst.tocs);
    expect(await mappingsFor(duplicateResultId)).toEqual(afterFirst.mappings);
  }, 30000);

  it('deletes a version that carries pool funding rows without MySQL 1451 and without touching the live result leftover rows', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [
      officialCodeVersionDelete,
    ]);

    const snapshotId = await snapshotResultId(officialCodeVersionDelete);
    expect(snapshotId).not.toBe(versionDeleteResultId);

    const snapshotAlignments = await alignmentsFor(snapshotId);
    expect(snapshotAlignments.length).toBeGreaterThan(0);
    expect(await spsFor(snapshotId)).not.toHaveLength(0);
    expect(await tocsFor(snapshotId)).not.toHaveLength(0);
    expect(await mappingsFor(snapshotId)).not.toHaveLength(0);

    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      officialCodeVersionDelete,
      reportYear,
    ]);

    expect(await alignmentsFor(snapshotId)).toHaveLength(0);
    expect(await spsFor(snapshotId)).toHaveLength(0);
    expect(await tocsFor(snapshotId)).toHaveLength(0);
    expect(await mappingsFor(snapshotId)).toHaveLength(0);

    const remainingSnapshot = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [snapshotId],
    );
    expect(remainingSnapshot).toHaveLength(0);

    const [liveInactiveAlignment] = await dataSource.query(
      `SELECT id, result_id, is_active FROM result_pool_funding_alignment WHERE id = ?`,
      [versionDeleteLiveInactiveAlignmentId],
    );
    expect(liveInactiveAlignment).toBeDefined();
    expect(liveInactiveAlignment.result_id).toBe(versionDeleteResultId);
    expect(Number(liveInactiveAlignment.is_active)).toBe(0);

    const [liveInactiveSp] = await dataSource.query(
      `SELECT id, alignment_id, is_active FROM result_pool_funding_alignment_sp WHERE id = ?`,
      [versionDeleteLiveInactiveSpId],
    );
    expect(liveInactiveSp).toBeDefined();
    expect(liveInactiveSp.alignment_id).toBe(
      versionDeleteLiveInactiveAlignmentId,
    );
    expect(Number(liveInactiveSp.is_active)).toBe(0);

    const [liveInactiveToc] = await dataSource.query(
      `SELECT id, result_id FROM result_pool_funding_toc_alignment WHERE id = ?`,
      [versionDeleteLiveInactiveTocId],
    );
    expect(liveInactiveToc).toBeDefined();
    expect(liveInactiveToc.result_id).toBe(versionDeleteResultId);

    const [liveInactiveMapping] = await dataSource.query(
      `SELECT id, result_id FROM result_pool_funding_indicator_mapping WHERE id = ?`,
      [versionDeleteLiveInactiveMappingId],
    );
    expect(liveInactiveMapping).toBeDefined();
    expect(liveInactiveMapping.result_id).toBe(versionDeleteResultId);
  }, 30000);

  it('re-versions without re-filling the section and leaves the second snapshot with zero pool funding rows (ruled behaviour of Decision 4 / AR-1)', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeReapproval]);

    const snapshot1Id = await snapshotResultId(officialCodeReapproval);

    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      officialCodeReapproval,
      reportYear,
    ]);

    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeReapproval]);

    const snapshot2Id = await snapshotResultId(officialCodeReapproval);
    expect(snapshot2Id).not.toBe(snapshot1Id);
    expect(snapshot2Id).not.toBe(reapprovalResultId);

    expect(await alignmentsFor(snapshot2Id)).toHaveLength(0);
    expect(await spsFor(snapshot2Id)).toHaveLength(0);
    expect(await tocsFor(snapshot2Id)).toHaveLength(0);
    expect(await mappingsFor(snapshot2Id)).toHaveLength(0);
  }, 30000);

  it('full_delete_result_version on a result carrying pool funding rows returns TRUE, physically deletes the four tables rows, and removes the results row', async () => {
    const [row] = await dataSource.query(
      `SELECT full_delete_result_version(?) AS ok`,
      [hardDeleteResultId],
    );
    expect(Number(row.ok)).toBe(1);

    expect(await alignmentsFor(hardDeleteResultId)).toHaveLength(0);
    expect(await spsFor(hardDeleteResultId)).toHaveLength(0);
    expect(await tocsFor(hardDeleteResultId)).toHaveLength(0);
    expect(await mappingsFor(hardDeleteResultId)).toHaveLength(0);

    const remaining = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [hardDeleteResultId],
    );
    expect(remaining).toHaveLength(0);
  }, 30000);
});
