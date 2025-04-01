import { ApiProperty } from '@nestjs/swagger';

export class PartnerRequestCreate {
  @ApiProperty({
    type: String,
    required: true,
    description: 'Name of the institution',
  })
  public name!: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Acronym of the institution',
  })
  public acronym!: string;

  @ApiProperty({
    type: Number,
    required: true,
    description: 'Type of institution',
  })
  public institutionTypeCode!: number;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Country ISO code',
  })
  public hqCountryIso!: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Website link of the institution',
  })
  public websiteLink!: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      'This is the name of the application that is in charge of the connection with clarisa',
  })
  public misAcronym!: string;

  @ApiProperty({
    type: Number,
    required: true,
    description: 'User id',
  })
  public userId!: number;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Is the email of the user who is making the request',
  })
  public externalUserMail!: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'Is the name of the user who is making the request',
  })
  public externalUserName!: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'The comments of the external user that made the request',
  })
  public externalUserComments?: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'The category 1 of the institution',
  })
  public category_1?: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'The category 2 of the institution',
  })
  public category_2?: string;

  @ApiProperty({
    type: String,
    required: true,
    description: 'The url of the platform',
  })
  platformUrl?: string;
}
