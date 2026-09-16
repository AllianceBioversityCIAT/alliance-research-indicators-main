import { Injectable } from '@nestjs/common';
import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';
import { PrmsNormalizerRequestDto } from '../dto/prms-normalizer.dto';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import {
  IndicatorTypeHomologation,
  PrmsIndicatorType,
} from '../homologation/indicator-type.homologation';
import { CapacitySharingBuilder } from './capacity-sharing.builder';
import {
  CommonFieldsBuilder,
  PrmsPayloadBuildError,
} from './common-fields.builder';
import { InnovationDevelopmentBuilder } from './innovation-development.builder';
import { InnovationUseBuilder } from './innovation-use.builder';
import { KnowledgeProductBuilder } from './knowledge-product.builder';
import { PolicyChangeBuilder } from './policy-change.builder';

/**
 * Envelope constants transcribed from homologation.md §2 Envelope:
 * `tenant` ⚫ Constant `"prms.result-management.api"`
 * `op` ⚫ Constant `"dataset.ingest.requested"`
 */
export const PRMS_INGEST_TENANT = 'prms.result-management.api';
export const PRMS_INGEST_OP = 'dataset.ingest.requested';

@Injectable()
export class PayloadBuilder {
  constructor(
    private readonly commonFields: CommonFieldsBuilder,
    private readonly capacitySharing: CapacitySharingBuilder,
    private readonly innovationDevelopment: InnovationDevelopmentBuilder,
    private readonly policyChange: PolicyChangeBuilder,
    private readonly innovationUse: InnovationUseBuilder,
    private readonly knowledgeProduct: KnowledgeProductBuilder,
  ) {}

  /**
   * Assembles `{ tenant, op, results: [{ type, data }] }` (design.md §5.2 step 4).
   * Common fields stay flat at `data`; the type builder's same-named nested
   * object is merged in (D-B). Gating lives at the endpoint, not here.
   */
  build(aggregate: PrmsSyncAggregate): PrmsNormalizerRequestDto {
    const type = this.resolveType(aggregate.indicator_id);
    const common = this.commonFields.build(aggregate);
    const typeBlock = this.buildTypeBlock(type, aggregate);
    return {
      tenant: PRMS_INGEST_TENANT,
      op: PRMS_INGEST_OP,
      results: [
        {
          type,
          data: { ...common, ...typeBlock },
        },
      ],
    };
  }

  /**
   * The map returns `null` for OICR (5) on purpose. Knowledge Product (3)
   * is mapped so this builder can assemble the type block; production send
   * still refuses it at the gate (`UNMAPPABLE_INDICATORS`). Convert a null
   * map entry — and any id outside the map — into a raised error so the
   * envelope never carries `type: undefined` / `type: null`.
   */
  private resolveType(indicatorId: number | null): PrmsIndicatorType {
    const type =
      indicatorId == null
        ? undefined
        : IndicatorTypeHomologation[indicatorId as IndicatorsEnum];
    if (type == null) {
      throw new PrmsPayloadBuildError(
        `Unmappable indicator_id '${indicatorId}'`,
        'type',
      );
    }
    return type;
  }

  private buildTypeBlock(
    type: PrmsIndicatorType,
    aggregate: PrmsSyncAggregate,
  ): Record<string, unknown> {
    switch (type) {
      case 'capacity_sharing':
        return this.capacitySharing.build(aggregate);
      case 'innovation_development':
        return this.innovationDevelopment.build(aggregate);
      case 'policy_change':
        return this.policyChange.build(aggregate);
      case 'innovation_use':
        return this.innovationUse.build(aggregate);
      case 'knowledge_product':
        return this.knowledgeProduct.build(aggregate);
    }
  }
}
