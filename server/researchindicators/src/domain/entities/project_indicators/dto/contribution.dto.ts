export class ContributionDto {
  result_id: number;
  result_official_code: string;
  title: string;
  description: string;
  contribution_value: number;
}

export class IndicatorWithContributionsDto {
  indicator_id: number;
  code: string;
  name: string;
  description: string;
  target_unit: string;
  number_type: string;
  number_format: string;
  target_value: number;
  base_line: number;
  year: number;
  type: string;
  contributions: ContributionDto[];
}
