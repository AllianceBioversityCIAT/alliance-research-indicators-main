import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * A1 query parameters. `portfolioId` arrives as a query string, so it must be
 * coerced with `@Type(() => Number)` before `@IsInt()` can validate it
 * (mirrors `ListManagedDto` in `pi-delegates/dto/list-managed.query.dto.ts`).
 */
export class GetCategoriesQueryDto {
  @ApiProperty({
    type: Number,
    description: 'Portfolio id to scope the read',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  portfolioId!: number;
}
