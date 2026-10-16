import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Shared harness for the Organizational Structure integration suites
 * (docs/specs/institutional-performance/organizational-structure, T-01).
 *
 * Evidence DB: the requester's local database `ari_local_mysql`
 * (`ARI_TEST_MYSQL_*`), NOT a disposable schema. The suites create only rows
 * whose code / carnet starts with a `__T01_` prefix, track every id they
 * create, and delete exactly those rows in `afterAll` (staff last, because the
 * director and delegate foreign keys are RESTRICT). Seeded rows (control-list
 * values 20-23) are only READ.
 */

export const ORG_FIXTURE_PREFIX = '__T01_';
/** T-02 suites create entries through the HTTP write path with this code prefix. */
export const ORG_T02_PREFIX = '__T02_';

/** Refuse to run against anything that is not the local database. */
export const assertLocalTestDatabase = (label: string): void => {
  const host = process.env.ARI_TEST_MYSQL_HOST;
  const port = process.env.ARI_TEST_MYSQL_PORT;
  const database = process.env.ARI_TEST_MYSQL_NAME;
  console.log(`[${label}] resolved DB target: ${host}:${port}/${database}`);
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `${label}: ARI_TEST_MYSQL_HOST is "${host}", not local. Refusing to run.`,
    );
  }
};

export const createOrgTestDataSource = async (
  label: string,
): Promise<DataSource> => {
  assertLocalTestDatabase(label);
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.ARI_TEST_MYSQL_HOST,
    port: parseInt(process.env.ARI_TEST_MYSQL_PORT, 10),
    username: process.env.ARI_TEST_MYSQL_USER_NAME,
    password: process.env.ARI_TEST_MYSQL_USER_PASS,
    database: process.env.ARI_TEST_MYSQL_NAME,
    entities: [
      `${__dirname}/../../src/domain/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/tools/clarisa/entities/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/shared/auxiliar/**/*.entity{.ts,.js}`,
      `${__dirname}/../../src/domain/tools/open-search/prms/entities/*.entity{.ts,.js}`,
    ],
    synchronize: false,
    migrationsRun: false,
    logging: false,
    extra: { connectionLimit: 2 },
  });
  return dataSource.initialize();
};

export interface VersionSeed {
  from: number;
  to: number | null;
  name: string;
  levelId?: number;
  parentId?: number | null;
  directorCarnet?: string | null;
  acronym?: string | null;
}

/** Inserts rows and remembers them so `cleanup` removes exactly those. */
export class OrgFixtures {
  readonly unitIds: number[] = [];
  readonly staffCarnets: string[] = [];

  constructor(private readonly dataSource: DataSource) {}

  async staff(
    suffix: string,
    first: string,
    last: string,
    isActive: boolean,
  ): Promise<string> {
    const carnet = `${ORG_FIXTURE_PREFIX}${suffix}`;
    await this.dataSource.query(
      `INSERT INTO alliance_user_staff (carnet, first_name, last_name, email, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        carnet,
        first,
        last,
        `${suffix.toLowerCase()}@example.org`,
        isActive ? 1 : 0,
      ],
    );
    this.staffCarnets.push(carnet);
    return carnet;
  }

  async unit(
    suffix: string,
    versions: VersionSeed[],
    opts: {
      status?: 'active' | 'inactive' | 'deleted';
      statusFromYear?: number | null;
    } = {},
  ): Promise<number> {
    const result = await this.dataSource.query(
      `INSERT INTO org_units (code, status, status_from_year, created_at)
       VALUES (?, ?, ?, NOW())`,
      [
        `${ORG_FIXTURE_PREFIX}${suffix}`,
        opts.status ?? 'active',
        opts.statusFromYear ?? null,
      ],
    );
    const id = Number(result.insertId);
    this.unitIds.push(id);
    for (const version of versions) {
      await this.version(id, version);
    }
    return id;
  }

  async version(unitId: number, v: VersionSeed): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO org_unit_versions
         (org_unit_id, valid_from_year, valid_to_year, name, acronym,
          level_value_id, parent_id, director_carnet, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        unitId,
        v.from,
        v.to,
        v.name,
        v.acronym ?? null,
        v.levelId ?? 23,
        v.parentId ?? null,
        v.directorCarnet ?? null,
      ],
    );
  }

  async delegate(unitId: number, carnet: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO org_unit_delegates (org_unit_id, staff_carnet, created_at)
       VALUES (?, ?, NOW())`,
      [unitId, carnet],
    );
  }

  /** Children first (RESTRICT parent / successor), staff last. */
  async cleanup(): Promise<void> {
    if (this.unitIds.length > 0) {
      const ids = this.unitIds.map(() => '?').join(',');
      await this.dataSource.query(
        `DELETE FROM org_unit_delegates WHERE org_unit_id IN (${ids})`,
        this.unitIds,
      );
      await this.dataSource.query(
        `DELETE FROM org_unit_versions WHERE org_unit_id IN (${ids})`,
        this.unitIds,
      );
      await this.dataSource.query(
        `DELETE FROM org_unit_change_log WHERE org_unit_id IN (${ids})`,
        this.unitIds,
      );
      await this.dataSource.query(
        `DELETE FROM org_units WHERE id IN (${ids}) AND (code LIKE ? OR code LIKE ?)`,
        [...this.unitIds, `${ORG_FIXTURE_PREFIX}%`, `${ORG_T02_PREFIX}%`],
      );
    }
    if (this.staffCarnets.length > 0) {
      const carnets = this.staffCarnets.map(() => '?').join(',');
      await this.dataSource.query(
        `DELETE FROM alliance_user_staff WHERE carnet IN (${carnets}) AND carnet LIKE ?`,
        [...this.staffCarnets, `${ORG_FIXTURE_PREFIX}%`],
      );
    }
  }
}
