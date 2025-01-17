import { ApiProperty } from '@nestjs/swagger';

export class CreateSecretDto {
  sender_mis: MisSimpleInfoDto;
  receiver_mis: MisSimpleInfoDto;
}

export class MisSimpleInfoDto {
  @ApiProperty({
    type: String,
    description: 'The acronym of the MIS',
    required: true,
  })
  acronym: string;

  @ApiProperty({
    type: String,
    description: 'The environment of the MIS',
    required: true,
  })
  environment: string;
}
