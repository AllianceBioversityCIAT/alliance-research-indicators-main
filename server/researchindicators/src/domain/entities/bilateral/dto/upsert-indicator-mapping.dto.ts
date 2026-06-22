import { ApiPropertyOptional } from '@nestjs/swagger';

export class ContributionDto {
  @ApiPropertyOptional({ type: String })
  type?: string;

  @ApiPropertyOptional({ type: String })
  indicator_type!: string;

  [key: string]: unknown;
}

export interface MappingResponse {
  result_code: string;
  lever_code: string;
  lever_name: string;
  indicator_code: string;
  indicator_type: string;
  is_stale: boolean;
}
