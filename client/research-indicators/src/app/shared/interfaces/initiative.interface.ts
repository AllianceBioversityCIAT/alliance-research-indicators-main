export interface Initiative {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  id: number;
  name: string;
  short_name: string;
  official_code: string;
  type_id: number;
  active: boolean;
  status: string;
  stageId: number;
  description: string;
  action_area_id: number;
  action_area_description: string;
}
