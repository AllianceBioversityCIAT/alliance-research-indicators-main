// @akili-spec docs/specs/innovation-use/details-page (T-01 — contract layer)
export class GetInnovationUseDetails {
  innovation_use_level_id: number | undefined = undefined;
  /** The resolved scale point, server-derived. Read-only; never sent. */
  innovation_use_level: number | undefined = undefined;
  innovation_use_level_explanation: string | undefined = undefined;
  actors: InnovationUseActor[] = [];
  organizations: InnovationUseOrganization[] = [];
  quantifications: InnovationUseQuantification[] = [];
}

export class InnovationUseActor {
  result_actors_id: number | undefined = undefined;
  actor_type_id: number | undefined = undefined;
  actor_type_custom_name: string | undefined = undefined;
  sex_age_disaggregation_not_apply = false;
  women_youth_count: number | undefined = undefined;
  women_not_youth_count: number | undefined = undefined;
  men_youth_count: number | undefined = undefined;
  men_not_youth_count: number | undefined = undefined;
  actors_count: number | undefined = undefined;
  /** Derived total, read-only, server-computed. Never sent. */
  total: number | undefined = undefined;
}

export class InnovationUseOrganization {
  result_institution_type_id: number | undefined = undefined;
  institution_id: number | undefined = undefined;
  institution_type_id: number | undefined = undefined;
  sub_institution_type_id: number | undefined = undefined;
  institution_type_custom_name: string | undefined = undefined;
  is_organization_known = false;
  organization_count: number | undefined = undefined;
}

export class InnovationUseQuantification {
  id: number | undefined = undefined;
  quantification_number: number | undefined = undefined;
  unit: string | undefined = undefined;
  description: string | undefined = undefined;
}
