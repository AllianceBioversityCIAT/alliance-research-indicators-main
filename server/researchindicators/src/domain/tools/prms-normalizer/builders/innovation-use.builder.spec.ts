import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ActorRolesEnum } from '../../../entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../../entities/institution-type-roles/enum/institution-type-role.enum';
import { QuantificationRolesEnum } from '../../../entities/quantification-roles/enum/quantification-roles.enum';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { PrmsPayloadBuildError } from './common-fields.builder';
import { InnovationUseBuilder } from './innovation-use.builder';

/**
 * Seeded `clarisa_innovation_use_levels` rows, parsed from migration
 * `1787066437593-createClarisaInnovationUseLevels.ts` (homologation.md §8.1).
 * Expected `level` / `name` come from this INSERT — never from a fixture
 * constant and never from builder output (R-PRMS-007 AC.1, DC-1).
 */
const SEEDED_INNOVATION_USE_LEVELS: ReadonlyArray<{
  id: number;
  level: number;
  name: string;
}> = (() => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/db/migrations/1787066437593-createClarisaInnovationUseLevels.ts',
    ),
    'utf8',
  );
  const insertStart = source.indexOf('clarisa_innovation_use_levels');
  if (insertStart < 0) {
    throw new Error('Seeded clarisa_innovation_use_levels INSERT not found');
  }
  const insert = source.slice(source.indexOf('VALUES', insertStart));
  const rows: Array<{ id: number; level: number; name: string }> = [];
  const re = /\((\d+),\s*(\d+),\s*'((?:\\'|[^'])*)'/g;
  let match: RegExpExecArray | null = re.exec(insert);
  while (match) {
    rows.push({
      id: Number(match[1]),
      level: Number(match[2]),
      name: match[3],
    });
    match = re.exec(insert);
  }
  return rows;
})();

const SEEDED_ACTOR_TYPE_NAMES: Record<number, string> = (() => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/db/migrations/1761840859164-updateDeleteFunction.ts',
    ),
    'utf8',
  );
  const names: Record<number, string> = {};
  const re =
    /INSERT INTO clarisa_actor_types \(code, name\) VALUES\((\d+), '([^']+)'\)/g;
  let match: RegExpExecArray | null = re.exec(source);
  while (match) {
    names[Number(match[1])] = match[2];
    match = re.exec(source);
  }
  return names;
})();

const serialize = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const emptySlices = {
  capacity_sharing: null,
  innovation_dev: null,
  policy_change: null,
  actors: [] as Record<string, unknown>[],
  institution_types: [] as Record<string, unknown>[],
  quantifications: [] as Record<string, unknown>[],
};

const useAggregate = (
  slices: Partial<PrmsSyncAggregate['type_slices']> = {},
): PrmsSyncAggregate => ({
  result_id: 9004,
  result_official_code: 1441064,
  indicator_id: 6,
  created_at: new Date('2024-03-01T10:00:00.000Z'),
  title: 'Innovation use type-block fixture',
  description: 'Type-specific payload for innovation_use',
  geo_scope_id: 2,
  is_partner_not_applicable: true,
  created_by: null,
  submitted_by: null,
  lead_contact: null,
  primary_contract: null,
  contracts: [],
  science_programs: [],
  regions: [],
  countries: [],
  subnational_areas: [],
  partners: [],
  evidence: [],
  type_slices: {
    ...emptySlices,
    innovation_use: { innovation_use_level_id: 3 },
    ...slices,
  },
});

const completeUseMeasure = {
  unit: 'hectares',
  quantification_number: 12,
  quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
};

const disaggregatedUseActor = {
  result_actors_id: 101,
  actor_type_id: 2,
  actor_role_id: ActorRolesEnum.INNOVATION_USE,
  sex_age_disaggregation_not_apply: false,
  women_youth_count: 2,
  women_not_youth_count: 5,
  men_youth_count: 1,
  men_not_youth_count: 3,
  women_youth: true,
  women_not_youth: false,
  men_youth: true,
  men_not_youth: false,
};

const aggregateModeUseActor = {
  result_actors_id: 102,
  actor_type_id: 5,
  actor_type_custom_name: 'Community seed bank',
  actor_role_id: ActorRolesEnum.INNOVATION_USE,
  sex_age_disaggregation_not_apply: true,
  actors_count: 40,
};

describe('InnovationUseBuilder', () => {
  const builder = new InnovationUseBuilder();

  const builtRoot = (aggregate: PrmsSyncAggregate): Record<string, unknown> =>
    serialize(builder.build(aggregate));

  const builtBlock = (
    aggregate: PrmsSyncAggregate,
  ): Record<string, unknown> => {
    const payload = builtRoot(aggregate);
    return payload.innovation_use as Record<string, unknown>;
  };

  describe('innovation_use_level (homologation.md §8.1, R-PRMS-007 AC.1, DD-10)', () => {
    it('sends seeded level (not id) when id and level differ', () => {
      const seeded = SEEDED_INNOVATION_USE_LEVELS.find((row) => row.id === 3);
      expect(seeded).toBeDefined();
      expect(seeded?.id).not.toBe(seeded?.level);
      expect(seeded?.level).toBe(2);
      expect(seeded?.name).toBe('Partners');

      const payload = builtBlock(
        useAggregate({
          innovation_use: { innovation_use_level_id: seeded?.id },
          actors: [disaggregatedUseActor],
          quantifications: [completeUseMeasure],
        }),
      );

      const json = JSON.stringify(payload);
      expect(payload.innovation_use_level).toEqual({
        level: seeded?.level,
        name: seeded?.name,
      });
      expect(
        (payload.innovation_use_level as Record<string, unknown>).level,
      ).not.toBe(seeded?.id);
      expect(payload.innovation_use_level).not.toHaveProperty('id');
      expect(json).not.toContain('"innovation_use_level_id"');
    });
  });

  describe('sex_and_age_disaggregation (homologation.md §8.3 / §12.4, DC-2, R-PRMS-007 AC.2)', () => {
    it('passes STAR true through as true (aggregate mode: how_many only)', () => {
      const payload = builtBlock(
        useAggregate({
          actors: [aggregateModeUseActor],
          quantifications: [completeUseMeasure],
        }),
      );
      const actor = (
        payload.current_innovation_use_numbers as Record<string, unknown>
      ).actors as Record<string, unknown>[];
      const serialized = JSON.parse(JSON.stringify(actor[0])) as Record<
        string,
        unknown
      >;

      expect(serialized.sex_and_age_disaggregation).toBe(true);
      expect(serialized.how_many).toBe(40);
      expect(serialized).not.toHaveProperty('women');
      expect(serialized).not.toHaveProperty('women_youth');
      expect(serialized).not.toHaveProperty('men');
      expect(serialized).not.toHaveProperty('men_youth');
      expect(serialized.other_actor_type).toBe('Community seed bank');
    });

    it('passes STAR false through as false (disaggregated mode: women/men, no how_many)', () => {
      const payload = builtBlock(
        useAggregate({
          actors: [disaggregatedUseActor],
          quantifications: [completeUseMeasure],
        }),
      );
      const actor = (
        payload.current_innovation_use_numbers as Record<string, unknown>
      ).actors as Record<string, unknown>[];
      const serialized = JSON.parse(JSON.stringify(actor[0])) as Record<
        string,
        unknown
      >;

      expect(serialized.sex_and_age_disaggregation).toBe(false);
      expect(serialized).not.toHaveProperty('how_many');
      expect(serialized.women).toBe(7);
      expect(serialized.women_youth).toBe(2);
      expect(serialized.men).toBe(4);
      expect(serialized.men_youth).toBe(1);
      expect(serialized.women_youth).toBeLessThanOrEqual(
        serialized.women as number,
      );
      expect(serialized.men_youth).toBeLessThanOrEqual(
        serialized.men as number,
      );
    });
  });

  describe('role filters (homologation.md §12.5, DC-4, R-PRMS-007)', () => {
    it('drops Innovation Dev rows from a mixed-role fixture', () => {
      const payload = builtBlock(
        useAggregate({
          actors: [
            disaggregatedUseActor,
            {
              result_actors_id: 202,
              actor_type_id: 1,
              actor_role_id: ActorRolesEnum.INNOVATION_DEV,
              sex_age_disaggregation_not_apply: true,
              actors_count: 999,
              actor_type_custom_name: 'DEV-ONLY-ACTOR',
            },
          ],
          institution_types: [
            {
              institution_type_id: 10,
              organization_count: 4,
              institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
            },
            {
              institution_type_id: 99,
              organization_count: 888,
              institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
            },
          ],
          quantifications: [
            completeUseMeasure,
            {
              unit: 'DEV-EXTRAPOLATE-UNIT',
              quantification_number: 777,
              quantification_role_id:
                QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
            },
            {
              unit: 'DEV-ACTUAL-UNIT',
              quantification_number: 999,
              quantification_role_id: QuantificationRolesEnum.ACTUAL_COUNT,
            },
          ],
        }),
      );

      const numbers = payload.current_innovation_use_numbers as Record<
        string,
        unknown
      >;
      const json = JSON.stringify(payload);

      expect(numbers.actors).toEqual([
        {
          result_actors_id: 101,
          actor_type_id: 2,
          actor_type_name: SEEDED_ACTOR_TYPE_NAMES[2],
          sex_and_age_disaggregation: false,
          women: 7,
          women_youth: 2,
          men: 4,
          men_youth: 1,
        },
      ]);
      expect(numbers.organization).toEqual([
        { institution_types_id: 10, how_many: 4 },
      ]);
      expect(numbers.measures).toEqual([
        { unit_of_measure: 'hectares', quantity: 12 },
      ]);
      expect(json).not.toContain('DEV-ONLY-ACTOR');
      expect(json).not.toContain('DEV-EXTRAPOLATE-UNIT');
      expect(json).not.toContain('DEV-ACTUAL-UNIT');
      expect(json).not.toContain('"institution_types_id":99');
    });
  });

  describe('P-1 omitted fields (homologation.md §1.4 / §8.2, R-PRMS-007 AC.4, DC-5)', () => {
    it('omits usd_budget, is_determined and innov_use_to_be_determined', () => {
      const payload = builtRoot(
        useAggregate({
          actors: [disaggregatedUseActor],
          quantifications: [completeUseMeasure],
        }),
      );
      const json = JSON.stringify(payload);

      expect(payload).not.toHaveProperty('usd_budget');
      expect(payload).not.toHaveProperty('is_determined');
      expect(payload).not.toHaveProperty('innov_use_to_be_determined');
      expect(json).not.toContain('usd_budget');
      expect(json).not.toContain('is_determined');
      expect(json).not.toContain('innov_use_to_be_determined');
    });
  });

  describe('legacy boolean columns (homologation.md §8.3, R-PRMS-007 AC.3)', () => {
    it('reads *_count columns and never the four boolean legacy names', () => {
      const payload = builtBlock(
        useAggregate({
          actors: [disaggregatedUseActor],
          quantifications: [completeUseMeasure],
        }),
      );
      const actor = (
        (payload.current_innovation_use_numbers as Record<string, unknown>)
          .actors as Record<string, unknown>[]
      )[0];

      expect(actor.women).toBe(7);
      expect(actor.women_youth).toBe(2);
      expect(typeof actor.women_youth).toBe('number');
      expect(actor.women_youth).not.toBe(true);
    });
  });

  describe('measures completeness (homologation.md §8.5)', () => {
    it('keeps quantity 0 and drops incomplete extras, refusing when none survive', () => {
      const zero = builtBlock(
        useAggregate({
          actors: [disaggregatedUseActor],
          quantifications: [
            {
              unit: 'trials',
              quantification_number: 0,
              quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
            },
            {
              unit: '   ',
              quantification_number: 4,
              quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
            },
            {
              unit: 'orphans',
              quantification_number: null,
              quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
            },
          ],
        }),
      );
      expect(
        (zero.current_innovation_use_numbers as Record<string, unknown>)
          .measures,
      ).toEqual([{ unit_of_measure: 'trials', quantity: 0 }]);

      const empty = useAggregate({
        actors: [disaggregatedUseActor],
        quantifications: [
          {
            unit: '   ',
            quantification_number: 4,
            quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
          },
        ],
      });
      expect(() => builder.build(empty)).toThrow(PrmsPayloadBuildError);
      expect(() => builder.build(empty)).toThrow(/measures/);
    });
  });

  describe('nesting (homologation.md §8 D-B — inferred by analogy, not T-01 confirmed)', () => {
    it('places the type-specific block under innovation_use', () => {
      const payload = builtRoot(
        useAggregate({
          actors: [disaggregatedUseActor],
          quantifications: [completeUseMeasure],
        }),
      );
      expect(Object.keys(payload)).toEqual(['innovation_use']);
      expect(payload.innovation_use).toHaveProperty('innovation_use_level');
      expect(payload).not.toHaveProperty('innovation_use_level');
    });
  });
});
