export interface GetAllIndicators {
  is_active?: boolean;
  indicator_id: number;
  name?: string;
  other_names?: null;
  description?: string;
  long_description?: string;
  indicator_type_id?: number;
  icon_src?: string;
  indicatorType?: IndicatorType;
  active?: boolean;
  able?: boolean;
}

interface IndicatorType {
  is_active: boolean;
  indicator_type_id: number;
  name: string;
  other_names: string;
  description: string;
  long_description: string;
}
