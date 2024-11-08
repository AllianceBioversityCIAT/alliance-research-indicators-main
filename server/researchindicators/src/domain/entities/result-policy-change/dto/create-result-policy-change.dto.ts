import { ApiProperty } from '@nestjs/swagger';

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
    type: Number,
    isArray: true,
  })
  public implementing_organization: number[];

  @ApiProperty({
    name: 'innovation_development',
    description: 'Innovation Development',
    type: Number,
    isArray: true,
  })
  public innovation_development: number[];

  @ApiProperty({
    name: 'innovation_use',
    description: 'Innovation Use',
    type: Number,
    isArray: true,
  })
  public innovation_use: number[];
}
