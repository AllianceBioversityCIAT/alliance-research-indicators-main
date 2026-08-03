export interface UserStaff {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  carnet: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  center: string;
  full_name?: string;
  user_id?: string;
  _search?: string;
}
