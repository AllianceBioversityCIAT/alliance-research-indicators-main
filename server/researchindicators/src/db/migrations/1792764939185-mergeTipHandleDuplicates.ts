import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-off conversion of live active TIP rows that share a `public_link`.
 *
 * Prechecks are read-only and run before CREATE TABLE. (a) and (b) and (d)
 * abort with no DDL. (c) skips the group and leaves the rows as they are.
 * A skipped group is one log row whose survivor id equals its row id, so
 * the skip count is readable from `tip_handle_merge_log` and down restores
 * the same code and snapshot.
 *
 * DDL commits implicitly. Each change is recorded before it is written, and
 * a following COMMIT makes that step durable. A later up skips a row only
 * when its current state already equals the target state. A log row never
 * suppresses a change that has not been applied yet.
 *
 * Per group the writes are links, then the demoted row, so a re-run still
 * sees two live rows until the demote lands. The demoted row keeps its
 * result id. Outgoing links on that row stay where they are. A link the
 * survivor itself owns, pointing at the demoted row, is deactivated. Moving
 * it would make the survivor point at itself.
 */

const SYNC_LOG_SQL = `SELECT \`id\` AS id
FROM \`result_prms_sync_log\`
WHERE \`platform_code\` = 'TIP'
LIMIT 1`;

const LIVE_SQL = `SELECT
  r.\`result_id\` AS result_id,
  r.\`result_official_code\` AS result_official_code,
  r.\`report_year_id\` AS report_year_id,
  r.\`prms_result_code\` AS prms_result_code,
  r.\`is_synced_to_prms\` AS is_synced_to_prms,
  r.\`is_snapshot\` AS is_snapshot,
  dup.\`group_anchor\` AS group_anchor
FROM \`results\` r
INNER JOIN (
  SELECT MIN(\`result_id\`) AS group_anchor, \`public_link\`
  FROM \`results\`
  WHERE \`platform_code\` = 'TIP'
    AND \`is_snapshot\` = 0
    AND \`is_active\` = 1
  GROUP BY \`public_link\`
  HAVING COUNT(*) > 1
) dup ON dup.\`public_link\` <=> r.\`public_link\`
WHERE r.\`platform_code\` = 'TIP'
  AND r.\`is_snapshot\` = 0
  AND r.\`is_active\` = 1`;

const LINK_SQL = `SELECT
  lr.\`link_result_id\` AS link_result_id,
  lr.\`result_id\` AS result_id,
  lr.\`other_result_id\` AS other_result_id,
  lr.\`link_result_role_id\` AS link_result_role_id
FROM \`link_results\` lr
INNER JOIN \`results\` r ON r.\`result_id\` = lr.\`other_result_id\`
WHERE lr.\`is_active\` = 1
  AND r.\`platform_code\` = 'TIP'
  AND r.\`is_snapshot\` = 0
  AND r.\`is_active\` = 1`;

const SNAPSHOT_SQL = `SELECT
  \`result_id\` AS result_id,
  \`result_official_code\` AS result_official_code,
  \`report_year_id\` AS report_year_id
FROM \`results\`
WHERE \`platform_code\` = 'TIP'
  AND \`is_snapshot\` = 1`;

const CREATE_LOG_SQL = `CREATE TABLE IF NOT EXISTS \`tip_handle_merge_log\` (
  \`id\` bigint NOT NULL AUTO_INCREMENT,
  \`kind\` enum('result','link') NOT NULL,
  \`row_id\` bigint NOT NULL,
  \`old_code\` bigint NULL,
  \`old_is_snapshot\` tinyint NULL,
  \`old_other_result_id\` bigint NULL,
  \`old_is_active\` tinyint NULL,
  \`survivor_id\` bigint NULL,
  \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`)
)`;

const LOAD_LOG_SQL = `SELECT \`kind\` AS kind, \`row_id\` AS row_id
FROM \`tip_handle_merge_log\``;

const RESTORE_LINKS_SQL = `UPDATE \`link_results\` lr
INNER JOIN \`tip_handle_merge_log\` l
  ON l.\`kind\` = 'link' AND l.\`row_id\` = lr.\`link_result_id\`
SET lr.\`other_result_id\` = l.\`old_other_result_id\`,
    lr.\`is_active\` = l.\`old_is_active\`,
    lr.\`updated_at\` = lr.\`updated_at\``;

const RESTORE_RESULTS_SQL = `UPDATE \`results\` r
INNER JOIN \`tip_handle_merge_log\` l
  ON l.\`kind\` = 'result' AND l.\`row_id\` = r.\`result_id\`
SET r.\`result_official_code\` = l.\`old_code\`,
    r.\`is_snapshot\` = l.\`old_is_snapshot\`,
    r.\`updated_at\` = r.\`updated_at\``;

const DROP_LOG_SQL = 'DROP TABLE IF EXISTS `tip_handle_merge_log`';

type LiveRow = {
  resultId: string;
  code: string;
  year: string;
  prmsCodeSet: boolean;
  synced: number;
  isSnapshot: number;
};

type ActiveLink = {
  linkId: string;
  resultId: string;
  otherId: string;
  roleId: string;
};

type SnapshotRow = {
  resultId: string;
  code: string;
  year: string;
};

type LinkChange = {
  linkId: string;
  oldOther: string;
  survivorId: string;
  mode: 'repoint' | 'deactivate';
};

type SkipGroup = {
  action: 'skip';
  marker: LiveRow;
};

type MergeGroup = {
  action: 'merge';
  survivor: LiveRow;
  demoted: LiveRow;
  links: LinkChange[];
};

type GroupPlan = SkipGroup | MergeGroup;

const rowsOf = (result: unknown): Record<string, unknown>[] =>
  Array.isArray(result) ? (result as Record<string, unknown>[]) : [];

const sqlInt = (value: unknown): string => {
  if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new Error('Negative integer in migration SQL');
    }
    return value.toString();
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('Unsafe integer in migration SQL');
    }
    return String(value);
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return value;
  }
  throw new Error('Non integer in migration SQL');
};

const flag = (value: unknown): number => {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return value.length > 0 && value[0] !== 0 ? 1 : 0;
  }
  if (value === true || value === 1 || value === '1') {
    return 1;
  }
  if (
    value === false ||
    value === 0 ||
    value === '0' ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }
  throw new Error('Unexpected flag value');
};

const cmpInt = (left: string, right: string): number => {
  const a = BigInt(left);
  const b = BigInt(right);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const yearOf = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return sqlInt(value);
};

const parseLive = (row: Record<string, unknown>): LiveRow => ({
  resultId: sqlInt(row.result_id),
  code: sqlInt(row.result_official_code),
  year: yearOf(row.report_year_id),
  prmsCodeSet:
    row.prms_result_code !== null && row.prms_result_code !== undefined,
  synced: flag(row.is_synced_to_prms),
  isSnapshot: flag(row.is_snapshot),
});

const parseLink = (row: Record<string, unknown>): ActiveLink => ({
  linkId: sqlInt(row.link_result_id),
  resultId: sqlInt(row.result_id),
  otherId: sqlInt(row.other_result_id),
  roleId: sqlInt(row.link_result_role_id),
});

const parseSnapshot = (row: Record<string, unknown>): SnapshotRow => ({
  resultId: sqlInt(row.result_id),
  code: sqlInt(row.result_official_code),
  year: yearOf(row.report_year_id),
});

const chooseSurvivor = (
  members: LiveRow[],
  linksByOther: Map<string, ActiveLink[]>,
): LiveRow => {
  const referenced = members.filter(
    (member) => (linksByOther.get(member.resultId) ?? []).length > 0,
  );
  if (referenced.length === 1) {
    return referenced[0];
  }
  return [...members].sort((left, right) => {
    const byYear = cmpInt(right.year, left.year);
    if (byYear !== 0) return byYear;
    return cmpInt(right.resultId, left.resultId);
  })[0];
};

const linkChanges = (
  demoted: LiveRow,
  survivor: LiveRow,
  linksByOther: Map<string, ActiveLink[]>,
): LinkChange[] => {
  const onSurvivor = new Set(
    (linksByOther.get(survivor.resultId) ?? []).map(
      (link) => `${link.resultId}:${link.roleId}`,
    ),
  );
  const pointing = [...(linksByOther.get(demoted.resultId) ?? [])].sort(
    (left, right) => cmpInt(left.linkId, right.linkId),
  );
  const changes: LinkChange[] = [];
  for (const link of pointing) {
    const key = `${link.resultId}:${link.roleId}`;
    if (link.resultId === survivor.resultId || onSurvivor.has(key)) {
      changes.push({
        linkId: link.linkId,
        oldOther: link.otherId,
        survivorId: survivor.resultId,
        mode: 'deactivate',
      });
      continue;
    }
    changes.push({
      linkId: link.linkId,
      oldOther: link.otherId,
      survivorId: survivor.resultId,
      mode: 'repoint',
    });
    onSurvivor.add(key);
  }
  return changes;
};

const planGroups = (
  liveRows: Record<string, unknown>[],
  linkRows: Record<string, unknown>[],
  snapshotRows: Record<string, unknown>[],
): GroupPlan[] => {
  const grouped = new Map<string, LiveRow[]>();
  for (const raw of liveRows) {
    const anchor = sqlInt(raw.group_anchor);
    const bucket = grouped.get(anchor) ?? [];
    bucket.push(parseLive(raw));
    grouped.set(anchor, bucket);
  }

  const linksByOther = new Map<string, ActiveLink[]>();
  for (const raw of linkRows) {
    const link = parseLink(raw);
    const bucket = linksByOther.get(link.otherId) ?? [];
    bucket.push(link);
    linksByOther.set(link.otherId, bucket);
  }

  const snapshots = snapshotRows.map(parseSnapshot);
  const plannedTargets = new Set<string>();
  const plans: GroupPlan[] = [];

  for (const anchor of [...grouped.keys()].sort(cmpInt)) {
    const members = grouped.get(anchor) ?? [];
    const distinctYears = new Set(
      members
        .filter((member) => member.year !== '')
        .map((member) => member.year),
    );
    if (members.length > 2 || distinctYears.size < members.length) {
      throw new Error(
        'TIP handle group has more than two live rows or two rows in the same year',
      );
    }

    if (members.some((member) => member.prmsCodeSet || member.synced === 1)) {
      const marker = [...members].sort((left, right) =>
        cmpInt(left.resultId, right.resultId),
      )[0];
      plans.push({ action: 'skip', marker });
      continue;
    }

    const survivor = chooseSurvivor(members, linksByOther);
    const demoted = members.find(
      (member) => member.resultId !== survivor.resultId,
    );
    if (!demoted) {
      throw new Error('TIP handle group has no row to demote');
    }
    const targetKey = `${survivor.code}|${demoted.year}`;
    const collides =
      plannedTargets.has(targetKey) ||
      snapshots.some(
        (snapshot) =>
          snapshot.year !== '' &&
          snapshot.code === survivor.code &&
          snapshot.year === demoted.year &&
          snapshot.resultId !== demoted.resultId,
      );
    if (collides) {
      throw new Error('Demoted TIP row would collide with an existing version');
    }
    plannedTargets.add(targetKey);
    plans.push({
      action: 'merge',
      survivor,
      demoted,
      links: linkChanges(demoted, survivor, linksByOther),
    });
  }

  return plans;
};

const persist = async (queryRunner: QueryRunner): Promise<void> => {
  await queryRunner.query('COMMIT');
};

const insertResultLog = (
  rowId: string,
  oldCode: string,
  oldSnapshot: number,
  survivorId: string,
): string =>
  `INSERT INTO \`tip_handle_merge_log\` (\`kind\`, \`row_id\`, \`old_code\`, \`old_is_snapshot\`, \`old_other_result_id\`, \`old_is_active\`, \`survivor_id\`) VALUES ('result', ${rowId}, ${oldCode}, ${oldSnapshot}, NULL, 1, ${survivorId})`;

const insertLinkLog = (
  linkId: string,
  oldOther: string,
  survivorId: string,
): string =>
  `INSERT INTO \`tip_handle_merge_log\` (\`kind\`, \`row_id\`, \`old_code\`, \`old_is_snapshot\`, \`old_other_result_id\`, \`old_is_active\`, \`survivor_id\`) VALUES ('link', ${linkId}, NULL, NULL, ${oldOther}, 1, ${survivorId})`;

const recordOnce = async (
  queryRunner: QueryRunner,
  logged: Set<string>,
  key: string,
  sql: string,
): Promise<void> => {
  if (logged.has(key)) return;
  await queryRunner.query(sql);
  logged.add(key);
  await persist(queryRunner);
};

const applyGroup = async (
  queryRunner: QueryRunner,
  group: GroupPlan,
  logged: Set<string>,
): Promise<void> => {
  if (group.action === 'skip') {
    await recordOnce(
      queryRunner,
      logged,
      `result:${group.marker.resultId}`,
      insertResultLog(
        group.marker.resultId,
        group.marker.code,
        0,
        group.marker.resultId,
      ),
    );
    return;
  }

  for (const link of group.links) {
    if (link.mode === 'repoint' && link.oldOther === link.survivorId) {
      continue;
    }

    await recordOnce(
      queryRunner,
      logged,
      `link:${link.linkId}`,
      insertLinkLog(link.linkId, link.oldOther, link.survivorId),
    );
    if (link.mode === 'repoint') {
      await queryRunner.query(
        `UPDATE \`link_results\` SET \`other_result_id\` = ${link.survivorId}, \`is_active\` = 1, \`updated_at\` = \`updated_at\` WHERE \`link_result_id\` = ${link.linkId}`,
      );
    } else {
      await queryRunner.query(
        `UPDATE \`link_results\` SET \`is_active\` = 0, \`updated_at\` = \`updated_at\` WHERE \`link_result_id\` = ${link.linkId}`,
      );
    }
    await persist(queryRunner);
  }

  if (
    group.demoted.isSnapshot === 1 &&
    group.demoted.code === group.survivor.code
  ) {
    return;
  }

  await recordOnce(
    queryRunner,
    logged,
    `result:${group.demoted.resultId}`,
    insertResultLog(
      group.demoted.resultId,
      group.demoted.code,
      0,
      group.survivor.resultId,
    ),
  );
  await queryRunner.query(
    `UPDATE \`results\` SET \`is_snapshot\` = 1, \`result_official_code\` = ${group.survivor.code}, \`updated_at\` = \`updated_at\` WHERE \`result_id\` = ${group.demoted.resultId}`,
  );
  await persist(queryRunner);
};

export class MergeTipHandleDuplicates1792764939185
  implements MigrationInterface
{
  name = 'MergeTipHandleDuplicates1792764939185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const syncRows = rowsOf(await queryRunner.query(SYNC_LOG_SQL));
    const liveRows = rowsOf(await queryRunner.query(LIVE_SQL));
    const linkRows = rowsOf(await queryRunner.query(LINK_SQL));
    const snapshotRows = rowsOf(await queryRunner.query(SNAPSHOT_SQL));

    if (syncRows.length > 0) {
      throw new Error('TIP rows exist in result_prms_sync_log');
    }

    const groups = planGroups(liveRows, linkRows, snapshotRows);

    await queryRunner.query(CREATE_LOG_SQL);
    await persist(queryRunner);

    const logged = new Set<string>();
    for (const row of rowsOf(await queryRunner.query(LOAD_LOG_SQL))) {
      logged.add(`${String(row.kind)}:${sqlInt(row.row_id)}`);
    }

    for (const group of groups) {
      await applyGroup(queryRunner, group, logged);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(RESTORE_LINKS_SQL);
    await persist(queryRunner);
    await queryRunner.query(RESTORE_RESULTS_SQL);
    await persist(queryRunner);
    await queryRunner.query(DROP_LOG_SQL);
    await persist(queryRunner);
  }
}
