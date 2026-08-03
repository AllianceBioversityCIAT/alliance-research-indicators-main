export const STATUS_COLOR_MAP: Record<string, { border: string; text: string; background?: string }> = {
  '': { border: '#1689CA', text: '#1689CA' }, // Default fallback
  '0': { border: '#1689CA', text: '#1689CA' },
  '1': { border: '#7C9CB9', text: '#153C71' }, // Ongoing - Blue border, dark blue text
  '2': { border: '#7C9CB9', text: '#112F5C' }, // Completed
  '3': { border: '#F58220', text: '#F58220' }, // Suspended - Orange
  'pool-funding': { border: 'var(--ac-pool-funding-border)', text: 'var(--ac-pool-funding-fg)' },
  'pf-synced': { border: 'var(--ac-grey-700)', text: 'var(--ac-grey-700)' }
};
