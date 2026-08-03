export interface StatusIcon {
  name: string;
  color: string;
}

export interface StatusColor {
  text: string;
  border: string;
  background: string | null;
}

export interface StatusConfig {
  icon?: StatusIcon;
  color?: StatusColor;
  image?: string | null;
}

export interface ResultStatus {
  result_status_id?: number;
  name?: string;
  description?: string;
  action_description?: string;
  editable_roles?: number[];
  config?: StatusConfig;
}