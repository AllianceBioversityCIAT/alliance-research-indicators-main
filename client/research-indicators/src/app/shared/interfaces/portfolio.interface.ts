export interface Portfolio {
  id?: number;
  portfolio_id?: number;
  name: string;
  description: string;
  start_year: number;
  end_year: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type PortfolioPayload = Pick<Portfolio, 'name' | 'description' | 'start_year' | 'end_year'>;
