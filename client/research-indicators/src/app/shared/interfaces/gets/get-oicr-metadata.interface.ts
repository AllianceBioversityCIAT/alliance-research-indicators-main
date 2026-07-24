export interface OicrMetadata {
  step_two: StepTwo;
  step_three: StepThree;
  extra_info: ExtraInfo;
}

export interface StepOne {
  main_contact_person: MainContactPerson;
}

export interface MainContactPerson {
  user_id: string;
}

export interface StepTwo {
  contributor_lever: ContributorLever[];
}

export interface ContributorLever {
  lever_id: string | number;
}

export interface StepThree {
  countries: Country[];
  geo_scope_id: number;
  comment_geo_scope: string;
}

export interface Country {
  isoAlpha2: string;
}

export interface ExtraInfo {
  maturity_level: number;
  elaboration_narrative: string;
}
