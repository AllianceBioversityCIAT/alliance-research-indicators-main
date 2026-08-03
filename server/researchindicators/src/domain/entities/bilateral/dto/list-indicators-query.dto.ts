import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListIndicatorsQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Search by indicator code, name, or type',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by indicator type',
  })
  @IsOptional()
  @IsString()
  indicator_type?: string;
}

export interface IndicatorPanelIndicatorResponse {
  indicator_code: string;
  indicator_name: string;
  indicator_type: string;
  target_description: string | null;
  is_active: boolean;
  is_mapped: boolean;
  is_stale: boolean;
}

export interface IndicatorGroupResponse {
  lever_code: string;
  lever_name: string;
  indicators: IndicatorPanelIndicatorResponse[];
}
