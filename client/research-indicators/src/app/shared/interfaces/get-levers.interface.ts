import { PortfolioScopedParams } from './portfolio-config.interface';

export interface GetLevers {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  name: string;
  id: number;
  lever_id?: number;
  short_name: string;
  full_name: string;
  other_names: string;
  icon?: string;
  lever_url?: string;
  type?: string;
  group?: string;
  category?: string;
  parent_id?: number;
  portfolio_id?: number;
  /** Set when the selected item's control-list entry is inactive (see catalog-relation.util). */
  is_catalog_inactive?: boolean;
}

export type GetLeversParams = PortfolioScopedParams;
