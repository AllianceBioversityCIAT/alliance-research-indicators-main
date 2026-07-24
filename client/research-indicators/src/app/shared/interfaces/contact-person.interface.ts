export interface ContactPersonRow {
  id?: number;
  name?: string;
  position?: string;
  affiliation?: string;
  email?: string;
  role?: string;
  user_id?: string;
  informative_role_id?: number;
}

export interface ContactPersonFormData {
  contact_person_id: number | null;
  role_id: number | null;
}

export interface UserData {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  carnet: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  center: string;
  position?: string;
  affiliation?: string;
}

export interface InformativeRole {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  id: number;
  name: string;
}

export interface ContactPersonResponse {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  result_user_id: number;
  result_id: number;
  user_id: string;
  user_role_id: number;
  informative_role_id: number;
  informativeRole: InformativeRole;
  user: UserData;
}

export interface ContactPersonData {
  data: ContactPersonResponse;
  status: number;
  description: string;
  timestamp: string;
  path: string;
  successfulRequest: boolean;
}
