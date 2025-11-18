import { ApiProperty } from '@nestjs/swagger';

export class ReviewDto {
  @ApiProperty()
  oicr_internal_code: string;
  @ApiProperty()
  mel_regional_expert: string;
  @ApiProperty()
  sharepoint_link: string;
}
