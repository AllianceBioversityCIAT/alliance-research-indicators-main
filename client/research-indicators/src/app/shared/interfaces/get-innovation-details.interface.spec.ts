import {
  GetInnovationDetails,
  Actor,
  InstitutionType,
  KnowledgeSharingForm,
  LinkToResult,
  ScalingPotentialForm,
  ToolFunction
} from './get-innovation-details.interface';

describe('GetInnovationDetails Interface Classes', () => {
  describe('GetInnovationDetails', () => {
    it('should create instance with default values', () => {
      const instance = new GetInnovationDetails();

      expect(instance.short_title).toBe('');
      expect(instance.innovation_nature_id).toBeUndefined();
      expect(instance.innovation_type_id).toBeUndefined();
      expect(instance.innovation_readiness_id).toBeUndefined();
      expect(instance.anticipated_users_id).toBeUndefined();
      expect(instance.is_new_or_improved_variety).toBeUndefined();
      expect(instance.new_or_improved_varieties_count).toBeUndefined();
      expect(instance.expected_outcome).toBe('');
      expect(instance.intended_beneficiaries_description).toBe('');
      expect(instance.actors).toEqual([]);
      expect(instance.institution_types).toEqual([]);
      expect(instance.knowledge_sharing_form).toBeInstanceOf(KnowledgeSharingForm);
      expect(instance.scaling_potential_form).toBeInstanceOf(ScalingPotentialForm);
    });

    it('should allow setting custom values', () => {
      const instance = new GetInnovationDetails();
      instance.short_title = 'Test Innovation';
      instance.innovation_nature_id = 1;
      instance.expected_outcome = 'Expected outcome';

      expect(instance.short_title).toBe('Test Innovation');
      expect(instance.innovation_nature_id).toBe(1);
      expect(instance.expected_outcome).toBe('Expected outcome');
    });
  });

  describe('Actor', () => {
    it('should create instance with default values', () => {
      const instance = new Actor();

      expect(instance.result_actors_id).toBeUndefined();
      expect(instance.result_id).toBeUndefined();
      expect(instance.actor_type_id).toBeUndefined();
      expect(instance.sex_age_disaggregation_not_apply).toBe(false);
      expect(instance.women_youth).toBe(false);
      expect(instance.women_not_youth).toBe(false);
      expect(instance.men_youth).toBe(false);
      expect(instance.men_not_youth).toBe(false);
      expect(instance.actor_role_id).toBeUndefined();
      expect(instance.actor_type_custom_name).toBeUndefined();
    });

    it('should allow setting custom values', () => {
      const instance = new Actor();
      instance.result_actors_id = 1;
      instance.actor_type_custom_name = 'Custom Actor';
      instance.women_youth = true;

      expect(instance.result_actors_id).toBe(1);
      expect(instance.actor_type_custom_name).toBe('Custom Actor');
      expect(instance.women_youth).toBe(true);
    });
  });

  describe('InstitutionType', () => {
    it('should create instance with default values', () => {
      const instance = new InstitutionType();

      expect(instance.result_institution_type_id).toBeNull();
      expect(instance.result_id).toBeNull();
      expect(instance.institution_type_id).toBeNull();
      expect(instance.sub_institution_type_id).toBeNull();
      expect(instance.institution_type_custom_name).toBeNull();
      expect(instance.is_organization_known).toBe(false);
      expect(instance.institution_id).toBeNull();
    });

    it('should allow setting custom values', () => {
      const instance = new InstitutionType();
      instance.result_institution_type_id = 1;
      instance.institution_type_custom_name = 'Custom Institution';
      instance.is_organization_known = true;

      expect(instance.result_institution_type_id).toBe(1);
      expect(instance.institution_type_custom_name).toBe('Custom Institution');
      expect(instance.is_organization_known).toBe(true);
    });
  });

  describe('KnowledgeSharingForm', () => {
    it('should create instance with default values', () => {
      const instance = new KnowledgeSharingForm();

      expect(instance.is_knowledge_sharing).toBe(false);
      expect(instance.dissemination_qualification_id).toBeUndefined();
      expect(instance.tool_useful_context).toBe('');
      expect(instance.results_achieved_expected).toBe('');
      expect(instance.tool_function_id).toEqual([]);
      expect(instance.is_used_beyond_original_context).toBe(false);
      expect(instance.adoption_adaptation_context).toBe('');
      expect(instance.other_tools).toBe('');
      expect(instance.other_tools_integration).toBe('');
      expect(instance.link_to_result).toEqual([]);
    });

    it('should allow setting custom values', () => {
      const instance = new KnowledgeSharingForm();
      instance.is_knowledge_sharing = true;
      instance.tool_useful_context = 'Useful context';
      instance.is_used_beyond_original_context = true;

      expect(instance.is_knowledge_sharing).toBe(true);
      expect(instance.tool_useful_context).toBe('Useful context');
      expect(instance.is_used_beyond_original_context).toBe(true);
    });
  });

  describe('LinkToResult', () => {
    it('should create instance with default values', () => {
      const instance = new LinkToResult();

      expect(instance.link_result_id).toBeUndefined();
      expect(instance.result_id).toBeUndefined();
      expect(instance.other_result_id).toBeUndefined();
      expect(instance.link_result_role_id).toBeUndefined();
    });

    it('should allow setting custom values', () => {
      const instance = new LinkToResult();
      instance.link_result_id = 1;
      instance.result_id = 2;
      instance.other_result_id = 3;
      instance.link_result_role_id = 4;

      expect(instance.link_result_id).toBe(1);
      expect(instance.result_id).toBe(2);
      expect(instance.other_result_id).toBe(3);
      expect(instance.link_result_role_id).toBe(4);
    });

    it('should handle undefined values', () => {
      const instance = new LinkToResult();
      instance.link_result_id = undefined;
      instance.result_id = undefined;
      instance.other_result_id = undefined;
      instance.link_result_role_id = undefined;

      expect(instance.link_result_id).toBeUndefined();
      expect(instance.result_id).toBeUndefined();
      expect(instance.other_result_id).toBeUndefined();
      expect(instance.link_result_role_id).toBeUndefined();
    });

    it('should handle null values', () => {
      const instance = new LinkToResult();
      instance.link_result_id = null as any;
      instance.result_id = null as any;
      instance.other_result_id = null as any;
      instance.link_result_role_id = null as any;

      expect(instance.link_result_id).toBeNull();
      expect(instance.result_id).toBeNull();
      expect(instance.other_result_id).toBeNull();
      expect(instance.link_result_role_id).toBeNull();
    });
  });

  describe('ScalingPotentialForm', () => {
    it('should create instance with default values', () => {
      const instance = new ScalingPotentialForm();

      expect(instance.is_cheaper_than_alternatives).toBeUndefined();
      expect(instance.is_simpler_to_use).toBeUndefined();
      expect(instance.does_perform_better).toBeUndefined();
      expect(instance.is_desirable_to_users).toBeUndefined();
      expect(instance.has_commercial_viability).toBeUndefined();
      expect(instance.has_suitable_enabling_environment).toBeUndefined();
      expect(instance.has_evidence_of_uptake).toBeUndefined();
      expect(instance.expansion_potential_id).toBeUndefined();
      expect(instance.expansion_adaptation_details).toBe('');
    });

    it('should allow setting custom values', () => {
      const instance = new ScalingPotentialForm();
      instance.is_cheaper_than_alternatives = 1;
      instance.is_simpler_to_use = 0;
      instance.expansion_adaptation_details = 'Adaptation details';

      expect(instance.is_cheaper_than_alternatives).toBe(1);
      expect(instance.is_simpler_to_use).toBe(0);
      expect(instance.expansion_adaptation_details).toBe('Adaptation details');
    });
  });

  describe('Integration Tests', () => {
    it('should create complete GetInnovationDetails with all nested objects', () => {
      const innovation = new GetInnovationDetails();

      // Add actors
      const actor = new Actor();
      actor.result_actors_id = 1;
      actor.actor_type_custom_name = 'Test Actor';
      innovation.actors.push(actor);

      // Add institution types
      const institution = new InstitutionType();
      institution.result_institution_type_id = 1;
      institution.institution_type_custom_name = 'Test Institution';
      innovation.institution_types.push(institution);

      // Configure knowledge sharing form
      innovation.knowledge_sharing_form.is_knowledge_sharing = true;
      innovation.knowledge_sharing_form.tool_useful_context = 'Test context';

      // Add link to result
      const link = new LinkToResult();
      link.link_result_id = 1;
      link.result_id = 2;
      innovation.knowledge_sharing_form.link_to_result.push(link);

      // Configure scaling potential form
      innovation.scaling_potential_form.is_cheaper_than_alternatives = 1;
      innovation.scaling_potential_form.expansion_adaptation_details = 'Test details';

      expect(innovation.actors).toHaveLength(1);
      expect(innovation.actors[0].result_actors_id).toBe(1);
      expect(innovation.institution_types).toHaveLength(1);
      expect(innovation.institution_types[0].result_institution_type_id).toBe(1);
      expect(innovation.knowledge_sharing_form.is_knowledge_sharing).toBe(true);
      expect(innovation.knowledge_sharing_form.link_to_result).toHaveLength(1);
      expect(innovation.knowledge_sharing_form.link_to_result[0].link_result_id).toBe(1);
      expect(innovation.scaling_potential_form.is_cheaper_than_alternatives).toBe(1);
    });
  });
});
