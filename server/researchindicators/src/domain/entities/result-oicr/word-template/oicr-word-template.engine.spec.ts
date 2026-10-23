import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import {
  OICR_WORD_TEMPLATE_LEAF_IDS,
  OICR_WORD_TEMPLATE_TARGET_IDS,
} from './oicr-word-template.ids';
import {
  OicrWordTemplateFields,
  OicrWordTemplateMissingControlError,
  OicrWordTemplateMissingOptionError,
  OicrWordTemplateUnexpectedStructureError,
  build,
  normalizeText,
} from './oicr-word-template.engine';

jest.setTimeout(30000);

const FIXTURE = path.join(__dirname, '__fixtures__', 'oicr-template-2026.docx');
const TEMPLATE_SHA1 = 'e469c79d7f00fe053c975d0d8b6b3a55b6712658';
const TARGET = OICR_WORD_TEMPLATE_TARGET_IDS;
const LEAF = OICR_WORD_TEMPLATE_LEAF_IDS;
const TARGET_IDS = Object.values(TARGET);

const REVISION_COUNTS = {
  'w:ins': 14,
  'w:del': 5,
  'w:rPrChange': 1,
  'w:tblPrChange': 5,
  'w:tcPrChange': 24,
  'w:trPrChange': 12,
  'w:tblGridChange': 5,
} as const;

const SAMPLE: OicrWordTemplateFields = {
  reportingYear: '2026',
  tag: 'Updated OICR (Same Level of Maturity)',
  previousHandle: 'https://hdl.handle.net/10568/000000',
  mainProject: 'D999 - [SAMPLE] Climate-smart seed systems',
  title: '[SAMPLE] Farmers adopt drought-tolerant beans',
  primaryResearchAreas: ['Climate Action', 'Other'],
  otherSpecify: ['[SAMPLE] ImpactSF team', 'Second other'],
  contributingResearchAreas: [
    'PISA',
    'Food Environment and Consumer Behavior',
    'Crops for Nutrition and Health ',
  ],
  geoScope: 'Multi-region',
  regionsCountries: 'Regions:\nEastern Africa, Western Africa',
  geoComments: '[SAMPLE] Focus on semi-arid counties.',
  elaboration: '[SAMPLE] Line one of the elaboration.\nLine two & a check.',
  contact: {
    name: 'Ana [SAMPLE] Pérez',
    position: 'Scientist',
    affiliation: 'CIAT',
    email: 'a.perez@example.org',
    role: 'Contact Person',
  },
};

const SPECIAL = 'A & B\nC < D\r\nE > F\rG\u000BH\uFFFE\uD800';

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
  throw new Error(`fixture has no control ${wId}`);
}

function textOf(sdt: Element): string {
  const nodes = sdt.getElementsByTagName('w:t');
  let text = '';
  for (let i = 0; i < nodes.length; i++) text += nodes[i].textContent;
  return text;
}

function hasPlaceholderFlag(sdt: Element): boolean {
  const pr = firstChild(sdt, 'w:sdtPr');
  return !!pr && !!firstChild(pr, 'w:showingPlcHdr');
}

function hasPlaceholderStyle(sdt: Element): boolean {
  const styles = sdt.getElementsByTagName('w:rStyle');
  for (let i = 0; i < styles.length; i++) {
    if (
      /Placeholder/i.test((styles[i] as Element).getAttribute('w:val') || '')
    ) {
      return true;
    }
  }
  return false;
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

function prologOf(xml: string): string {
  return xml.slice(0, xml.indexOf('<w:document'));
}

function countTag(xml: string, tag: string): number {
  return parseXml(xml).getElementsByTagName(tag).length;
}

function stripTargets(xml: string): string {
  const doc = parseXml(xml);
  const nodes = TARGET_IDS.map((id) => sdtById(doc, id));
  nodes.forEach((sdt) => {
    if (sdt.parentNode) {
      sdt.parentNode.replaceChild(doc.createTextNode(`[[${idOf(sdt)}]]`), sdt);
    }
  });
  return new XMLSerializer().serializeToString(doc);
}

function firstDiff(
  templateText: string,
  outputText: string,
): { index: number; template: string; output: string } {
  const length = Math.max(templateText.length, outputText.length);
  let index = 0;
  while (index < length && templateText[index] === outputText[index])
    index += 1;
  if (index === length && templateText.length === outputText.length) {
    return { index: templateText.length, template: '', output: '' };
  }
  return {
    index,
    template: templateText.slice(index, index + 48),
    output: outputText.slice(index, index + 48),
  };
}

function sdtIds(xml: string): string[] {
  const doc = parseXml(xml);
  const nodes = doc.getElementsByTagName('w:sdt');
  const ids: string[] = [];
  for (let i = 0; i < nodes.length; i++) ids.push(idOf(nodes[i] as Element));
  return ids;
}

function paraIds(xml: string): string[] {
  const found: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 1) {
      const value = (node as Element).getAttribute('w14:paraId');
      if (value) found.push(value);
    }
    const children = node.childNodes;
    if (!children) return;
    for (let i = 0; i < children.length; i++) walk(children[i]);
  };
  walk(parseXml(xml));
  return found;
}

function selectedOptionMismatches(xml: string): string[] {
  const doc = parseXml(xml);
  const bad: string[] = [];
  const controls = doc.getElementsByTagName('w:sdt');
  for (let i = 0; i < controls.length; i++) {
    const sdt = controls[i] as Element;
    const pr = firstChild(sdt, 'w:sdtPr');
    if (!pr) continue;
    const list =
      firstChild(pr, 'w:dropDownList') || firstChild(pr, 'w:comboBox');
    if (!list || firstChild(pr, 'w:showingPlcHdr')) continue;
    const content = firstChild(sdt, 'w:sdtContent');
    const text = content ? textOf(content) : '';
    const options = Array.from(list.childNodes)
      .filter((node) => node.nodeName === 'w:listItem')
      .map((node) => (node as Element).getAttribute('w:displayText'));
    if (!options.includes(text)) bad.push(text);
  }
  return bad;
}

function paraCarriers(
  root: Element,
): { paraId: string; textId: string | null }[] {
  const found: { paraId: string; textId: string | null }[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 1) {
      const paraId = (node as Element).getAttribute('w14:paraId');
      if (paraId) {
        found.push({
          paraId,
          textId: (node as Element).getAttribute('w14:textId'),
        });
      }
    }
    const children = node.childNodes;
    if (!children) return;
    for (let i = 0; i < children.length; i++) walk(children[i]);
  };
  walk(root);
  return found;
}

async function mutateDocument(
  template: Buffer,
  mutate: (doc: Document) => void,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const original = await zip.file('word/document.xml').async('string');
  const doc = parseXml(original);
  mutate(doc);
  const xml =
    prologOf(original) +
    new XMLSerializer().serializeToString(doc.documentElement);
  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function swapNodes(a: Element, b: Element): void {
  const parentA = a.parentNode;
  const parentB = b.parentNode;
  const nextA = a.nextSibling;
  const nextB = b.nextSibling;
  if (nextA === b) {
    parentB.insertBefore(a, nextB);
    parentA.insertBefore(b, a);
    return;
  }
  if (nextB === a) {
    parentA.insertBefore(b, nextA);
    parentB.insertBefore(a, b);
    return;
  }
  parentA.insertBefore(b, nextA);
  parentB.insertBefore(a, nextB);
}

async function rejection(
  template: Buffer,
  fields: OicrWordTemplateFields,
): Promise<Error> {
  try {
    await build(template, fields);
  } catch (error) {
    return error as Error;
  }
  throw new Error('build resolved a buffer');
}

describe('oicr word template engine', () => {
  let template: Buffer;
  let templateXml: string;

  beforeAll(async () => {
    template = fs.readFileSync(FIXTURE);
    templateXml = await documentXml(template);
  });

  it('uses the byte-identical 2026 template fixture', () => {
    const sha1 = createHash('sha1').update(template).digest('hex');
    expect(sha1).toBe(TEMPLATE_SHA1);
  });

  describe('normalizeText', () => {
    it('folds CR LF and lone CR into LF and drops characters outside XML 1.0 Char', () => {
      expect(normalizeText(SPECIAL)).toBe('A & B\nC < D\nE > F\nGH');
      expect(normalizeText('keep\ttab and \u200B')).toBe(
        'keep\ttab and \u200B',
      );
      expect(normalizeText('\uFFFF\uD800\uDC00')).toBe('\uD800\uDC00');
    });
  });

  describe('null edit', () => {
    it('equals the raw document.xml string read from the template zip', async () => {
      const outXml = await documentXml(await build(template, {}));
      expect(outXml).toBe(templateXml);
    });
  });

  describe('fidelity', () => {
    let out: Buffer;
    let outXml: string;

    beforeAll(async () => {
      out = await build(template, SAMPLE);
      outXml = await documentXml(out);
    });

    it('keeps zip entry order and every other part byte-identical', async () => {
      const source = await JSZip.loadAsync(template);
      const generated = await JSZip.loadAsync(out);
      const namesA = Object.keys(source.files).filter(
        (name) => !source.files[name].dir,
      );
      const namesB = Object.keys(generated.files).filter(
        (name) => !generated.files[name].dir,
      );
      expect(namesB).toEqual(namesA);
      const changed: string[] = [];
      for (const name of namesA) {
        if (name === 'word/document.xml') continue;
        const [left, right] = await Promise.all([
          source.file(name).async('nodebuffer'),
          generated.file(name).async('nodebuffer'),
        ]);
        if (!left.equals(right)) changed.push(name);
      }
      expect(changed).toEqual([]);
      expect(namesA.length).toBeGreaterThan(1);
    });

    it('keeps the XML declaration byte for byte', () => {
      expect(prologOf(outXml)).toBe(prologOf(templateXml));
      expect(prologOf(templateXml)).toBe(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n',
      );
    });

    it('keeps the seven revision counts', () => {
      (
        Object.keys(REVISION_COUNTS) as (keyof typeof REVISION_COUNTS)[]
      ).forEach((tag) => {
        expect(countTag(templateXml, tag)).toBe(REVISION_COUNTS[tag]);
        expect(countTag(outXml, tag)).toBe(REVISION_COUNTS[tag]);
      });
    });

    it('is identical outside the 13 target controls', () => {
      const templateOutside = stripTargets(templateXml);
      const outputOutside = stripTargets(outXml);
      expect(firstDiff(templateOutside, outputOutside)).toEqual({
        index: templateOutside.length,
        template: '',
        output: '',
      });
    });

    it('keeps w:id and w14:paraId unique and paraId below 0x80000000', () => {
      const ids = sdtIds(outXml);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(sdtIds(templateXml).length);
      const paras = paraIds(outXml);
      expect(new Set(paras).size).toBe(paras.length);
      paras.forEach((paraId) => {
        expect(parseInt(paraId, 16)).toBeLessThan(0x80000000);
      });
    });

    it('selects only exact option text', () => {
      expect(selectedOptionMismatches(outXml)).toEqual([]);
    });
  });

  describe('field level', () => {
    it('fills the modal controls and leaves ORCID and Other Contributing Projects untouched', async () => {
      const outXml = await documentXml(await build(template, SAMPLE));
      const out = parseXml(outXml);
      const source = parseXml(templateXml);

      expect(textOf(sdtById(out, TARGET.title))).toBe(SAMPLE.title);
      expect(textOf(sdtById(out, TARGET.reportingYear))).toBe('2026');
      expect(textOf(sdtById(out, TARGET.tagAs))).toBe(SAMPLE.tag);
      expect(textOf(sdtById(out, TARGET.previousHandle))).toBe(
        SAMPLE.previousHandle,
      );
      expect(textOf(sdtById(out, TARGET.mainProject))).toBe(SAMPLE.mainProject);
      expect(textOf(sdtById(out, TARGET.geoScope))).toBe('Multi-region');
      expect(textOf(sdtById(out, TARGET.regionsCountries))).toBe(
        'Regions:\nEastern Africa, Western Africa'.replace(/\n/g, ''),
      );
      expect(textOf(sdtById(out, LEAF.authorName))).toBe(SAMPLE.contact.name);
      expect(textOf(sdtById(out, LEAF.authorPosition))).toBe('Scientist');
      expect(textOf(sdtById(out, LEAF.authorAffiliation))).toBe('CIAT');
      expect(textOf(sdtById(out, LEAF.authorEmail))).toBe(
        'a.perez@example.org',
      );
      expect(textOf(sdtById(out, LEAF.authorRole))).toBe('Contact Person');
      const contribItems = outermostItems(
        sdtById(out, TARGET.raContribSection),
      );
      expect(contribItems).toHaveLength(3);
      expect(textOf(leafControls(contribItems[2])[0])).toBe(
        'Crops for Nutrition and Health ',
      );

      const orcid = sdtById(out, LEAF.authorOrcid);
      expect(hasPlaceholderFlag(orcid)).toBe(true);
      expect(textOf(orcid)).toContain('Click or tap here to enter text');
      expect(textOf(orcid)).toBe(textOf(sdtById(source, LEAF.authorOrcid)));

      const phrase = 'Other Contributing Projects (multi-';
      const windowAround = (xml: string) => {
        const at = xml.indexOf(phrase);
        expect(at).toBeGreaterThan(-1);
        return xml.slice(at - 80, at + phrase.length + 80);
      };
      expect(windowAround(outXml)).toBe(windowAround(templateXml));

      const filled = [
        TARGET.title,
        TARGET.reportingYear,
        TARGET.tagAs,
        TARGET.previousHandle,
        TARGET.mainProject,
        TARGET.geoScope,
        TARGET.regionsCountries,
        TARGET.geoComments,
        TARGET.elaboration,
        LEAF.authorName,
        LEAF.authorRole,
        LEAF.raPrimaryDropdown,
      ];
      filled.forEach((id) => {
        const control = sdtById(out, id);
        expect(hasPlaceholderFlag(control)).toBe(false);
        expect(hasPlaceholderStyle(control)).toBe(false);
      });
    });

    it('renders special characters as escaped text and one break per line ending', async () => {
      const outXml = await documentXml(
        await build(template, { elaboration: SPECIAL }),
      );
      const elaboration = sdtById(parseXml(outXml), TARGET.elaboration);
      const texts = elaboration.getElementsByTagName('w:t');
      const lines: string[] = [];
      for (let i = 0; i < texts.length; i++) lines.push(texts[i].textContent);
      expect(lines).toEqual(['A & B', 'C < D', 'E > F', 'GH']);
      expect(elaboration.getElementsByTagName('w:br').length).toBe(3);
      const raw = new XMLSerializer().serializeToString(elaboration);
      expect(raw).toContain('&amp;');
      expect(raw).toContain('&lt;');
      expect(raw).toContain('&gt;');
      expect(raw.includes('\u000B')).toBe(false);
      expect(raw.includes('\uFFFE')).toBe(false);
      expect(raw.includes('\uD800')).toBe(false);
      expect(textOf(elaboration).includes('\n')).toBe(false);
      expect(textOf(elaboration).includes('\r')).toBe(false);
    });

    it('keeps an empty value as the template placeholder', async () => {
      const outXml = await documentXml(
        await build(template, {
          title: 'Filled',
          geoComments: '',
          previousHandle: null,
        }),
      );
      const out = parseXml(outXml);
      const source = parseXml(templateXml);
      expect(textOf(sdtById(out, TARGET.geoComments))).toBe(
        textOf(sdtById(source, TARGET.geoComments)),
      );
      expect(hasPlaceholderFlag(sdtById(out, TARGET.geoComments))).toBe(true);
      expect(textOf(sdtById(out, TARGET.previousHandle))).toBe(
        'Please enter the previous OICR CGSpace handle',
      );
      expect(hasPlaceholderFlag(sdtById(out, TARGET.previousHandle))).toBe(
        true,
      );
    });
  });

  describe('none labels and repeating rows', () => {
    it('leaves a none label untouched and still clones a row for it', async () => {
      const outXml = await documentXml(
        await build(template, {
          title: 'Filled title',
          tag: null,
          primaryResearchAreas: [null, 'PISA'],
          otherSpecify: ['Alpha', 'Beta'],
        }),
      );
      const out = parseXml(outXml);
      const source = parseXml(templateXml);
      expect(
        new XMLSerializer().serializeToString(sdtById(out, TARGET.tagAs)),
      ).toBe(
        new XMLSerializer().serializeToString(sdtById(source, TARGET.tagAs)),
      );

      const primary = outermostItems(sdtById(out, TARGET.raPrimarySection));
      expect(primary).toHaveLength(2);
      const firstDropdown = sdtById(out, LEAF.raPrimaryDropdown);
      expect(textOf(firstDropdown)).toContain('Choose an item');
      expect(hasPlaceholderFlag(firstDropdown)).toBe(true);
      const secondLeaves = leafControls(primary[1]);
      expect(textOf(secondLeaves[0])).toBe('PISA');
      expect(hasPlaceholderFlag(secondLeaves[0])).toBe(false);

      const originalCarriers = paraCarriers(primary[0]);
      const cloneCarriers = paraCarriers(primary[1]);
      expect(cloneCarriers.map((carrier) => carrier.textId)).toEqual(
        originalCarriers.map((carrier) => carrier.textId),
      );
      expect(cloneCarriers.map((carrier) => carrier.paraId)).not.toEqual(
        originalCarriers.map((carrier) => carrier.paraId),
      );

      const others = outermostItems(sdtById(out, TARGET.raOtherSpecifySection));
      expect(others).toHaveLength(2);
      expect(textOf(others[0])).toBe('Alpha');
      expect(textOf(others[1])).toBe('Beta');
      expect(paraCarriers(others[1]).map((carrier) => carrier.textId)).toEqual(
        paraCarriers(others[0]).map((carrier) => carrier.textId),
      );
    });

    it('keeps a single unselected row when a repeating list is empty', async () => {
      const outXml = await documentXml(
        await build(template, { contributingResearchAreas: [] }),
      );
      const out = parseXml(outXml);
      const items = outermostItems(sdtById(out, TARGET.raContribSection));
      expect(items).toHaveLength(1);
      expect(textOf(sdtById(out, LEAF.raContribDropdown))).toContain(
        'Choose an item',
      );
      expect(hasPlaceholderFlag(sdtById(out, LEAF.raContribDropdown))).toBe(
        true,
      );
    });
  });

  describe('swapped section-15 columns', () => {
    it('still writes each value into its own leaf id', async () => {
      const swapped = await mutateDocument(template, (doc) => {
        swapNodes(
          sdtById(doc, LEAF.authorName),
          sdtById(doc, LEAF.authorPosition),
        );
      });
      const out = parseXml(
        await documentXml(
          await build(swapped, {
            contact: {
              name: 'Name Value',
              position: 'Position Value',
              affiliation: 'CIAT',
              email: 'a@b.c',
              role: 'Contact Person',
            },
          }),
        ),
      );
      expect(textOf(sdtById(out, LEAF.authorName))).toBe('Name Value');
      expect(textOf(sdtById(out, LEAF.authorPosition))).toBe('Position Value');
      expect(textOf(sdtById(out, LEAF.authorAffiliation))).toBe('CIAT');
      expect(textOf(sdtById(out, LEAF.authorEmail))).toBe('a@b.c');
      expect(textOf(sdtById(out, LEAF.authorRole))).toBe('Contact Person');
      expect(hasPlaceholderFlag(sdtById(out, LEAF.authorOrcid))).toBe(true);
    });
  });

  describe('drift guards', () => {
    it('names a removed section id and returns no document', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const id = firstChild(
          firstChild(sdtById(doc, TARGET.raPrimarySection), 'w:sdtPr'),
          'w:id',
        );
        id.setAttribute('w:val', '999');
      });
      const error = await rejection(mutated, {
        title: 'should not be written',
      });
      expect(error).toBeInstanceOf(OicrWordTemplateMissingControlError);
      expect(error.message).toBe(
        'OICR template is missing control raPrimarySection (-1877842743)',
      );
      expect((error as OicrWordTemplateMissingControlError).control).toBe(
        'raPrimarySection:-1877842743',
      );
      expect((error as OicrWordTemplateMissingControlError).reason).toBe(
        'missing',
      );
    });

    it('names a removed pinned leaf id and returns no document', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const id = firstChild(
          firstChild(sdtById(doc, LEAF.authorEmail), 'w:sdtPr'),
          'w:id',
        );
        id.setAttribute('w:val', '999');
      });
      const error = await rejection(mutated, {});
      expect(error).toBeInstanceOf(OicrWordTemplateMissingControlError);
      expect(error.message).toBe(
        'OICR template is missing control authorEmail (1156341516)',
      );
      expect((error as OicrWordTemplateMissingControlError).control).toBe(
        'authorEmail:1156341516',
      );
    });

    it('rejects a second repeating item', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const section = sdtById(doc, TARGET.raContribSection);
        const [item] = outermostItems(section);
        item.parentNode.insertBefore(item.cloneNode(true), item.nextSibling);
      });
      const error = await rejection(mutated, {});
      expect(error).toBeInstanceOf(OicrWordTemplateUnexpectedStructureError);
      expect(error.message).toBe(
        'OICR template control raContribSection has an unexpected structure (expected exactly one repeating item, found 2)',
      );
      expect((error as OicrWordTemplateUnexpectedStructureError).reason).toBe(
        'expected exactly one repeating item, found 2',
      );
    });

    it('rejects a role leaf that is not a combo', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const pr = firstChild(sdtById(doc, LEAF.authorRole), 'w:sdtPr');
        const combo = firstChild(pr, 'w:comboBox');
        const dropdown = doc.createElement('w:dropDownList');
        while (combo.firstChild) dropdown.appendChild(combo.firstChild);
        combo.parentNode.replaceChild(dropdown, combo);
      });
      const error = await rejection(mutated, {});
      expect(error).toBeInstanceOf(OicrWordTemplateUnexpectedStructureError);
      expect(error.message).toBe(
        'OICR template control authorRole has an unexpected structure (expected a combo)',
      );
      expect((error as OicrWordTemplateUnexpectedStructureError).control).toBe(
        'authorRole:-1973903463',
      );
    });

    it('rejects a renamed option instead of skipping it', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const list = firstChild(
          firstChild(sdtById(doc, TARGET.geoScope), 'w:sdtPr'),
          'w:dropDownList',
        );
        const items = list.getElementsByTagName('w:listItem');
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as Element;
          if (item.getAttribute('w:displayText') === 'Global') {
            item.setAttribute('w:displayText', 'GlobalX');
          }
        }
      });
      const error = await rejection(mutated, {
        title: 'should not be written',
        geoScope: 'Global',
      });
      expect(error).toBeInstanceOf(OicrWordTemplateMissingOptionError);
      expect(error.message).toBe(
        'OICR template control geoScope has no option "Global"',
      );
      expect((error as OicrWordTemplateMissingOptionError).control).toBe(
        'geoScope:-547993178',
      );
      expect((error as OicrWordTemplateMissingOptionError).reason).toBe(
        'no option "Global"',
      );
    });

    it('rejects a revision inside a target', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const content = firstChild(sdtById(doc, TARGET.title), 'w:sdtContent');
        const del = doc.createElement('w:del');
        del.setAttribute('w:id', '1');
        del.setAttribute('w:author', 'Probe');
        del.setAttribute('w:date', '2026-01-01T00:00:00Z');
        const run = doc.createElement('w:r');
        const text = doc.createElement('w:t');
        text.appendChild(doc.createTextNode('x'));
        run.appendChild(text);
        del.appendChild(run);
        content.appendChild(del);
      });
      const error = await rejection(mutated, {});
      expect(error).toBeInstanceOf(OicrWordTemplateUnexpectedStructureError);
      expect(error.message).toBe(
        'OICR template control title has an unexpected structure (contains <w:del>)',
      );
    });

    it('rejects a bookmark inside a target', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const content = firstChild(sdtById(doc, TARGET.title), 'w:sdtContent');
        const bookmark = doc.createElement('w:bookmarkStart');
        bookmark.setAttribute('w:id', '900');
        bookmark.setAttribute('w:name', 'probe');
        content.appendChild(bookmark);
      });
      const error = await rejection(mutated, {});
      expect(error).toBeInstanceOf(OicrWordTemplateUnexpectedStructureError);
      expect(error.message).toBe(
        'OICR template control title has an unexpected structure (contains <w:bookmarkStart>)',
      );
    });

    it('names a missing title control and returns no document', async () => {
      const mutated = await mutateDocument(template, (doc) => {
        const id = firstChild(
          firstChild(sdtById(doc, TARGET.title), 'w:sdtPr'),
          'w:id',
        );
        id.setAttribute('w:val', '999');
      });
      const error = await rejection(mutated, { title: 'gone' });
      expect(error).toBeInstanceOf(OicrWordTemplateMissingControlError);
      expect(error.message).toBe(
        'OICR template is missing control title (-1191449392)',
      );
    });
  });

  describe('mapped label that is not an option', () => {
    it('throws the named option error and returns no document', async () => {
      let error: Error | undefined;
      try {
        await build(template, {
          title: 'should not be written',
          tag: 'Not a tag',
        });
      } catch (caught) {
        error = caught as Error;
      }
      expect(error).toBeInstanceOf(OicrWordTemplateMissingOptionError);
      expect(error.message).toBe(
        'OICR template control tagAs has no option "Not a tag"',
      );
      expect((error as OicrWordTemplateMissingOptionError).control).toBe(
        'tagAs:2132273794',
      );
      expect((error as OicrWordTemplateMissingOptionError).reason).toBe(
        'no option "Not a tag"',
      );
    });
  });
});
