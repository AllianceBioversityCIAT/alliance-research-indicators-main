// @akili-spec docs/specs/changes/my-pi-delegates-ui
//
// Response DTOs for the two enriched GET endpoints:
//
//   GET /pi-delegates?projectId  → ProjectDelegatesResponseDto
//   GET /pi-delegates/by-delegate → DelegateProjectsResponseDto
//
// These types document the enriched shapes in Swagger and give the service
// explicit return types.  They are NOT class-validator-decorated (they are
// response objects, not input DTOs).
import { ApiProperty } from '@nestjs/swagger';

// ─── Sub-objects ──────────────────────────────────────────────────────────────

/**
 * A single delegate's identity — used inside ProjectDelegatesResponseDto.delegates.
 */
export class DelegateSummaryDto {
  @ApiProperty({
    type: Number,
    description: 'sec_users.sec_user_id of the delegate',
    example: 42,
  })
  delegate_user_id!: number;

  @ApiProperty({
    type: String,
    description: "Delegate's full name (first_name + ' ' + last_name)",
    example: 'Juan Carlos Cadavid',
  })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'sec_users.email of the delegate',
    example: 'j.cadavid@cgiar.org',
  })
  email!: string;
}

/**
 * A project summary — used inside DelegateProjectsResponseDto.projects.
 */
export class ProjectSummaryDto {
  @ApiProperty({
    type: String,
    description: 'agresso_contracts.agreement_id (Agresso project code)',
    example: 'G232',
  })
  project_code!: string;

  @ApiProperty({
    type: String,
    description: 'agresso_contracts.description (project name)',
    example: 'CGIAR Fund - PRMS Year 2025',
    nullable: true,
  })
  project_name!: string | null;
}

// ─── Top-level response DTOs ──────────────────────────────────────────────────

/**
 * Enriched response for GET /pi-delegates?projectId.
 *
 * Returns ONE project object with its active delegates.
 * Project fields come from agresso_contracts; delegate identity from sec_users.
 */
export class ProjectDelegatesResponseDto {
  @ApiProperty({
    type: String,
    description: 'agresso_contracts.agreement_id (Agresso project code)',
    example: 'G232',
  })
  project_code!: string;

  @ApiProperty({
    type: String,
    description: 'agresso_contracts.description (project name)',
    nullable: true,
    example: 'CGIAR Fund - PRMS Year 2025',
  })
  project_name!: string | null;

  @ApiProperty({
    type: Boolean,
    description:
      'agresso_contracts.is_pool_funding_contributor — cast from tinyint to boolean',
    example: false,
  })
  is_pool_funding_contributor!: boolean;

  @ApiProperty({
    type: String,
    description: 'agresso_contracts.contract_status',
    nullable: true,
    example: 'COMPLETED',
  })
  status!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'agresso_contracts.start_date',
    nullable: true,
    example: '2025-01-01T04:00:00.000Z',
  })
  start_date!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'agresso_contracts.end_date',
    nullable: true,
    example: '2025-12-31T04:00:00.000Z',
  })
  end_date!: Date | null;

  @ApiProperty({
    type: [DelegateSummaryDto],
    description: 'Active delegates for this project (may be an empty array)',
  })
  delegates!: DelegateSummaryDto[];
}

/**
 * Enriched response for GET /pi-delegates/by-delegate.
 *
 * Returns ONE person object with the active projects they are delegated for.
 * Person fields come from sec_users; project fields from agresso_contracts.
 */
export class DelegateProjectsResponseDto {
  @ApiProperty({
    type: Number,
    description: 'sec_users.sec_user_id of the delegate',
    example: 1,
  })
  delegate_user_id!: number;

  @ApiProperty({
    type: String,
    description: "Delegate's full name (first_name + ' ' + last_name)",
    nullable: true,
    example: 'Juan Carlos Cadavid',
  })
  name!: string | null;

  @ApiProperty({
    type: String,
    description: 'sec_users.email of the delegate',
    nullable: true,
    example: 'j.cadavid@cgiar.org',
  })
  email!: string | null;

  @ApiProperty({
    type: [ProjectSummaryDto],
    description:
      'Active project assignments for this delegate (may be an empty array)',
  })
  projects!: ProjectSummaryDto[];
}
