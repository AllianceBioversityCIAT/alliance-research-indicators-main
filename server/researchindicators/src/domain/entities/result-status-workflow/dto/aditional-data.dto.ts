import { ApiProperty } from '@nestjs/swagger';

export class AditionalDataChangeStatusDto {
  @ApiProperty()
  oicr_internal_code: string;
  @ApiProperty()
  mel_regional_expert: string;
  @ApiProperty()
  sharepoint_link: string;
  @ApiProperty()
  submission_comment: string;
}
