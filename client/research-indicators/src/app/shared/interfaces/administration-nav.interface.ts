export interface AdministrationNavChild {
  label: string;
  link: string;
  icon?: string;
  iconSize?: string;
  s3Image?: string;
  hide?: boolean;
  // @akili-spec institutional-performance/control-lists — D-CTL-9: one optional nested
  // level so Portfolio Management can group Control Lists / Organizational Structure /
  // Strategy Framework without introducing a new group type (design §6.1).
  children?: AdministrationNavChild[];
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
