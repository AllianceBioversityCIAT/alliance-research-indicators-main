import { Injectable } from '@nestjs/common';
import { ActorRolesEnum } from '../../../entities/actor-roles/enum/actor-roles.enum';
import { InstitutionTypeRoleEnum } from '../../../entities/institution-type-roles/enum/institution-type-role.enum';
import { QuantificationRolesEnum } from '../../../entities/quantification-roles/enum/quantification-roles.enum';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import {
  PrmsPayloadBuildError,
  sumUserEnteredCounts,
} from './common-fields.builder';

/**
 * Seeded `clarisa_innovation_use_levels` transcribed from migration
 * `1787066437593-createClarisaInnovationUseLevels.ts` (homologation.md §8.1).
 * `id` is not the scale point: id = level + 1. Send `level`, never `id`.
 */
const INNOVATION_USE_LEVELS: Record<number, { level: number; name: string }> = {
  1: { level: 0, name: 'No use' },
  2: { level: 1, name: 'Project lead organization' },
  3: { level: 2, name: 'Partners' },
  4: { level: 3, name: 'Partners' },
  5: { level: 4, name: 'Connected next-user' },
  6: { level: 5, name: 'Connected next-user' },
  7: { level: 6, name: 'Unconnected next-user' },
  8: { level: 7, name: 'Unconnected next-user' },
  9: { level: 8, name: 'End-user / Beneficiaries' },
  10: { level: 9, name: 'End-user / Beneficiaries' },
};

/**
 * Seeded `clarisa_actor_types` transcribed from migration
 * `1761840859164-updateDeleteFunction.ts` (homologation.md §8.3).
 */
const ACTOR_TYPE_NAMES: Record<number, string> = {
  1: 'Farmers / (agro)pastoralist / herders / fishers',
  2: 'Researchers',
  3: 'Extension agents',
  4: 'Policy actors (public or private)',
  5: 'Other',
};

const OTHER_ACTOR_TYPE_ID = 5;

const asBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 0 || value === '0') {
    return false;
  }
  return undefined;
};

const asNumber = (value: unknown): number | null => {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roleId = (row: Record<string, unknown>, key: string): number | null =>
  asNumber(row[key]);

/**
 * Type-specific block for `innovation_use` (homologation.md §8).
 * Nesting under `innovation_use` follows D-B by analogy with the confirmed
 * capacity_sharing / innovation_development / policy_change shapes; this
 * gated type was never called in T-01.
 */
@Injectable()
export class InnovationUseBuilder {
  build(aggregate: PrmsSyncAggregate): Record<string, unknown> {
    const slices = aggregate.type_slices;
    const levelId = asNumber(slices?.innovation_use?.innovation_use_level_id);
    if (levelId == null || INNOVATION_USE_LEVELS[levelId] == null) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'innovation_use_level'`,
        'innovation_use_level',
      );
    }

    const actors = (slices?.actors ?? [])
      .filter(
        (row) => roleId(row, 'actor_role_id') === ActorRolesEnum.INNOVATION_USE,
      )
      .map((row) => mapActor(row));

    if (actors.length === 0) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'actors'`,
        'actors',
      );
    }

    const organization = (slices?.institution_types ?? [])
      .filter(
        (row) =>
          roleId(row, 'institution_type_role_id') ===
          InstitutionTypeRoleEnum.INNOVATION_USE,
      )
      .map((row) => mapOrganization(row));

    const measures = (slices?.quantifications ?? [])
      .filter(
        (row) =>
          roleId(row, 'quantification_role_id') ===
          QuantificationRolesEnum.INNOVATION_USE,
      )
      .map((row) => mapMeasure(row))
      .filter(
        (row): row is { unit_of_measure: string; quantity: number } =>
          row != null,
      );

    if (measures.length === 0) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'measures'`,
        'measures',
      );
    }

    const numbers: Record<string, unknown> = {
      actors,
      measures,
    };
    if (organization.length > 0) {
      numbers.organization = organization;
    }

    return {
      innovation_use: {
        innovation_use_level: INNOVATION_USE_LEVELS[levelId],
        current_innovation_use_numbers: numbers,
      },
    };
  }
}

const mapActor = (row: Record<string, unknown>): Record<string, unknown> => {
  const actorTypeId = asNumber(row.actor_type_id);
  if (actorTypeId == null || ACTOR_TYPE_NAMES[actorTypeId] == null) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'actor_type_id'`,
      'actor_type_id',
    );
  }

  const actor: Record<string, unknown> = {
    actor_type_id: actorTypeId,
    actor_type_name: ACTOR_TYPE_NAMES[actorTypeId],
  };

  const actorId = asNumber(row.result_actors_id);
  if (actorId != null) {
    actor.result_actors_id = actorId;
  }

  if (actorTypeId === OTHER_ACTOR_TYPE_ID) {
    const custom = String(row.actor_type_custom_name ?? '').trim();
    if (!custom) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'other_actor_type'`,
        'other_actor_type',
      );
    }
    actor.other_actor_type = custom;
  }

  const disaggregation = asBoolean(row.sex_age_disaggregation_not_apply);
  if (disaggregation != null) {
    actor.sex_and_age_disaggregation = disaggregation;
  }

  if (disaggregation === true) {
    const howMany = asNumber(row.actors_count);
    if (howMany == null) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'how_many'`,
        'how_many',
      );
    }
    actor.how_many = howMany;
    return actor;
  }

  const women = sumPresentCounts(
    row.women_youth_count,
    row.women_not_youth_count,
  );
  const men = sumPresentCounts(row.men_youth_count, row.men_not_youth_count);
  const womenYouth = asNumber(row.women_youth_count);
  const menYouth = asNumber(row.men_youth_count);

  if (women != null) {
    actor.women = women;
  }
  if (womenYouth != null) {
    actor.women_youth = womenYouth;
  }
  if (men != null) {
    actor.men = men;
  }
  if (menYouth != null) {
    actor.men_youth = menYouth;
  }
  return actor;
};

const sumPresentCounts = (left: unknown, right: unknown): number | null => {
  const youth = asNumber(left);
  const notYouth = asNumber(right);
  if (youth == null && notYouth == null) {
    return null;
  }
  return sumUserEnteredCounts(youth ?? 0, notYouth ?? 0);
};

const mapOrganization = (
  row: Record<string, unknown>,
): Record<string, unknown> => {
  const typeId = asNumber(row.institution_type_id);
  if (typeId == null) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'institution_types_id'`,
      'institution_types_id',
    );
  }
  const org: Record<string, unknown> = { institution_types_id: typeId };
  const howMany = asNumber(row.organization_count);
  if (howMany != null) {
    org.how_many = howMany;
  }
  return org;
};

const mapMeasure = (
  row: Record<string, unknown>,
): { unit_of_measure: string; quantity: number } | null => {
  const unit = String(row.unit ?? '').trim();
  const quantity = asNumber(row.quantification_number);
  if (!unit || quantity == null) {
    return null;
  }
  return { unit_of_measure: unit, quantity };
};
