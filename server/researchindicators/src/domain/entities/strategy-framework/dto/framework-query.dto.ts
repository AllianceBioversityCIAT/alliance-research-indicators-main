import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

/** A1, A1e and A9 years. `portfolioId` is required. */
export class PortfolioIdQueryDto {
  @ApiProperty({ type: Number, example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  portfolioId!: number;
}

/** A9 list. Both query fields are required. */
export class ObjectivesQueryDto extends PortfolioIdQueryDto {
  @ApiProperty({ type: Number, example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  year!: number;
}

/**
 * A2. Comma-separated ids (or a repeated parameter). The 200-id cap and the
 * positive-integer rule live in `FrameworkReadService.resolve`, so the
 * in-process API and the endpoint reject the same input.
 */
export class FrameworkResolveQueryDto {
  @ApiProperty({
    type: String,
    example: '1,2',
    description:
      'Element ids, comma-separated, at most 200 positive integers. An unknown id is returned as { id, missing: true }.',
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return value;
    const parts = Array.isArray(value) ? value : String(value).split(',');
    return parts
      .flatMap((part) => String(part).split(','))
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => Number(part));
  })
  @IsArray()
  ids!: number[];
}

/**
 * A3. Two shapes: `portfolioId` plus optional `parentId` (absent = root), or
 * `portfolioId`, `year` and `kind=IOB`. `year` is required only for an IOB.
 */
export class CodeProposalQueryDto extends PortfolioIdQueryDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'Parent element. Absent proposes a root code.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({
    enum: ['IOB'],
    description: 'When IOB, the proposal is IOB-n for portfolioId and year.',
  })
  @IsOptional()
  @IsIn(['IOB'])
  kind?: 'IOB';

  @ApiPropertyOptional({
    type: Number,
    example: 2026,
    description: 'Required when kind is IOB. Otherwise ignored.',
  })
  @Type(() => Number)
  @ValidateIf((query: CodeProposalQueryDto) => query.kind === 'IOB')
  @IsInt()
  @Min(1)
  year?: number;
}
