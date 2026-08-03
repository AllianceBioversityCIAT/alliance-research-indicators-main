export interface MainResponse<T> {
  data: T;
  status: number;
  description: string;
  timestamp: string;
  path: string;
  successfulRequest: boolean;
  errorDetail: ErrorResponse;
}

export class MultiControlListResponse<T> {
  list: T[] = [];
  loading = true;
}

export interface ErrorResponse {
  errors: string;
  detail: string;
  description: string;
}

export interface LoginRes {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface DecodedUserData {
  user_id?: number;
  first_name?: string;
  last_name?: string;
  iat?: number;
  exp?: number;
  letter?: string;
  isLogged: boolean;
}

export class User {
  is_active: boolean | null = false;
  sec_user_id: number | null = 0;
  first_name: string | null = '';
  last_name: string | null = '';
  email: string | null = '';
  status_id: number | null = 0;
  roleName: string | null = '';
  user_role_list: Userrolelist[] = [];
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
  role_id: number;
}

//? Extra

export interface TokenValidation {
  isTokenExpired: boolean;
  token_data?: LoginRes;
}
