import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, ValidateIf } from 'class-validator';
import { ResultInstitution } from '../../result-institutions/entities/result-institution.entity';
import { PolicyTypesEnum } from '../../policy-types/enum/policy-types.enum';
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
      'USD amount — required and non-negative when policy_type_id is Program, Budget, or Investment (3)',
    example: 15000.5,
    type: Number,
  })
  @ValidateIf(
    (o: CreateResultPolicyChangeDto) =>
      o.policy_type_id === PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT,
  )
  @IsNumber()
  @Min(0)
  public usd_amount?: number | null;

  @ApiPropertyOptional({
    name: 'amount_status',
    description:
      'Amount status — required when policy_type_id is Program, Budget, or Investment (3)',
    enum: PolicyAmountStatusEnum,
    example: PolicyAmountStatusEnum.ESTIMATED,
  })
  @ValidateIf(
    (o: CreateResultPolicyChangeDto) =>
      o.policy_type_id === PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT,
  )
  @IsEnum(PolicyAmountStatusEnum)
  @IsString()
  public amount_status?: PolicyAmountStatusEnum | string | null;
}
