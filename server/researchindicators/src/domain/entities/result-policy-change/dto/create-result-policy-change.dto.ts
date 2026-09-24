import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResultInstitution } from '../../result-institutions/entities/result-institution.entity';
import { PolicyAmountStatusEnum } from '../enum/policy-amount-status.enum';

export class CreateResultPolicyChangeDto {
  @ApiProperty({
    name: 'policy_type_id',
    description: 'Policy Type ID',
    example: 1,
    type: Number,
  })
  public policy_type_id: number;

  @ApiProperty({
    name: 'policy_stage_id',
    description: 'Policy Stage ID',
    example: 1,
    type: Number,
  })
  public policy_stage_id: number;

  @ApiProperty({
    name: 'evidence_stage',
    description: 'Evidence Stage',
    example: 'Evidence Stage',
    type: String,
  })
  public evidence_stage: string;

  @ApiProperty({
    name: 'implementing_organization',
    description: 'Link Result Role ID',
    type: ResultInstitution,
    isArray: true,
  })
  public implementing_organization: ResultInstitution[];

  @ApiProperty({
    name: 'innovation_development',
    description: 'Innovation Development',
    type: Number,
  })
  public innovation_development: number;

  @ApiProperty({
    name: 'innovation_use',
    description: 'Innovation Use',
    type: Number,
  })
  public innovation_use: number;

  @ApiPropertyOptional({
    name: 'usd_amount',
    description:
      'USD amount for Program, Budget, or Investment. Zero is valid. Completeness is enforced by the green check, not by save.',
    example: 0,
    type: Number,
  })
  public usd_amount?: number | null;

  @ApiPropertyOptional({
    name: 'amount_status',
    description:
      'Amount status for Program, Budget, or Investment. Completeness is enforced by the green check, not by save.',
    enum: PolicyAmountStatusEnum,
    example: PolicyAmountStatusEnum.ESTIMATED,
  })
  public amount_status?: PolicyAmountStatusEnum | string | null;
}
