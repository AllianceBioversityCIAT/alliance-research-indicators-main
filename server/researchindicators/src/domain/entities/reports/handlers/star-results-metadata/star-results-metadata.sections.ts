import type { ExcelColumnSpec } from '../../core/excel-workbook.types';

type StarRawSectionEntry = {
  label: string;
  fillArgb: string;
};

/**
 * Raw-data section catalog. Band order follows the column array, not this
 * object's insertion order. Values are requirements §1 "intended layout"
 * with colours in 8-digit ARGB (`FF` prefix).
 */
export const STAR_RAW_SECTIONS = {
  GENERAL_INFORMATION: {
    label: 'GENERAL INFORMATION',
    fillArgb: 'FF203C61',
  },
  ALLIANCE_ALIGNMENT: {
    label: 'ALLIANCE ALIGNMENT',
    fillArgb: 'FF2A4783',
  },
  PARTNERS: {
    label: 'PARTNERS',
    fillArgb: 'FF325B94',
  },
  GEOGRAPHIC_SCOPE: {
    label: 'GEOGRAPHIC SCOPE',
    fillArgb: 'FF5A91D3',
  },
  EVIDENCES: {
    label: 'EVIDENCES',
    fillArgb: 'FF64B1DD',
  },
  LINK_TO_RESULT: {
    label: 'LINK TO RESULT',
    fillArgb: 'FF7E57C2',
  },
  IP_RIGHTS: {
    label: 'IP RIGHTS',
    fillArgb: 'FF35749A',
  },
  CAPSHARING_DETAILS: {
    label: 'CAPSHARING DETAILS',
    fillArgb: 'FF4D7C31',
  },
  POLICY_DETAILS: {
    label: 'POLICY DETAILS',
    fillArgb: 'FFDA7842',
  },
  OICR_DETAILS: {
    label: 'OICR DETAILS',
    fillArgb: 'FFD9A041',
  },
  INNOVATION_USE: {
    label: 'INNOVATION USE',
    fillArgb: 'FF6A1B9A',
  },
} as const satisfies Record<string, StarRawSectionEntry>;

export type StarRawSectionKey = keyof typeof STAR_RAW_SECTIONS;

export type StarRawSectionColumn = ExcelColumnSpec & {
  section: StarRawSectionKey;
};
