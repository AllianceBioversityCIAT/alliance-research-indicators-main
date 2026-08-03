export interface GetYear {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  is_active: number;
  deleted_at: string | null;
  report_year: number;
  has_reported: number;
}
