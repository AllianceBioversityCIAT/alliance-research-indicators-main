import { ApiProperty } from '@nestjs/swagger';

export class SaveAuthorContcatDto {
  @ApiProperty()
  user_id!: string;
  @ApiProperty()
  informative_role_id?: number;
  @ApiProperty({
    required: false,
    description: 'ORCID iD, format 0000-0000-0000-000X',
    example: '0000-0002-1825-0097',
  })
  orcid?: string;
}
