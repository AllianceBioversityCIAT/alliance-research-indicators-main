// @akili-spec results/oicr-word-template-2026

import { OicrWordTemplateData } from './dto/oicr-word-template-data.dto';
import {
  OicrWordTemplateContact,
  OicrWordTemplateFields,
} from './oicr-word-template.engine';

/** R-OWT-003 tag labels. Any other id is none. */
const TAG_LABELS: Readonly<Record<number, string>> = {
  1: 'New OICR',
  2: 'Updated OICR (Same Level of Maturity)',
  3: 'Updated OICR (New Level of Maturity)',
};

/**
 * R-OWT-003 research-area labels.
 * Area 15's Word option keeps the trailing space that ships in the template.
 */
const RESEARCH_AREA_LABELS: Readonly<Record<number, string>> = {
  10: 'Food Environment and Consumer Behavior',
  11: 'Multifunctional Landscapes and Agrobiodiversity for People and Nature',
  12: 'Climate Action',
  14: 'Digital Inclusion',
  15: 'Crops for Nutrition and Health ',
  16: 'PISA',
  18: 'Other',
};

const OTHER_AREA_ID = 18;

/**
 * One region in this set, under scope Regional, is the Word option Regional.
 * Continents plus Sub-Saharan Africa (202) and Latin America and the Caribbean (419).
 */
const REGIONAL_REGION_CODES = new Set<number>([
  2, 19, 142, 150, 9, 10, 202, 419,
]);

const UPDATED_TAGS = new Set<number>([2, 3]);

function textOrNone(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return value;
}

function areaLabel(leverId: number | null): string | null {
  if (leverId === null) return null;
  return RESEARCH_AREA_LABELS[leverId] ?? null;
}

function geoScope(
  scopeId: number | null,
  regionCodes: readonly number[],
): string | null {
  if (scopeId === null || scopeId === 50) return null;
  if (scopeId === 1) return 'Global';
  if (scopeId === 2) {
    if (regionCodes.length === 0) return 'Regional';
    if (regionCodes.length > 1) return 'Multi-region';
    return REGIONAL_REGION_CODES.has(regionCodes[0])
      ? 'Regional'
      : 'Sub-regional';
  }
  if (scopeId === 3) return 'Multi-country';
  if (scopeId === 4) return 'National';
  if (scopeId === 5) return 'Sub-national';
  return null;
}

function regionsCountries(data: OicrWordTemplateData): string | null {
  const regionNames = data.regions
    .map((region) => region.name)
    .filter((name) => name !== '');
  const countryNames = data.countries
    .map((country) => {
      if (country.name === '') return '';
      const subs = country.subNationals.filter((name) => name !== '');
      return subs.length
        ? `${country.name} (${subs.join(', ')})`
        : country.name;
    })
    .filter((name) => name !== '');

  const blocks: string[] = [];
  if (regionNames.length) blocks.push(`Regions:\n${regionNames.join(', ')}`);
  if (countryNames.length) {
    blocks.push(`Countries:\n${countryNames.join(', ')}`);
  }
  return blocks.length ? blocks.join('\n\n') : null;
}

function contactRow(
  contact: OicrWordTemplateData['contact'],
): OicrWordTemplateContact | null {
  if (!contact) return null;
  const name = [contact.firstName, contact.lastName]
    .filter((part): part is string => part !== null && part !== '')
    .join(' ');
  return {
    name: name === '' ? null : name,
    position: textOrNone(contact.position),
    affiliation: textOrNone(contact.center),
    email: textOrNone(contact.email),
    role: 'Contact Person',
  };
}

function mainProject(data: OicrWordTemplateData): string | null {
  const project = data.mainProject;
  if (!project) return null;
  const agreementId = textOrNone(project.agreementId);
  const description = textOrNone(project.description);
  if (!agreementId || !description) return null;
  return `${agreementId} - ${description}`;
}

/** STAR modal data in, template field values out. Empty sources stay none. */
export function mapOicrWordTemplate(
  data: OicrWordTemplateData,
): OicrWordTemplateFields {
  const primary = data.researchAreas.filter((area) => area.isPrimary);
  const contributing = data.researchAreas.filter((area) => !area.isPrimary);
  const tagId = data.tagId;

  return {
    reportingYear: textOrNone(data.reportingYear),
    tag: tagId === null ? null : (TAG_LABELS[tagId] ?? null),
    previousHandle:
      tagId !== null && UPDATED_TAGS.has(tagId)
        ? textOrNone(data.previousHandle)
        : null,
    mainProject: mainProject(data),
    title: textOrNone(data.title),
    primaryResearchAreas: primary.map((area) => areaLabel(area.leverId)),
    otherSpecify: primary
      .filter((area) => area.leverId === OTHER_AREA_ID)
      .map((area) => textOrNone(area.customName)),
    contributingResearchAreas: contributing.map((area) =>
      areaLabel(area.leverId),
    ),
    geoScope: geoScope(
      data.geoScopeId,
      data.regions.map((region) => region.code),
    ),
    regionsCountries: regionsCountries(data),
    geoComments: textOrNone(data.geoComment),
    elaboration: textOrNone(data.elaboration),
    contact: contactRow(data.contact),
  };
}
