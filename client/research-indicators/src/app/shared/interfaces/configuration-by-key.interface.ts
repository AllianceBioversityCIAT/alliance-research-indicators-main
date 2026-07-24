export interface ConfigurationByKeyResponse {
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  key?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  field?: string;
  simple_value: string | null;
  json_value: null;
}
