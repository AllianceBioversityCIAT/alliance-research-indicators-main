export interface AdministrationNavChild {
  label: string;
  link: string;
  icon?: string;
  iconSize?: string;
  s3Image?: string;
  hide?: boolean;
}

export interface AdministrationNavGroup {
  id: string;
  label: string;
  icon?: string;
  iconSize?: string;
  s3Image?: string;
  children: AdministrationNavChild[];
}

export interface AccountSidebarOption {
  icon: string;
  label: string;
  hide: boolean;
  link?: string;
  underConstruction?: boolean;
  action?: () => void;
  logout?: boolean;
}
