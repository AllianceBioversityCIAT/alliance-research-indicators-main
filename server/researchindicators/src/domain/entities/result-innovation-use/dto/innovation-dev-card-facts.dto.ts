import { ApiProperty } from '@nestjs/swagger';
import { InnovationDevCardFacts } from '../result-innovation-use.service';

/**
 * `docs/specs/innovation-use/dev-card-details` T-04 (`design.md` §4.2,
 * §2.1; `R-IUC-007` the server half, `R-IUC-008` AC.1-AC.5).
 *
 * Response shape for the **new** targeted-read endpoint
 * (`GET /api/results/innovation-use/innovation-dev-card/:resultCode`).
 * `@ApiProperty`-decorated CLASSES (not interfaces), same pattern as
 * `bilateral-hlos-indicators.response.dto.ts`, so the shape renders at
 * `/swagger` via `@ApiOkResponse({ type: InnovationDevCardFactsDto })` —
 * these are never instantiated, only used as the documented wire shape.
 *
 * **Exactly four keys** (`R-IUC-008` AC.3, `DC-13`): `result_id` plus the
 * three facts. No audit field, no user id, no other section data — adding
 * one here is exactly what the exact-key-set controller assertion
 * reddens on.
 */
export class InnovationDevCardReadinessDto {
  @ApiProperty({
    example: 12,
    description: 'clarisa_innovation_readiness_levels.id',
  })
  id: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 7,
    description: 'Ordinal readiness level — independently nullable (DD-9)',
  })
  level: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Diffusion and scale',
    description: 'CLARISA readiness level name — independently nullable (DD-9)',
  })
  name: string | null;
}

export class InnovationDevCardGeoScopeDto {
  @ApiProperty({ example: 2, description: 'clarisa_geo_scope.code' })
  code: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Regional',
    description: 'CLARISA geo scope name',
  })
  name: string | null;
}

export class InnovationDevCardFactsDto implements InnovationDevCardFacts {
  @ApiProperty({
    example: 19707,
    description:
      'Echoed from the path param — never from a fetched row (`design.md` §4.2, finding #4)',
  })
  result_id: number;

  @ApiProperty({ type: InnovationDevCardReadinessDto, nullable: true })
  innovation_readiness: InnovationDevCardReadinessDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example:
      'A digital advisory service that delivers localized seasonal forecasts to smallholder farmers.',
  })
  description: string | null;

  @ApiProperty({ type: InnovationDevCardGeoScopeDto, nullable: true })
  geo_scope: InnovationDevCardGeoScopeDto | null;
}
