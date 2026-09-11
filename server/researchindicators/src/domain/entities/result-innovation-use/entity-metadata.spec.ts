import { DataSourceOptions, getMetadataArgsStorage } from 'typeorm';
import { globSync } from 'glob';
import { getDataSource } from '../../../db/config/mysql/orm.config';
import { dataSourceTarget } from '../../../db/config/mysql/enum/data-source-target.enum';
import { ResultActor } from '../result-actors/entities/result-actor.entity';
import { ResultInstitutionType } from '../result-institution-types/entities/result-institution-type.entity';
import { ResultInnovationUse } from './entities/result-innovation-use.entity';
import { ClarisaInnovationUseLevel } from '../../tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';

/**
 * T-08 (DC-7) — entity-metadata gate.
 *
 * `tsc --noEmit` proves compilation only, not that TypeORM's entity metadata
 * agrees with what M1-M4 actually created in the database. This spec reads
 * TypeORM's OWN raw decorator metadata via `getMetadataArgsStorage()` (never
 * re-deriving expectations from the entity classes under test — KZ-001).
 * Expected values below are independently transcribed from `design.md`
 * §3.1-§3.4 and the M1-M4 migration SQL.
 *
 * `getMetadataArgsStorage()` reads the raw `{target, propertyName, options}`
 * tuples every `@Column`/`@PrimaryColumn` decorator pushes at class-load
 * time (`PrimaryColumn.js`, `Column.js`) — no `DataSource`, no driver, no
 * network connection. `DataSource.buildMetadatas()` was tried first and
 * rejected: it is `protected` on this TypeORM version's public type
 * (`DataSource.js` doesn't mark it so at runtime, but the `.d.ts` does,
 * and calling it through a type-cast would silently reach past the same
 * protection a real caller respects).
 *
 * Registration (AC.2's "matched by the orm.config.ts globs" half) is
 * proved by literally expanding the SAME glob patterns
 * `getDataSource(...).entities` returns (`orm.config.ts:19-24`) with the
 * `glob` package TypeORM itself resolves entities with
 * (`DirectoryExportedClassesLoader.js`), and asserting each new file's path
 * is in the match set. A file in the wrong folder compiles clean and passes
 * every column assertion below (since those import the class directly,
 * bypassing the glob) while silently failing only this section — which is
 * exactly the DC-7 failure mode named in the task.
 */
describe('Innovation Use entity metadata (DC-7)', () => {
  const storage = getMetadataArgsStorage();

  const col = (target: unknown, propertyName: string) => {
    const found = storage.columns.find(
      (c) => c.target === target && c.propertyName === propertyName,
    );
    if (!found) {
      throw new Error(
        `Column ${propertyName} not found in decorator metadata for ${
          (target as { name: string }).name
        }`,
      );
    }
    return found;
  };

  const isPrimary = (c: ReturnType<typeof col>) => c.options.primary === true;
  const isNullable = (c: ReturnType<typeof col>) => !!c.options.nullable;
  const isGenerated = (target: unknown, propertyName: string) =>
    storage.generations.some(
      (g) => g.target === target && g.propertyName === propertyName,
    );

  describe('registration (AC.2 — both new entities are matched by the orm.config.ts globs)', () => {
    const entityGlobs = (
      getDataSource(dataSourceTarget.CORE, false) as DataSourceOptions
    ).entities;
    const matchedFiles = (entityGlobs as string[])
      .flatMap((pattern) => globSync(pattern))
      .map((f) => f.replace(/\\/g, '/'));

    it('matches result-innovation-use.entity.ts under domain/entities/**', () => {
      expect(
        matchedFiles.some((f) =>
          f.endsWith(
            'domain/entities/result-innovation-use/entities/result-innovation-use.entity.ts',
          ),
        ),
      ).toBe(true);
    });

    it('matches clarisa-innovation-use-level.entity.ts under domain/tools/clarisa/entities/**', () => {
      expect(
        matchedFiles.some((f) =>
          f.endsWith(
            'domain/tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity.ts',
          ),
        ),
      ).toBe(true);
    });
  });

  describe('result_actors — five count columns (R-IU-003)', () => {
    it.each([
      'women_youth_count',
      'women_not_youth_count',
      'men_youth_count',
      'men_not_youth_count',
      'actors_count',
    ])('%s is int, nullable, no default, not primary', (propertyName) => {
      const c = col(ResultActor, propertyName);
      expect(c.options.type).toBe('int');
      expect(isNullable(c)).toBe(true);
      expect(c.options.default).toBeUndefined();
      expect(isPrimary(c)).toBe(false);
    });
  });

  describe('result_institution_types — organization_count (R-IU-004)', () => {
    it('is int, nullable, no default, not primary', () => {
      const c = col(ResultInstitutionType, 'organization_count');
      expect(c.options.type).toBe('int');
      expect(isNullable(c)).toBe(true);
      expect(c.options.default).toBeUndefined();
      expect(isPrimary(c)).toBe(false);
    });
  });

  describe('result_innovation_use (M2, R-IU-001)', () => {
    it('result_id is bigint, PRIMARY KEY, not nullable', () => {
      const c = col(ResultInnovationUse, 'result_id');
      expect(c.options.type).toBe('bigint');
      expect(isPrimary(c)).toBe(true);
      expect(isNullable(c)).toBe(false);
    });

    it('innovation_use_level_id is bigint, nullable, no default', () => {
      const c = col(ResultInnovationUse, 'innovation_use_level_id');
      expect(c.options.type).toBe('bigint');
      expect(isNullable(c)).toBe(true);
      expect(c.options.default).toBeUndefined();
      expect(isPrimary(c)).toBe(false);
    });

    it('innovation_use_level_explanation is text, nullable, no default', () => {
      const c = col(ResultInnovationUse, 'innovation_use_level_explanation');
      expect(c.options.type).toBe('text');
      expect(isNullable(c)).toBe(true);
      expect(c.options.default).toBeUndefined();
      expect(isPrimary(c)).toBe(false);
    });
  });

  describe('clarisa_innovation_use_levels (M1, R-IU-002)', () => {
    it('id is bigint, PRIMARY KEY, not nullable, not auto-increment', () => {
      const c = col(ClarisaInnovationUseLevel, 'id');
      expect(c.options.type).toBe('bigint');
      expect(isPrimary(c)).toBe(true);
      expect(isNullable(c)).toBe(false);
      expect(isGenerated(ClarisaInnovationUseLevel, 'id')).toBe(false);
    });

    it('level is bigint, nullable', () => {
      const c = col(ClarisaInnovationUseLevel, 'level');
      expect(c.options.type).toBe('bigint');
      expect(isNullable(c)).toBe(true);
      expect(isPrimary(c)).toBe(false);
    });

    it('name is text, nullable', () => {
      const c = col(ClarisaInnovationUseLevel, 'name');
      expect(c.options.type).toBe('text');
      expect(isNullable(c)).toBe(true);
    });

    it('definition is text, nullable', () => {
      const c = col(ClarisaInnovationUseLevel, 'definition');
      expect(c.options.type).toBe('text');
      expect(isNullable(c)).toBe(true);
    });

    it('has no additional_guidance column (unlike clarisa_innovation_readiness_levels)', () => {
      expect(
        storage.columns.some(
          (c) =>
            c.target === ClarisaInnovationUseLevel &&
            c.propertyName === 'additional_guidance',
        ),
      ).toBe(false);
    });
  });

  // Read by string key (not `Enum.MEMBER`) so a not-yet-added member is a
  // runtime `undefined` assertion failure, not a `tsc` compile error — the
  // member genuinely does not exist before this task's enum edits land, and
  // the RED run below must observe a per-test failure count, not a suite
  // that fails to compile.
  const enumMember = (
    enumObject: unknown,
    memberName: string,
  ): number | undefined => (enumObject as Record<string, number>)[memberName];

  describe('role-discriminator enums (R-IU-005 AC.1, AC.3) — one new member, nothing renumbered', () => {
    it('ActorRolesEnum: INNOVATION_DEV unchanged, INNOVATION_USE = 2', () => {
      expect(enumMember(ActorRolesEnum, 'INNOVATION_DEV')).toBe(1);
      expect(enumMember(ActorRolesEnum, 'INNOVATION_USE')).toBe(2);
    });

    it('InstitutionTypeRoleEnum: INNOVATION_DEV unchanged, INNOVATION_USE = 2', () => {
      expect(enumMember(InstitutionTypeRoleEnum, 'INNOVATION_DEV')).toBe(1);
      expect(enumMember(InstitutionTypeRoleEnum, 'INNOVATION_USE')).toBe(2);
    });

    it('QuantificationRolesEnum: ACTUAL_COUNT/EXTRAPOLATE_ESTIMATES unchanged, INNOVATION_USE = 3', () => {
      expect(enumMember(QuantificationRolesEnum, 'ACTUAL_COUNT')).toBe(1);
      expect(enumMember(QuantificationRolesEnum, 'EXTRAPOLATE_ESTIMATES')).toBe(
        2,
      );
      expect(enumMember(QuantificationRolesEnum, 'INNOVATION_USE')).toBe(3);
    });
  });
});
