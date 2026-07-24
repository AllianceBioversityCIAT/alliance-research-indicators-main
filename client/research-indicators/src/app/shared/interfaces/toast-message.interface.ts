export interface ToastMessage {
  severity: 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'contrast';
  summary: string;
  detail: string;
}
