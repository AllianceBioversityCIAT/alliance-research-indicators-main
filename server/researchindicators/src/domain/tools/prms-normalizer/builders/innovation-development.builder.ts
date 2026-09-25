import { Injectable } from '@nestjs/common';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { PrmsPayloadBuildError } from './common-fields.builder';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const requireText = (value: unknown, field: string): string => {
  if (value == null || String(value).trim() === '') {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field '${field}'`,
      field,
    );
  }
  return String(value);
};

const requireNumber = (value: unknown, field: string): number => {
  if (value == null || value === '') {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field '${field}'`,
      field,
    );
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field '${field}'`,
      field,
    );
  }
  return parsed;
};

@Injectable()
export class InnovationDevelopmentBuilder {
  /**
   * Type-specific block nested at `innovation_development` (D-B / homologation.md §6).
   *
   * Readiness shape (R-PRMS-005 AC.2): `{ id, name }` — the homologation.md §6
   * field table. T-01 proved schema tolerance of `id`/`name`, `level`, and all
   * three together; which key persists is still unproven because every
   * `innovation_development` spike call was blocked earlier by an unrelated
   * `innovation_typology` catalogue rejection. This is a deliberate choice,
   * not a spike-proven persistence shape.
   *
   * `innovation_developers` is omitted (P-1 / DC-5 / homologation.md §1.4).
   */
  build(aggregate: PrmsSyncAggregate): Record<string, unknown> {
    const slice = aggregate.type_slices?.innovation_dev;
    if (!slice) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'innovation_development'`,
        'innovation_development',
      );
    }

    const typology = asRecord(slice.innovation_type);
    if (!typology) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'innovation_typology'`,
        'innovation_typology',
      );
    }

    const readiness = asRecord(slice.innovation_readiness);
    if (!readiness) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'innovation_readiness_level'`,
        'innovation_readiness_level',
      );
    }

    return {
      innovation_development: {
        innovation_typology: {
          code: requireNumber(typology.code, 'innovation_typology.code'),
          name: requireText(typology.name, 'innovation_typology.name'),
        },
        innovation_readiness_level: {
          id: requireNumber(readiness.id, 'innovation_readiness_level.id'),
          name: requireText(readiness.name, 'innovation_readiness_level.name'),
        },
      },
    };
  }
}
