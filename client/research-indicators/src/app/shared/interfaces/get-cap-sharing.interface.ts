export interface SessionFormat {
  session_format_id: number;
  name: string;
}

export interface SessionType {
  session_type_id: number;
  name: string;
}

export interface Degree {
  is_active: boolean;
  degree_id: number;
  name: string;
}

export interface Length {
  is_active: boolean;
  length_id: number;
  name: string;
}

export interface IpOwners {
  id: number;
  name: string;
}

export interface Gender {
  is_active: boolean;
  gender_id: number;
  name: string;
}

export interface GetCapSharing {
  degree_id?: number;
  session_length_id?: number;
  delivery_modality_id?: number;
  end_date?: string | Date;
  session_format_id?: number;
  session_type_id?: number;
  start_date?: string | Date;
  individual?: Individual;
  training_supervisor?: Trainingsupervisor;
  training_supervisor_languages?: Trainingsupervisorlanguages;
  group?: GroupTraining;
  test?: string;
  loaded?: boolean;
}

interface GroupTraining {
  is_attending_organization: number | boolean | null | undefined;
  session_participants_female: number | null | undefined;
  session_participants_male: number | null | undefined;
  session_participants_non_binary: number | null | undefined;
  session_participants_total: number | null | undefined;
  session_purpose_description: string | null | undefined;
  session_purpose_id: number | null | undefined;
  trainee_organization_representative?: [];
}

interface Trainingsupervisorlanguages {
  is_active?: boolean;
  result_language_id?: number;
  result_id?: number;
  language_id: number | string | null | undefined;
  language_role_id?: number;
  language?: Language;
}

interface Language {
  is_active: boolean;
  id: number;
  name: null;
  iso_alpha_2: string;
  iso_alpha_3: string;
}

interface Trainingsupervisor {
  is_active?: boolean;
  result_user_id?: number;
  result_id?: number;
  user_id: string | number | null | undefined;
  user_role_id?: number;
  user?: User;
}

interface User {
  is_active: boolean;
  carnet: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Individual {
  gender_id?: number;
  trainee_name?: string;
  affiliation?: Affiliation;
  nationality?: Nationality;
}

interface Nationality {
  is_active?: boolean;
  result_country_id?: number;
  result_id?: number;
  isoAlpha2?: string;
  country_role_id?: number;
}

interface Affiliation {
  is_active?: boolean;
  result_institution_id?: number;
  result_id?: number;
  institution_id?: number;
  institution_role_id?: number;
}
