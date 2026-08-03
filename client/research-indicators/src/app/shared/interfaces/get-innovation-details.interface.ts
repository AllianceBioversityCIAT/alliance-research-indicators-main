export class GetInnovationDetails {
  short_title = '';
  innovation_nature_id: number | undefined = undefined;
  innovation_type_id: number | undefined = undefined;
  innovation_readiness_id: number | undefined = undefined;
  anticipated_users_id: number | undefined = undefined;
  is_new_or_improved_variety: number | undefined = undefined;
  new_or_improved_varieties_count: number | undefined = undefined;
  expected_outcome = '';
  intended_beneficiaries_description = '';
  innovation_readiness_explanation = '';
  actors: Actor[] = [];
  institution_types: InstitutionType[] = [];
  knowledge_sharing_form: KnowledgeSharingForm = new KnowledgeSharingForm();
  scaling_potential_form: ScalingPotentialForm = new ScalingPotentialForm();
}

export class Actor {
  result_actors_id: number | undefined = undefined;
  result_id: number | undefined = undefined;
  actor_type_id: number | undefined = undefined;
  sex_age_disaggregation_not_apply = false;
  women_youth = false;
  women_not_youth = false;
  men_youth = false;
  men_not_youth = false;
  actor_role_id: number | undefined = undefined;
  actor_type_custom_name: string | undefined = undefined;
}

export class InstitutionType {
  result_institution_type_id: number | null = null;
  result_id?: number | null = null;
  institution_type_id?: number | null = null;
  sub_institution_type_id?: number | null = null;
  institution_type_custom_name?: string | null = null;
  is_organization_known = false;
  institution_id?: number | null = null;
}

export class KnowledgeSharingForm {
  is_knowledge_sharing = false;
  dissemination_qualification_id: number | undefined = undefined;
  tool_useful_context = '';
  results_achieved_expected = '';
  tool_function_id: ToolFunction[] = [];
  is_used_beyond_original_context = false;
  adoption_adaptation_context = '';
  other_tools = '';
  other_tools_integration = '';
  link_to_result: LinkToResult[] = [];
}

export class ToolFunction {
  id?: number;
  tool_function_id?: number;
}

export class LinkToResult {
  link_result_id?: number = undefined;
  result_id?: number = undefined;
  other_result_id?: number = undefined;
  link_result_role_id?: number = undefined;
}

export class ScalingPotentialForm {
  is_cheaper_than_alternatives: number | undefined = undefined;
  is_simpler_to_use: number | undefined = undefined;
  does_perform_better: number | undefined = undefined;
  is_desirable_to_users: number | undefined = undefined;
  has_commercial_viability: number | undefined = undefined;
  has_suitable_enabling_environment: number | undefined = undefined;
  has_evidence_of_uptake: number | undefined = undefined;
  expansion_potential_id: number | undefined = undefined;
  expansion_adaptation_details = '';
}
