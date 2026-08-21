import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { ClarisaActorTypesEnum } from '../../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';

/**
 * T-02 (R-IUA-004 AC.3, AC.4 + scenario `The two modes cannot both be populated`).
 *
 * Cross-field, per-row constraint: an actor row's aggregate count
 * (`actors_count`) and its four disaggregated counts are mutually exclusive,
 * driven by `sex_age_disaggregation_not_apply`. Attached to each count field
 * individually rather than to the mode flag itself, so the check is gated by
 * *that field's own* `@IsOptional()` presence condition — a field that is
 * genuinely absent cannot conflict with anything, and does not need the rule
 * to run. Attaching it to `sex_age_disaggregation_not_apply` instead would
 * have the rule silently skipped whenever the flag itself is absent (the
 * exact "false/absent" case AC.4 must still catch).
 */
@ValidatorConstraint({ name: 'isActorCountModeExclusive', async: false })
class IsActorCountModeExclusiveConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null) return true;
    const row = args.object as InnovationUseActorDto;
    const mode = args.constraints[0] as 'aggregate' | 'disaggregated';
    const disaggregationNotApply =
      row.sex_age_disaggregation_not_apply === true;
    return mode === 'disaggregated'
      ? !disaggregationNotApply
      : disaggregationNotApply;
  }

  defaultMessage(args: ValidationArguments): string {
    const mode = args.constraints[0] as 'aggregate' | 'disaggregated';
    return mode === 'disaggregated'
      ? `${args.property}: sex_age_disaggregation_not_apply is true, so a disaggregated count must not be supplied`
      : `${args.property}: sex_age_disaggregation_not_apply is not true, so actors_count must not be supplied`;
  }
}

function IsExclusiveOfActorMode(
  mode: 'aggregate' | 'disaggregated',
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isActorCountModeExclusive',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [mode],
      validator: IsActorCountModeExclusiveConstraint,
    });
  };
}

export class InnovationUseActorDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_actors_id?: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  actor_type_id!: number;

  @ValidateIf(
    (o: InnovationUseActorDto) =>
      o.actor_type_id === ClarisaActorTypesEnum.OTHER,
  )
  @Matches(/\S/, {
    message: 'actor_type_custom_name is required when actor_type_id is OTHER',
  })
  @ApiProperty({ required: false })
  actor_type_custom_name?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  sex_age_disaggregation_not_apply?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  women_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  women_not_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  men_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  men_not_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('aggregate')
  @ApiProperty({ required: false })
  actors_count?: number;
}

export class InnovationUseOrganizationDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_institution_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  institution_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  sub_institution_type_id?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  institution_type_custom_name?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  is_organization_known?: boolean;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  institution_id?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiProperty({ required: false })
  organization_count?: number;
}

export class InnovationUseQuantificationDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  id?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiProperty({ required: false })
  quantification_number?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  unit?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;
}

export class CreateResultInnovationUseDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_use_level_id?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_use_level_explanation?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseActorDto)
  @ApiProperty({ type: [InnovationUseActorDto], required: false })
  actors?: InnovationUseActorDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseOrganizationDto)
  @ApiProperty({ type: [InnovationUseOrganizationDto], required: false })
  organizations?: InnovationUseOrganizationDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseQuantificationDto)
  @ApiProperty({ type: [InnovationUseQuantificationDto], required: false })
  quantifications?: InnovationUseQuantificationDto[];
}
