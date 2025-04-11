import { ApiProperty } from '@nestjs/swagger';
import { IntellectualPropertyOwnerEnum } from '../../intellectual-property-owners/enum/intellectual-property-owner.enum';

export class UpdateResultCapSharingIpDto {
  @ApiProperty({
    required: false,
    description: 'Restrictions on publicity',
    example: true,
    type: Boolean,
  })
  public publicity_restriction?: boolean;

  @ApiProperty({
    required: false,
    description: 'Requires further development',
    example: true,
    type: Boolean,
  })
  public requires_futher_development?: boolean;

  @ApiProperty({
    required: false,
    description: 'Asset IP Owner ID',
    example: 1,
    type: Number,
    enum: IntellectualPropertyOwnerEnum,
  })
  public asset_ip_owner?: number;

  @ApiProperty({
    required: false,
    description: 'Asset IP Owner Description only if other',
    example: 'Description of the asset IP owner',
    type: String,
  })
  public asset_ip_owner_description?: string;

  @ApiProperty({
    required: false,
    description: 'Potential asset',
    example: true,
    type: Boolean,
  })
  public potential_asset?: boolean;
}
