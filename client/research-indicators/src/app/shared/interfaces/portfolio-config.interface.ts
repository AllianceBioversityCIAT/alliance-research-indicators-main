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
}
