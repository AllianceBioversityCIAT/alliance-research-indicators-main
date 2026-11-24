export interface PortfolioScopedParams {
  portfolioId?: number | null;
  reportYear?: number | null;
}

export interface PortfolioConfigItem {
  id: number;
  name: string;
  description?: string | null;
  portfolio_id: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  /** Set when the selected item's control-list entry is inactive (see catalog-relation.util). */
  is_catalog_inactive?: boolean;
}
