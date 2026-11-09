import { STAR_RAW_SECTIONS } from './star-results-metadata.sections';

/**
 * Expected labels and fills typed from requirements §1 "The intended layout".
 * Keys are the design §3.1 upper-snake identifiers of those titles.
 */
const INTENDED_LAYOUT = [
  {
    key: 'GENERAL_INFORMATION',
    label: 'GENERAL INFORMATION',
    fillArgb: 'FF203C61',
  },
  {
    key: 'ALLIANCE_ALIGNMENT',
    label: 'ALLIANCE ALIGNMENT',
    fillArgb: 'FF2A4783',
  },
  { key: 'PARTNERS', label: 'PARTNERS', fillArgb: 'FF325B94' },
  {
    key: 'GEOGRAPHIC_SCOPE',
    label: 'GEOGRAPHIC SCOPE',
    fillArgb: 'FF5A91D3',
  },
  { key: 'EVIDENCES', label: 'EVIDENCES', fillArgb: 'FF64B1DD' },
  { key: 'LINK_TO_RESULT', label: 'LINK TO RESULT', fillArgb: 'FF7E57C2' },
  { key: 'IP_RIGHTS', label: 'IP RIGHTS', fillArgb: 'FF35749A' },
  {
    key: 'CAPSHARING_DETAILS',
    label: 'CAPSHARING DETAILS',
    fillArgb: 'FF4D7C31',
  },
  { key: 'POLICY_DETAILS', label: 'POLICY DETAILS', fillArgb: 'FFDA7842' },
  { key: 'OICR_DETAILS', label: 'OICR DETAILS', fillArgb: 'FFD9A041' },
  { key: 'INNOVATION_USE', label: 'INNOVATION USE', fillArgb: 'FF6A1B9A' },
  {
    key: 'INNOVATION_DEVELOPMENT',
    label: 'INNOVATION DEVELOPMENT',
    fillArgb: 'FF00897B',
  },
] as const;

describe('STAR_RAW_SECTIONS', () => {
  it('declares the 12 sections of the intended layout', () => {
    expect(Object.keys(STAR_RAW_SECTIONS)).toHaveLength(12);
    expect(
      (
        Object.keys(STAR_RAW_SECTIONS) as (keyof typeof STAR_RAW_SECTIONS)[]
      ).map((key) => ({
        key,
        label: STAR_RAW_SECTIONS[key].label,
        fillArgb: STAR_RAW_SECTIONS[key].fillArgb,
      })),
    ).toEqual([...INTENDED_LAYOUT]);
  });

  it('stores every colour as 8-digit ARGB with the FF prefix', () => {
    for (const section of Object.values(STAR_RAW_SECTIONS)) {
      expect(section.fillArgb).toMatch(/^FF[0-9A-F]{6}$/);
    }
  });
});
