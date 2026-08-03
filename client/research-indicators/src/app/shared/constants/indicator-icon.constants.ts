export interface IndicatorIconResult {
  icon: string;
  color: string;
}

export function getIndicatorIcon(iconSrc?: string, indicatorId?: number): IndicatorIconResult {
  const icon = iconSrc ? `pi ${iconSrc}` : 'pi pi-circle';
  const color = indicatorId === 1 || indicatorId === 2 || indicatorId === 3 ? '#7CB580' : '#F58220';
  
  return { icon, color };
}

