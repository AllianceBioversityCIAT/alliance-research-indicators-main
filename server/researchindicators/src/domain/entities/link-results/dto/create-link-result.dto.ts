import { ApiProperty } from '@nestjs/swagger';
import { LinkResult } from '../entities/link-result.entity';

export class CreateLinkResultDto {
  @ApiProperty({
    type: LinkResult,
    required: false,
    description: 'Is a reference to the link result entity',
    isArray: true,
  })
  link_results: LinkResult[];
}
