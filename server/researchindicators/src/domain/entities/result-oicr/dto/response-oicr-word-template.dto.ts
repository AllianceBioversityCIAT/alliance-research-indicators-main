export class ProjectDto {
  project_id: string;
  project_title: string;
}

export class TagDto {
  tag_id: number;
  tag_name: string;
}

export class LeverDto {
  lever_id: string;
  lever_short: string;
  lever_full: string;
}

export class RegionDto {
  region_code: string;
  region_name: string;
}

export class CountryDto {
  country_code: string;
  country_name: string;
}

export class ResultMappedDto {
  id: number;
  official_code: number;
  title: string;
  main_project_id: string;
  main_project: string;
  other_projects: ProjectDto[];
  tags: TagDto[];
  outcome_impact_statement: string;
  main_lever_id: string | null;  // Puede ser null por LEFT JOIN
  main_lever_short: string | null;  // Puede ser null por LEFT JOIN
  main_lever_full: string | null;  // Puede ser null por LEFT JOIN
  other_levers: LeverDto[];
  geographic_scope: string;
  regions: RegionDto[];
  countries: CountryDto[];
  geographic_scope_comments: string;
}