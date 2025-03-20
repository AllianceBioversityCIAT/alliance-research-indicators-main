import { ApiProperty } from '@nestjs/swagger';

export class ClarisaLeversRawDto {
  @ApiProperty({
    type: Number,
    description: 'The id of the lever',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    type: String,
    description: 'The short name of the lever',
    example: 'Short Name',
  })
  short_name!: string;

  @ApiProperty({
    type: String,
    description: 'The full name of the lever',
    example: 'Full Name',
    required: false,
  })
  full_name?: string;
}
