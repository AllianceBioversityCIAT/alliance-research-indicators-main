import { ApiProperty } from '@nestjs/swagger';

export class AditionalDataChangeStatusDto {
  @ApiProperty()
  oicr_internal_code: string = null;
  @ApiProperty()
  mel_regional_expert: string = null;
  @ApiProperty()
  sharepoint_link: string = null;
  @ApiProperty()
  submission_comment: string = null;
}
