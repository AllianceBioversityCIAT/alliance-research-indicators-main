import { ApiProperty } from '@nestjs/swagger';

export class CreateAppSecretDto {
  @ApiProperty()
  responsible_id: number;
  @ApiProperty({
    required: false,
    description: 'Application name',
    example: 'My Application',
    type: String,
  })
  application_description?: string;
  @ApiProperty({
    isArray: true,
    type: String,
  })
  white_listed_hosts?: string[];
}
