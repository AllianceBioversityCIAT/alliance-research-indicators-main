import { ApiProperty } from '@nestjs/swagger';

export class SaveAuthorContcatDto {
  @ApiProperty()
  user_id!: string;
  @ApiProperty()
  informative_role_id?: number;
}
