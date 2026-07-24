export class DataCache {
  access_token = '';
  refresh_token = '';
  user: UserCache = {} as UserCache;
  exp = 0;
}

export interface UserCache {
  is_active: boolean;
  sec_user_id: number;
  first_name: string;
  last_name: string;
  roleName: string;
  email: string;
  status_id: number;
  user_role_list: Userrolelist[];
}

interface Userrolelist {
  is_active: boolean;
  user_id: number;
  role_id: number;
  role: Role;
}

interface Role {
  is_active: boolean;
  justification_update: null;
  sec_role_id: number;
  name: string;
  focus_id: number;
}
