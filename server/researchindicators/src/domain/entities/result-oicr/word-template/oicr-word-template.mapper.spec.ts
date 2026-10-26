import * as fs from 'fs';
import * as path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { OicrWordTemplateData } from './dto/oicr-word-template-data.dto';
import {
  OICR_WORD_TEMPLATE_LEAF_IDS,
  OICR_WORD_TEMPLATE_TARGET_IDS,
} from './oicr-word-template.ids';
import { build } from './oicr-word-template.engine';
import { mapOicrWordTemplate } from './oicr-word-template.mapper';

jest.setTimeout(30000);

const TARGET = OICR_WORD_TEMPLATE_TARGET_IDS;
const LEAF = OICR_WORD_TEMPLATE_LEAF_IDS;
const FIXTURE = path.join(__dirname, '__fixtures__', 'oicr-template-2026.docx');
const HANDLE = 'https://hdl.handle.net/10568/554';
const SINGLE_REGION_NAME = 'Eastern Africa';

function data(over: Partial<OicrWordTemplateData> = {}): OicrWordTemplateData {
  return {
    reportingYear: null,
    title: null,
    geoScopeId: null,
    geoComment: null,
    elaboration: null,
    tagId: null,
    previousHandle: null,
    mainProject: null,
    researchAreas: [],
    regions: [],
    countries: [],
    contact: null,
    ...over,
  };
}

function primaryArea(leverId: number, customName: string | null = null) {
  return data({
    researchAreas: [{ leverId, isPrimary: true, customName }],
  });
}

function singleRegion(code: number) {
  return data({
    geoScopeId: 2,
    regions: [{ code, name: SINGLE_REGION_NAME }],
  });
}

describe('mapOicrWordTemplate', () => {
  describe('tag', () => {
    it.each([
      [1, 'New OICR'],
      [2, 'Updated OICR (Same Level of Maturity)'],
      [3, 'Updated OICR (New Level of Maturity)'],
    ] as const)('maps tag %s to %s', (tagId, label) => {
      const fields = mapOicrWordTemplate(
        data({ tagId, previousHandle: HANDLE }),
      );
      expect(fields.tag).toBe(label);
    });

    it('leaves an unmapped tag unselected', () => {
      const fields = mapOicrWordTemplate(
        data({ tagId: 4, previousHandle: HANDLE }),
      );
      expect(fields.tag).toBeNull();
    });

    it('keeps the previous handle empty for tag 1 when a handle is present', () => {
      const fields = mapOicrWordTemplate(
        data({ tagId: 1, previousHandle: HANDLE }),
      );
      expect(fields.previousHandle).toBeNull();
    });

    it('fills the previous handle for tag 2 when a handle is present', () => {
      const fields = mapOicrWordTemplate(
        data({ tagId: 2, previousHandle: HANDLE }),
      );
      expect(fields.previousHandle).toBe(HANDLE);
    });

    it('fills the previous handle for tag 3 when a handle is present', () => {
      const fields = mapOicrWordTemplate(
        data({ tagId: 3, previousHandle: HANDLE }),
      );
      expect(fields.previousHandle).toBe(HANDLE);
    });

    it('gives no previous handle when tag 2 has an empty handle', () => {
      const fields = mapOicrWordTemplate(
        data({ tagId: 2, previousHandle: '' }),
      );
      expect(fields.previousHandle).toBeNull();
    });
  });

  describe('research areas', () => {
    it.each([
      [10, 'Food Environment and Consumer Behavior'],
      [
        11,
        'Multifunctional Landscapes and Agrobiodiversity for People and Nature',
      ],
      [12, 'Climate Action'],
      [14, 'Digital Inclusion'],
      [15, 'Crops for Nutrition and Health '],
      [16, 'PISA'],
      [18, 'Other'],
      [13, null],
    ] as const)(
      'maps research area %s to the Word option',
      (leverId, label) => {
        const fields = mapOicrWordTemplate(primaryArea(leverId));
        expect(fields.primaryResearchAreas).toEqual([label]);
      },
    );

    it('keeps STAR order and splits primary from contributing', () => {
      const fields = mapOicrWordTemplate(
        data({
          researchAreas: [
            { leverId: 14, isPrimary: true, customName: null },
            { leverId: 16, isPrimary: false, customName: null },
            { leverId: 10, isPrimary: true, customName: null },
          ],
        }),
      );
      expect(fields.primaryResearchAreas).toEqual([
        'Digital Inclusion',
        'Food Environment and Consumer Behavior',
      ]);
      expect(fields.contributingResearchAreas).toEqual(['PISA']);
    });

    it('writes one Other custom name per primary Other area', () => {
      const fields = mapOicrWordTemplate(
        data({
          researchAreas: [
            { leverId: 18, isPrimary: true, customName: 'ImpactSF' },
            { leverId: 18, isPrimary: false, customName: 'Not primary' },
            { leverId: 18, isPrimary: true, customName: '' },
          ],
        }),
      );
      expect(fields.primaryResearchAreas).toEqual(['Other', 'Other']);
      expect(fields.contributingResearchAreas).toEqual(['Other']);
      expect(fields.otherSpecify).toEqual(['ImpactSF', null]);
    });
  });

  describe('geographic scope', () => {
    it.each([
      [2, 'Regional'],
      [202, 'Regional'],
      [419, 'Regional'],
      [14, 'Sub-regional'],
    ] as const)(
      'maps a single region code %s under scope Regional',
      (code, label) => {
        expect(mapOicrWordTemplate(singleRegion(code)).geoScope).toBe(label);
      },
    );

    it('maps Regional with no regions to Regional', () => {
      const fields = mapOicrWordTemplate(data({ geoScopeId: 2, regions: [] }));
      expect(fields.geoScope).toBe('Regional');
    });

    it('maps Regional with two regions to Multi-region', () => {
      const fields = mapOicrWordTemplate(
        data({
          geoScopeId: 2,
          regions: [
            { code: 14, name: 'Eastern Africa' },
            { code: 11, name: 'Western Africa' },
          ],
        }),
      );
      expect(fields.geoScope).toBe('Multi-region');
    });

    it.each([
      [1, 'Global'],
      [3, 'Multi-country'],
      [4, 'National'],
      [5, 'Sub-national'],
      [50, null],
      [null, null],
    ] as const)('maps geo scope %s', (geoScopeId, label) => {
      const fields = mapOicrWordTemplate(
        data({
          geoScopeId,
          regions: [{ code: 14, name: SINGLE_REGION_NAME }],
        }),
      );
      expect(fields.geoScope).toBe(label);
    });
  });

  describe('regions and countries', () => {
    it('writes regions, a blank line, then countries with sub-nationals', () => {
      const fields = mapOicrWordTemplate(
        data({
          regions: [
            { code: 14, name: 'Eastern Africa' },
            { code: 11, name: 'Western Africa' },
          ],
          countries: [
            { name: 'Kenya', subNationals: ['Makueni', 'Nairobi'] },
            { name: 'Uganda', subNationals: [] },
          ],
        }),
      );
      expect(fields.regionsCountries).toBe(
        'Regions:\nEastern Africa, Western Africa\n\nCountries:\nKenya (Makueni, Nairobi), Uganda',
      );
    });

    it('omits the Regions block when there are no region names', () => {
      const fields = mapOicrWordTemplate(
        data({
          regions: [],
          countries: [{ name: 'Kenya', subNationals: ['Nairobi'] }],
        }),
      );
      expect(fields.regionsCountries).toBe('Countries:\nKenya (Nairobi)');
    });

    it('omits the Countries block when there are no country names', () => {
      const fields = mapOicrWordTemplate(
        data({
          regions: [{ code: 14, name: 'Eastern Africa' }],
          countries: [],
        }),
      );
      expect(fields.regionsCountries).toBe('Regions:\nEastern Africa');
    });

    it('gives no regions/countries value when both blocks are empty', () => {
      const fields = mapOicrWordTemplate(data({ regions: [], countries: [] }));
      expect(fields.regionsCountries).toBeNull();
    });
  });

  describe('contact and scalar fields', () => {
    it('maps the contact row with center as stored and role Contact Person', () => {
      const fields = mapOicrWordTemplate(
        data({
          contact: {
            firstName: 'Ana',
            lastName: 'Pérez',
            position: 'Scientist',
            center: 'CIAT',
            email: 'ana@example.org',
          },
        }),
      );
      expect(fields.contact).toEqual({
        name: 'Ana Pérez',
        position: 'Scientist',
        affiliation: 'CIAT',
        email: 'ana@example.org',
        role: 'Contact Person',
      });
    });

    it('gives no contact when STAR has no main contact', () => {
      expect(mapOicrWordTemplate(data()).contact).toBeNull();
    });

    it('formats the main project as agreement id, dash, description', () => {
      const fields = mapOicrWordTemplate(
        data({
          mainProject: {
            agreementId: 'D999',
            description: 'Climate-smart seed systems',
          },
        }),
      );
      expect(fields.mainProject).toBe('D999 - Climate-smart seed systems');
    });

    it('copies year, title, comment and elaboration as stored, and drops empties', () => {
      const filled = mapOicrWordTemplate(
        data({
          reportingYear: '2026',
          title: 'STAR-554 title',
          geoComment: 'Focus on semi-arid counties.',
          elaboration: '\u200B\u200B\u200B\u200BLine one.\nLine two',
        }),
      );
      expect(filled.reportingYear).toBe('2026');
      expect(filled.title).toBe('STAR-554 title');
      expect(filled.geoComments).toBe('Focus on semi-arid counties.');
      expect(filled.elaboration).toBe(
        '\u200B\u200B\u200B\u200BLine one.\nLine two',
      );

      const empty = mapOicrWordTemplate(
        data({
          reportingYear: '',
          title: '',
          geoComment: '',
          elaboration: '',
          mainProject: { agreementId: '', description: 'x' },
        }),
      );
      expect(empty.reportingYear).toBeNull();
      expect(empty.title).toBeNull();
      expect(empty.geoComments).toBeNull();
      expect(empty.elaboration).toBeNull();
      expect(empty.mainProject).toBeNull();
    });
  });

  describe('STAR-554-shaped document', () => {
    it('fills every R-OWT-002 field into the template XML', async () => {
      const fields = mapOicrWordTemplate(
        data({
          reportingYear: '2026',
          tagId: 2,
          previousHandle: HANDLE,
          mainProject: {
            agreementId: 'A554',
            description: 'STAR-554 primary contract',
          },
          title: 'STAR-554 outcome title',
          researchAreas: [
            { leverId: 10, isPrimary: true, customName: null },
            { leverId: 14, isPrimary: true, customName: null },
            { leverId: 16, isPrimary: false, customName: null },
          ],
          geoScopeId: 2,
          regions: [
            { code: 14, name: 'Eastern Africa' },
            { code: 11, name: 'Western Africa' },
          ],
          countries: [{ name: 'Kenya', subNationals: ['Makueni', 'Nairobi'] }],
          geoComment: 'Eastern and western Africa focus',
          elaboration:
            '\u200B\u200B\u200B\u200BLine one of STAR-554.\nLine two',
          contact: {
            firstName: 'Ana',
            lastName: 'García',
            position: 'Scientist',
            center: 'CIAT',
            email: 'ana.garcia@cgiar.org',
          },
        }),
      );

      const template = fs.readFileSync(FIXTURE);
      const outXml = await documentXml(await build(template, fields));
      const sourceXml = await documentXml(template);
      const out = parseXml(outXml);
      const source = parseXml(sourceXml);

      expect(textOf(sdtById(out, TARGET.reportingYear))).toBe('2026');
      expect(textOf(sdtById(out, TARGET.tagAs))).toBe(
        'Updated OICR (Same Level of Maturity)',
      );
      expect(textOf(sdtById(out, TARGET.previousHandle))).toBe(HANDLE);
      expect(textOf(sdtById(out, TARGET.mainProject))).toBe(
        'A554 - STAR-554 primary contract',
      );
      expect(textOf(sdtById(out, TARGET.title))).toBe('STAR-554 outcome title');

      const primary = outermostItems(sdtById(out, TARGET.raPrimarySection));
      expect(primary).toHaveLength(2);
      expect(textOf(leafControls(primary[0])[0])).toBe(
        'Food Environment and Consumer Behavior',
      );
      expect(textOf(leafControls(primary[1])[0])).toBe('Digital Inclusion');

      expect(
        outermostItems(sdtById(out, TARGET.raOtherSpecifySection)),
      ).toHaveLength(1);
      expect(textOf(sdtById(out, LEAF.raOtherSpecifyItem))).toBe(
        'Click or tap here to enter text.',
      );

      const contributing = outermostItems(
        sdtById(out, TARGET.raContribSection),
      );
      expect(contributing).toHaveLength(1);
      expect(textOf(sdtById(out, LEAF.raContribDropdown))).toBe('PISA');

      expect(textOf(sdtById(out, TARGET.geoScope))).toBe('Multi-region');
      expect(visibleText(sdtById(out, TARGET.regionsCountries))).toBe(
        'Regions:\nEastern Africa, Western Africa\n\nCountries:\nKenya (Makueni, Nairobi)',
      );
      expect(textOf(sdtById(out, TARGET.geoComments))).toBe(
        'Eastern and western Africa focus',
      );
      expect(visibleText(sdtById(out, TARGET.elaboration))).toBe(
        '\u200B\u200B\u200B\u200BLine one of STAR-554.\nLine two',
      );

      expect(textOf(sdtById(out, LEAF.authorName))).toBe('Ana García');
      expect(textOf(sdtById(out, LEAF.authorPosition))).toBe('Scientist');
      expect(textOf(sdtById(out, LEAF.authorAffiliation))).toBe('CIAT');
      expect(textOf(sdtById(out, LEAF.authorEmail))).toBe(
        'ana.garcia@cgiar.org',
      );
      expect(textOf(sdtById(out, LEAF.authorRole))).toBe('Contact Person');
      expect(textOf(sdtById(out, LEAF.authorOrcid))).toBe(
        textOf(sdtById(source, LEAF.authorOrcid)),
      );
      expect(hasPlaceholderFlag(sdtById(out, LEAF.authorOrcid))).toBe(true);
    });
  });
});

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'text/xml');
}

function firstChild(node: Node, name: string): Element | null {
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    if (children[i].nodeName === name) return children[i] as Element;
  }
  return null;
}

function idOf(sdt: Element): string {
  const pr = firstChild(sdt, 'w:sdtPr');
  const id = pr && firstChild(pr, 'w:id');
  return (id && id.getAttribute('w:val')) || '';
}

function sdtById(doc: Document, wId: string): Element {
  const all = doc.getElementsByTagName('w:sdt');
  for (let i = 0; i < all.length; i++) {
    const sdt = all[i] as Element;
    if (idOf(sdt) === wId) return sdt;
  }
  throw new Error(`document has no control ${wId}`);
}

function textOf(sdt: Element): string {
  const nodes = sdt.getElementsByTagName('w:t');
  let text = '';
  for (let i = 0; i < nodes.length; i++) text += nodes[i].textContent;
  return text;
}

function visibleText(sdt: Element): string {
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (el.nodeName === 'w:t') {
        text += el.textContent ?? '';
        return;
      }
      if (el.nodeName === 'w:br' || el.nodeName === 'w:cr') {
        text += '\n';
        return;
      }
    }
    const children = node.childNodes;
    if (!children) return;
    for (let i = 0; i < children.length; i++) walk(children[i]);
  };
  walk(sdt);
  return text;
}

function hasPlaceholderFlag(sdt: Element): boolean {
  const pr = firstChild(sdt, 'w:sdtPr');
  return !!pr && !!firstChild(pr, 'w:showingPlcHdr');
}

function isRepeatingItem(sdt: Element): boolean {
  const pr = firstChild(sdt, 'w:sdtPr');
  return !!pr && !!firstChild(pr, 'w15:repeatingSectionItem');
}

function outermostItems(section: Element): Element[] {
  const content = firstChild(section, 'w:sdtContent');
  if (!content) return [];
  const items: Element[] = [];
  const nested = content.getElementsByTagName('w:sdt');
  for (let i = 0; i < nested.length; i++) {
    const sdt = nested[i] as Element;
    if (!isRepeatingItem(sdt)) continue;
    let insideAnother = false;
    for (
      let parent = sdt.parentNode;
      parent && parent !== section;
      parent = parent.parentNode
    ) {
      if (parent.nodeName === 'w:sdt' && isRepeatingItem(parent as Element)) {
        insideAnother = true;
        break;
      }
    }
    if (!insideAnother) items.push(sdt);
  }
  return items;
}

function leafControls(item: Element): Element[] {
  const leaves: Element[] = [];
  const nested = item.getElementsByTagName('w:sdt');
  for (let i = 0; i < nested.length; i++) {
    const sdt = nested[i] as Element;
    if (sdt.getElementsByTagName('w:sdt').length === 0) leaves.push(sdt);
  }
  return leaves;
}

async function documentXml(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('word/document.xml missing');
  return entry.async('string');
}
