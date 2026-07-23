export interface Configuration {
  id?: number;
  section?: string;
  name?: string;
  value?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  all?: boolean;
  self?: boolean;
}
