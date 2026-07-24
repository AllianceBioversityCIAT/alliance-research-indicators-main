import { MenuItem } from 'primeng/api';

export const CREATE_OICR_STEPPER_SECTIONS = ['general-information', 'contributors', 'geographic-scope', 'general-comments'] as const;

export type CreateOicrStepperSection = (typeof CREATE_OICR_STEPPER_SECTIONS)[number];

export const CREATE_OICR_STEPPER_ITEMS: readonly MenuItem[] = [
  { label: 'General information' },
  { label: 'Contributors' },
  { label: 'Geographic scope' },
  { label: 'General comments' }
];
