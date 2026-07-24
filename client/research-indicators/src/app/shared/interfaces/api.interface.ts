export interface GetViewComponents {
  sec_view_component_id: string;
  component_type_id: number;
}

export interface IndicatorTypes {
  is_active: boolean;
  indicator_type_id: number;
  name: string;
  other_names: string;
  long_description: string;
  description: string;
  indicators: Indicator[];
}

export interface Indicator {
  is_active: boolean;
  indicator_id: number;
  name: string;
  description: string;
  long_description: string;
  indicator_type_id: number;
  icon_src: string;
}

export interface IndicatorGroup {
  indicators: Indicator[];
}
