import { ControlListServices } from './services.interface';

export interface GlobalAlert {
  severity: 'success' | 'confirm' | 'info' | 'warning' | 'error' | 'secondary' | 'contrast' | 'delete' | 'processing';
  summary: string;
  detail: string;
  callbacks?: Callback[];
  placeholder?: string;
  icon?: string;
  iconClass?: string;
  color?: string;
  buttonIconClass?: string;
  selectorLabel?: string;
  selectorRequired?: boolean;
  commentLabel?: string;
  commentRequired?: boolean;
  commentAsTextArea?: boolean;
  confirmCallback?: Callback;
  cancelCallback?: Callback;
  hasNoButton?: boolean;
  hasNoCancelButton?: boolean;
  generalButton?: boolean;
  buttonColor?: string;
  serviceName?: ControlListServices;
  autoHideDuration?: number;
  hideCancelButton?: boolean;
  hideCloseButton?: boolean;
  onDetailLinkClick?: () => void;
}

interface Callback {
  label: string;
  event?: (data?: { comment?: string; selected?: string }) => void;
}
