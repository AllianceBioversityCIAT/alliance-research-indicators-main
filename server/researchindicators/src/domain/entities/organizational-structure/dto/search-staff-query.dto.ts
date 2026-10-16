import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** B4 query (design 4): at least 2 characters after trimming, otherwise 400. */
export class SearchStaffQueryDto {
  @ApiProperty({
    type: String,
    minLength: 2,
    maxLength: 100,
    description: 'Name or email fragment, at least 2 characters',
    example: 'pére',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search!: string;
}
