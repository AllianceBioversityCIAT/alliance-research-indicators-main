import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** One hit from `GET {host}/browse/rest/v1/search/`. */
export interface AgrovocUpstreamResult {
  uri?: string;
  type?: string[];
  prefLabel?: string;
  altLabel?: string;
  lang?: string;
  vocab?: string;
}

/** Body of the AGROVOC search response. The service requires `results` to be an array. */
export interface AgrovocUpstreamResponse {
  results?: AgrovocUpstreamResult[];
}

export class AgrovocTermDto {
  @ApiProperty({
    example: 'https://aims.fao.org/aos/agrovoc/c_7861',
  })
  uri: string;

  @ApiProperty({
    description: 'English prefLabel',
    example: 'training',
  })
  label: string;

  @ApiPropertyOptional({
    description: 'altLabel that matched, when the hit came through a synonym',
    example: 'online training',
  })
  matched_label?: string;
}
