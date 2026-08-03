export class PatchPartners {
  institutions: Institution[] = [];
  is_partner_not_applicable = false;
}

export interface Institution {
  institution_id: number;
  institution_role_id: number;
}
