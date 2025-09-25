export class ProjectDto {
  project_id: string;
  project_title: string;
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

export class MainLeverDto {
  main_lever_id: string;
  main_lever: string;
  main_lever_name: string;
}

export class ResultMappedDto {
  id: number;
  official_code: number;
  title: string;
  main_project_id: string;
  main_project: string;
  other_projects: ProjectDto[];
  tag_id: number | null;
  tag_name: string | null;
  outcome_impact_statement: string | null;
  main_levers: MainLeverDto[];
  other_levers: LeverDto[];
  geographic_scope: string | null;
  regions: RegionDto[];
  countries: CountryDto[];
  geographic_scope_comments: string | null;
  handle_link: string | null;
}