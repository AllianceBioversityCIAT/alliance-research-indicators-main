export interface GetSdgs {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  id: number;
  smo_code: number;
  financial_code: string;
  short_name: string;
  full_name: string;
  icon: string;
  result_sdg_id: number;
  color: string;
  clarisa_sdg_id: number;
  description: string;
  select_label?: string;
  /** Set when the selected item's control-list entry is inactive (see catalog-relation.util). */
  is_catalog_inactive?: boolean;
}
