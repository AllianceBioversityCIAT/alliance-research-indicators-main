import { Injectable } from '@nestjs/common';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { PrmsPayloadBuildError } from './common-fields.builder';

/**
 * TIP importer writes this literal as `evidence_description` for the handle
 * row (`tip-integration.service.ts`). It is almost certainly a typo for
 * "Handle"; match it exactly so a future reader does not "fix" the discriminator.
 */
const HANDLED_EVIDENCE_DESCRIPTION = 'Handled';

/**
 * Type-specific block for `knowledge_product`. PRMS takes exactly one field
 * (`handle`) and resolves metadata from the repository via that identifier.
 * Nesting under `knowledge_product` is D-B, confirmed by the KP spike.
 */
@Injectable()
export class KnowledgeProductBuilder {
  build(aggregate: PrmsSyncAggregate): Record<string, unknown> {
    const rows = Array.isArray(aggregate.evidence) ? aggregate.evidence : [];
    const handled = rows.find(
      (row) => row.description === HANDLED_EVIDENCE_DESCRIPTION,
    );
    const handle = String(handled?.link ?? '').trim();
    if (!handle) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'handle'`,
        'handle',
      );
    }

    return {
      knowledge_product: {
        handle,
      },
    };
  }
}
