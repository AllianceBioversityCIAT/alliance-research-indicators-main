export interface GetInstitution {
  description: string;
  code: number;
  acronym: string;
  name: string;
  // aux
  html_full_name: string;
  institution_id: number;
  institution_role_id: number;
  institution_location_name: string;
  region_id: number;
  isoAlpha2?: string;
  is_active: boolean;
  websiteLink: string;
  added: string;
  institution_type_id: number;
  institution_locations: Institutionlocation[];
  institution_type: Institutiontype;
  disabled: boolean;
}

interface Institutiontype {
  is_active: boolean;
  code: number;
  name: string;
  description: string;
  parent_code: null;
}

interface Institutionlocation {
  code: number;
  name: string;
  institution_id: number;
  isoAlpha2: string;
  isHeadquarter: boolean;
}
