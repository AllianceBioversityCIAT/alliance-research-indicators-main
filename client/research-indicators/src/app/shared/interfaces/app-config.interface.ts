export type AppConfigSortField = 'category' | 'subcategory' | 'key';
export type AppConfigSortOrder = 'ASC' | 'DESC';

export interface AppConfigListItem {
  key: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  simple_value: string | null;
  json_value: Record<string, unknown> | null;
  updated_at: string;
  updated_by: string | null;
}

export interface AppConfigCategoriesResponse {
  categories: (string | null)[];
  subcategories: (string | null)[];
}

export interface AppConfigListQuery {
  search?: string;
  category?: string;
  subcategory?: string;
  sortField?: AppConfigSortField;
  sortOrder?: AppConfigSortOrder;
}

export interface AppConfigListPagination {
  total: number;
  page: number;
  limit: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AppConfigListResponse {
  data: AppConfigListItem[];
  pagination?: AppConfigListPagination;
}

export interface UpdateAppConfigDto {
  description?: string;
  simple_value?: string;
  json_value?: Record<string, unknown> | null;
  category?: string;
  subcategory?: string;
}
