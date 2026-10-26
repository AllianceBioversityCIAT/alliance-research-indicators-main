// @akili-spec results/oicr-word-template-2026

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import {
  OICR_WORD_TEMPLATE_LEAF_IDS,
  OICR_WORD_TEMPLATE_TARGET_IDS,
  OicrWordTemplateLeafName,
  OicrWordTemplateTargetName,
} from './oicr-word-template.ids';

const TARGET = OICR_WORD_TEMPLATE_TARGET_IDS;
const LEAF = OICR_WORD_TEMPLATE_LEAF_IDS;

const CONTACT_PERSON = 'Contact Person';
const PARA_ID_LIMIT = 0x80000000;
const DOCUMENT_PART = 'word/document.xml';

const REPEATING_SECTIONS: readonly OicrWordTemplateTargetName[] = [
  'raPrimarySection',
  'raOtherSpecifySection',
  'raContribSection',
  'authorsSection',
];

type LeafKind = 'dropdown' | 'combo' | 'text';

const LEAF_RULES: readonly {
  name: OicrWordTemplateLeafName;
  section: OicrWordTemplateTargetName;
  kind: LeafKind;
}[] = [
  { name: 'raPrimaryDropdown', section: 'raPrimarySection', kind: 'dropdown' },
  {
    name: 'raOtherSpecifyItem',
    section: 'raOtherSpecifySection',
    kind: 'text',
  },
  { name: 'raContribDropdown', section: 'raContribSection', kind: 'dropdown' },
  { name: 'authorName', section: 'authorsSection', kind: 'text' },
  { name: 'authorPosition', section: 'authorsSection', kind: 'text' },
  { name: 'authorAffiliation', section: 'authorsSection', kind: 'text' },
  { name: 'authorEmail', section: 'authorsSection', kind: 'text' },
  { name: 'authorOrcid', section: 'authorsSection', kind: 'text' },
  { name: 'authorRole', section: 'authorsSection', kind: 'combo' },
];

const PINNED_IDS = new Set<string>(Object.values(LEAF));

/** A null, omitted, or empty label. The control is left as the template shipped it. */
export type OicrWordTemplateNone = null | undefined | '';

export interface OicrWordTemplateContact {
  name?: string | null;
  position?: string | null;
  affiliation?: string | null;
  email?: string | null;
  /** Exact combo option. A none label leaves the combo unselected. ORCID is never a field. */
  role?: string | null;
}

/**
 * Mapper output. Option fields carry the exact Word label, or none.
 * Repeating arrays count every STAR item, including none-label rows.
 */
export interface OicrWordTemplateFields {
  reportingYear?: string | null;
  tag?: string | null;
  previousHandle?: string | null;
  mainProject?: string | null;
  title?: string | null;
  primaryResearchAreas?: readonly (string | null)[] | null;
  otherSpecify?: readonly (string | null)[] | null;
  contributingResearchAreas?: readonly (string | null)[] | null;
  geoScope?: string | null;
  regionsCountries?: string | null;
  geoComments?: string | null;
  elaboration?: string | null;
  contact?: OicrWordTemplateContact | null;
}

export class OicrWordTemplateMissingControlError extends Error {
  readonly control: string;
  readonly reason: string;

  constructor(controlName: string, wId: string) {
    super(`OICR template is missing control ${controlName} (${wId})`);
    this.name = 'OicrWordTemplateMissingControlError';
    this.control = `${controlName}:${wId}`;
    this.reason = 'missing';
  }
}

export class OicrWordTemplateUnexpectedStructureError extends Error {
  readonly control: string;
  readonly reason: string;

  constructor(controlName: string, wId: string, what: string) {
    super(
      `OICR template control ${controlName} has an unexpected structure (${what})`,
    );
    this.name = 'OicrWordTemplateUnexpectedStructureError';
    this.control = `${controlName}:${wId}`;
    this.reason = what;
  }
}

export class OicrWordTemplateMissingOptionError extends Error {
  readonly control: string;
  readonly reason: string;

  constructor(controlName: string, wId: string, label: string) {
    super(`OICR template control ${controlName} has no option "${label}"`);
    this.name = 'OicrWordTemplateMissingOptionError';
    this.control = `${controlName}:${wId}`;
    this.reason = `no option "${label}"`;
  }
}

type XmlNode = Node;
type XmlEl = Element;
type XmlDoc = Document;

export interface OicrWordTemplateRow {
  item: XmlEl;
  /** Pinned leaf id → element. Captured before a clone's ids are rewritten. */
  leaves: Map<string, XmlEl>;
}

interface IdFactory {
  sdt(): string;
  para(): string;
}

function isNone(
  value: string | null | undefined,
): value is OicrWordTemplateNone {
  return value === null || value === undefined || value === '';
}

function parser(): DOMParser {
  return new DOMParser({
    errorHandler: {
      warning: () => undefined,
      error: () => undefined,
      fatalError: (msg: unknown) => {
        throw new OicrWordTemplateUnexpectedStructureError(
          DOCUMENT_PART,
          DOCUMENT_PART,
          `XML parse error: ${String(msg)}`,
        );
      },
    },
  });
}

function parseXml(xml: string): XmlDoc {
  return parser().parseFromString(xml, 'text/xml');
}

function firstChild(node: XmlNode, name: string): XmlEl | null {
  const children = node.childNodes;
  if (!children) return null;
  for (let i = 0; i < children.length; i++) {
    if (children[i].nodeName === name) return children[i] as XmlEl;
  }
  return null;
}

function childElements(node: XmlNode, name: string): XmlEl[] {
  const found: XmlEl[] = [];
  const children = node.childNodes;
  if (!children) return found;
  for (let i = 0; i < children.length; i++) {
    if (children[i].nodeName === name) found.push(children[i] as XmlEl);
  }
  return found;
}

function walk(node: XmlNode, visit: (el: XmlEl) => void): void {
  if (node.nodeType === 1) visit(node as XmlEl);
  const children = node.childNodes;
  if (!children) return;
  for (let i = 0; i < children.length; i++) walk(children[i], visit);
}

function idOf(sdt: XmlEl): string {
  const pr = firstChild(sdt, 'w:sdtPr');
  const id = pr && firstChild(pr, 'w:id');
  return (id && id.getAttribute('w:val')) || '';
}

function sdtById(doc: XmlDoc, wId: string): XmlEl | null {
  const all = doc.getElementsByTagName('w:sdt');
  for (let i = 0; i < all.length; i++) {
    if (idOf(all[i] as XmlEl) === wId) return all[i] as XmlEl;
  }
  return null;
}

function requireSdt(doc: XmlDoc, name: string, wId: string): XmlEl {
  const sdt = sdtById(doc, wId);
  if (!sdt) throw new OicrWordTemplateMissingControlError(name, wId);
  return sdt;
}

function isRepeatingItem(sdt: XmlEl): boolean {
  const pr = firstChild(sdt, 'w:sdtPr');
  return !!pr && !!firstChild(pr, 'w15:repeatingSectionItem');
}

function outermostItems(section: XmlEl): XmlEl[] {
  const content = firstChild(section, 'w:sdtContent');
  if (!content) return [];
  const items: XmlEl[] = [];
  const nested = content.getElementsByTagName('w:sdt');
  for (let i = 0; i < nested.length; i++) {
    const sdt = nested[i] as XmlEl;
    if (!isRepeatingItem(sdt)) continue;
    let insideAnother = false;
    for (
      let parent = sdt.parentNode;
      parent && parent !== section;
      parent = parent.parentNode
    ) {
      if (parent.nodeName === 'w:sdt' && isRepeatingItem(parent as XmlEl)) {
        insideAnother = true;
        break;
      }
    }
    if (!insideAnother) items.push(sdt);
  }
  return items;
}

function findPinned(item: XmlEl, pinnedId: string): XmlEl | null {
  if (item.nodeName === 'w:sdt' && idOf(item) === pinnedId) return item;
  const nested = item.getElementsByTagName('w:sdt');
  for (let i = 0; i < nested.length; i++) {
    const sdt = nested[i] as XmlEl;
    if (idOf(sdt) === pinnedId) return sdt;
  }
  return null;
}

function indexLeaves(item: XmlEl): Map<string, XmlEl> {
  const leaves = new Map<string, XmlEl>();
  const consider = (sdt: XmlEl) => {
    const id = idOf(sdt);
    if (PINNED_IDS.has(id)) leaves.set(id, sdt);
  };
  if (item.nodeName === 'w:sdt') consider(item);
  const nested = item.getElementsByTagName('w:sdt');
  for (let i = 0; i < nested.length; i++) consider(nested[i] as XmlEl);
  return leaves;
}

function optionLabels(sdt: XmlEl): string[] | null {
  const pr = firstChild(sdt, 'w:sdtPr');
  if (!pr) return null;
  const list = firstChild(pr, 'w:dropDownList') || firstChild(pr, 'w:comboBox');
  if (!list) return null;
  return childElements(list, 'w:listItem').map(
    (item) => item.getAttribute('w:displayText') ?? '',
  );
}

function firstMark(root: XmlEl): string | null {
  let found: string | null = null;
  walk(root, (el) => {
    if (found || el === root) return;
    const name = el.nodeName;
    if (
      name === 'w:ins' ||
      name === 'w:del' ||
      name === 'w:bookmarkStart' ||
      name.endsWith('PrChange')
    ) {
      found = name;
    }
  });
  return found;
}

function idFactory(doc: XmlDoc): IdFactory {
  const usedSdt = new Set<string>();
  const usedPara = new Set<string>();
  const ids = doc.getElementsByTagName('w:id');
  for (let i = 0; i < ids.length; i++) {
    const value = (ids[i] as XmlEl).getAttribute('w:val');
    if (value) usedSdt.add(value);
  }
  walk(doc, (el) => {
    const paraId = el.getAttribute('w14:paraId');
    if (paraId) usedPara.add(paraId.toUpperCase());
  });
  let next = 1;
  const take = (used: Set<string>, format: (n: number) => string): string => {
    let value = '';
    do {
      if (next >= PARA_ID_LIMIT) {
        throw new OicrWordTemplateUnexpectedStructureError(
          DOCUMENT_PART,
          DOCUMENT_PART,
          'exhausted unique ids below 0x80000000',
        );
      }
      value = format(next);
      next += 1;
    } while (used.has(value));
    used.add(value);
    return value;
  };
  return {
    sdt: () => take(usedSdt, (n) => String(n)),
    para: () =>
      take(usedPara, (n) => n.toString(16).toUpperCase().padStart(8, '0')),
  };
}

function assignFresh(root: XmlEl, ids: IdFactory): void {
  walk(root, (el) => {
    if (el.nodeName === 'w:sdt') {
      const pr = firstChild(el, 'w:sdtPr');
      const id = pr && firstChild(pr, 'w:id');
      if (id) id.setAttribute('w:val', ids.sdt());
    }
    if (el.getAttribute('w14:paraId')) {
      el.setAttribute('w14:paraId', ids.para());
    }
  });
}

/**
 * Keeps the section's template item and inserts N−1 clones after it.
 * Each clone gets a fresh `w:id` on every `w:sdt` and a fresh `w14:paraId`
 * (below 0x80000000) on every element that carries one. `w14:textId` is copied.
 */
export function cloneItems(
  doc: XmlDoc,
  sectionSdt: XmlEl,
  n: number,
): OicrWordTemplateRow[] {
  const existing = outermostItems(sectionSdt);
  if (existing.length !== 1) {
    throw new OicrWordTemplateUnexpectedStructureError(
      'repeatingSection',
      idOf(sectionSdt),
      `expected exactly one repeating item, found ${existing.length}`,
    );
  }
  const template = existing[0];
  const rows: OicrWordTemplateRow[] = [
    { item: template, leaves: indexLeaves(template) },
  ];
  if (n <= 1) return rows;
  const ids = idFactory(doc);
  let anchor = template;
  for (let i = 1; i < n; i++) {
    const clone = template.cloneNode(true) as XmlEl;
    const leaves = indexLeaves(clone);
    assignFresh(clone, ids);
    anchor.parentNode.insertBefore(clone, anchor.nextSibling);
    anchor = clone;
    rows.push({ item: clone, leaves });
  }
  return rows;
}

/** XML 1.0 Char, after `\r\n` and a lone `\r` have become `\n`. */
export function normalizeText(value: string): string {
  const unified = value.replace(/\r\n?/g, '\n');
  let out = '';
  for (const char of unified) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;
    const kept =
      cp === 0x9 ||
      cp === 0xa ||
      cp === 0xd ||
      (cp >= 0x20 && cp <= 0xd7ff) ||
      (cp >= 0xe000 && cp <= 0xfffd) ||
      (cp >= 0x10000 && cp <= 0x10ffff);
    if (kept) out += char;
  }
  return out;
}

function cleanedRPr(run: XmlEl | null): XmlEl | null {
  if (!run) return null;
  const rPr = firstChild(run, 'w:rPr');
  if (!rPr) return null;
  const copy = rPr.cloneNode(true) as XmlEl;
  for (const style of childElements(copy, 'w:rStyle')) {
    if (/Placeholder/i.test(style.getAttribute('w:val') || '')) {
      copy.removeChild(style);
    }
  }
  return copy;
}

/**
 * Replaces the visible runs of a leaf control. Empty values (and values that
 * normalize to empty) leave the placeholder in place.
 */
export function setText(
  doc: XmlDoc,
  sdt: XmlEl,
  value: string | null | undefined,
  controlName: string,
): void {
  if (isNone(value)) return;
  const normalized = normalizeText(value);
  if (normalized === '') return;

  const wId = idOf(sdt);
  const pr = firstChild(sdt, 'w:sdtPr');
  const content = firstChild(sdt, 'w:sdtContent');
  if (!pr || !content) {
    throw new OicrWordTemplateUnexpectedStructureError(
      controlName,
      wId,
      'missing sdtContent',
    );
  }
  const placeholder = firstChild(pr, 'w:showingPlcHdr');
  if (placeholder) pr.removeChild(placeholder);

  const runs = content.getElementsByTagName('w:r');
  const rPr = cleanedRPr(runs.length ? (runs[0] as XmlEl) : null);
  const paragraphs = content.getElementsByTagName('w:p');
  const host: XmlEl = paragraphs.length ? (paragraphs[0] as XmlEl) : content;
  for (let i = paragraphs.length - 1; i >= 1; i--) {
    const extra = paragraphs[i] as XmlEl;
    extra.parentNode.removeChild(extra);
  }
  for (const child of Array.from(host.childNodes)) {
    if (
      child.nodeName === 'w:r' ||
      child.nodeName === 'w:proofErr' ||
      child.nodeName === 'w:hyperlink'
    ) {
      host.removeChild(child);
    }
  }

  normalized.split('\n').forEach((line, index) => {
    if (index > 0) {
      const brRun = doc.createElement('w:r');
      if (rPr) brRun.appendChild(rPr.cloneNode(true));
      brRun.appendChild(doc.createElement('w:br'));
      host.appendChild(brRun);
    }
    const run = doc.createElement('w:r');
    if (rPr) run.appendChild(rPr.cloneNode(true));
    const text = doc.createElement('w:t');
    text.setAttribute('xml:space', 'preserve');
    text.appendChild(doc.createTextNode(line));
    run.appendChild(text);
    host.appendChild(run);
  });
}

/**
 * Selects a dropdown or combo by exact `w:displayText`.
 * A none label leaves the control untouched. A mapped label that is not an
 * option throws; it is never skipped.
 */
export function setOption(
  doc: XmlDoc,
  sdt: XmlEl,
  label: string | null | undefined,
  controlName: string,
): void {
  if (isNone(label)) return;
  const wId = idOf(sdt);
  const options = optionLabels(sdt);
  if (!options) {
    throw new OicrWordTemplateUnexpectedStructureError(
      controlName,
      wId,
      'expected a dropdown or combo',
    );
  }
  if (!options.includes(label)) {
    throw new OicrWordTemplateMissingOptionError(controlName, wId, label);
  }
  setText(doc, sdt, label, controlName);
}

function assertLeaf(doc: XmlDoc, rule: (typeof LEAF_RULES)[number]): void {
  const section = requireSdt(doc, rule.section, TARGET[rule.section]);
  const items = outermostItems(section);
  if (items.length !== 1) {
    throw new OicrWordTemplateUnexpectedStructureError(
      rule.section,
      TARGET[rule.section],
      `expected exactly one repeating item, found ${items.length}`,
    );
  }
  const leaf = findPinned(items[0], LEAF[rule.name]);
  if (!leaf) {
    if (sdtById(doc, LEAF[rule.name])) {
      throw new OicrWordTemplateUnexpectedStructureError(
        rule.name,
        LEAF[rule.name],
        'pinned leaf is outside the section item',
      );
    }
    throw new OicrWordTemplateMissingControlError(rule.name, LEAF[rule.name]);
  }
  const pr = firstChild(leaf, 'w:sdtPr');
  if (rule.kind === 'dropdown' && (!pr || !firstChild(pr, 'w:dropDownList'))) {
    throw new OicrWordTemplateUnexpectedStructureError(
      rule.name,
      LEAF[rule.name],
      'expected a dropdown',
    );
  }
  if (rule.kind === 'combo') {
    const combo = pr && firstChild(pr, 'w:comboBox');
    if (!combo) {
      throw new OicrWordTemplateUnexpectedStructureError(
        rule.name,
        LEAF[rule.name],
        'expected a combo',
      );
    }
    const labels = childElements(combo, 'w:listItem').map(
      (item) => item.getAttribute('w:displayText') ?? '',
    );
    if (!labels.includes(CONTACT_PERSON)) {
      throw new OicrWordTemplateUnexpectedStructureError(
        rule.name,
        LEAF[rule.name],
        `combo does not offer "${CONTACT_PERSON}"`,
      );
    }
  }
}

function assertStructure(doc: XmlDoc): void {
  (Object.keys(TARGET) as OicrWordTemplateTargetName[]).forEach((name) => {
    const sdt = requireSdt(doc, name, TARGET[name]);
    if (!firstChild(sdt, 'w:sdtContent')) {
      throw new OicrWordTemplateUnexpectedStructureError(
        name,
        TARGET[name],
        'missing sdtContent',
      );
    }
  });

  REPEATING_SECTIONS.forEach((name) => {
    const section = requireSdt(doc, name, TARGET[name]);
    const items = outermostItems(section);
    if (items.length !== 1) {
      throw new OicrWordTemplateUnexpectedStructureError(
        name,
        TARGET[name],
        `expected exactly one repeating item, found ${items.length}`,
      );
    }
  });

  LEAF_RULES.forEach((rule) => assertLeaf(doc, rule));

  (Object.keys(TARGET) as OicrWordTemplateTargetName[]).forEach((name) => {
    const sdt = requireSdt(doc, name, TARGET[name]);
    const mark = firstMark(sdt);
    if (mark) {
      throw new OicrWordTemplateUnexpectedStructureError(
        name,
        TARGET[name],
        `contains <${mark}>`,
      );
    }
  });
}

function listOf(
  values: readonly (string | null)[] | null | undefined,
): readonly (string | null)[] {
  return values ?? [];
}

function assertMappedOptions(
  doc: XmlDoc,
  fields: OicrWordTemplateFields,
): void {
  const scratch = parseXml(new XMLSerializer().serializeToString(doc));
  const check = (
    name: string,
    wId: string,
    label: string | null | undefined,
  ) => {
    if (isNone(label)) return;
    setOption(scratch, requireSdt(scratch, name, wId), label, name);
  };
  check('tagAs', TARGET.tagAs, fields.tag);
  check('geoScope', TARGET.geoScope, fields.geoScope);
  listOf(fields.primaryResearchAreas).forEach((label) =>
    check('raPrimaryDropdown', LEAF.raPrimaryDropdown, label),
  );
  listOf(fields.contributingResearchAreas).forEach((label) =>
    check('raContribDropdown', LEAF.raContribDropdown, label),
  );
  if (fields.contact) {
    check('authorRole', LEAF.authorRole, fields.contact.role);
  }
}

/** Every structural and option check. Throws before the caller writes. */
export function validate(doc: XmlDoc, fields: OicrWordTemplateFields): void {
  assertStructure(doc);
  assertMappedOptions(doc, fields);
}

function fillOptionRows(
  doc: XmlDoc,
  sectionName: OicrWordTemplateTargetName,
  leafId: string,
  labels: readonly (string | null)[],
  controlName: string,
): void {
  if (labels.length === 0) return;
  const rows = cloneItems(
    doc,
    requireSdt(doc, sectionName, TARGET[sectionName]),
    labels.length,
  );
  labels.forEach((label, index) => {
    const leaf = rows[index].leaves.get(leafId);
    if (!leaf)
      throw new OicrWordTemplateMissingControlError(controlName, leafId);
    setOption(doc, leaf, label, controlName);
  });
}

function fillTextRows(
  doc: XmlDoc,
  sectionName: OicrWordTemplateTargetName,
  leafId: string,
  labels: readonly (string | null)[],
  controlName: string,
): void {
  if (labels.length === 0) return;
  const rows = cloneItems(
    doc,
    requireSdt(doc, sectionName, TARGET[sectionName]),
    labels.length,
  );
  labels.forEach((label, index) => {
    const leaf = rows[index].leaves.get(leafId);
    if (!leaf)
      throw new OicrWordTemplateMissingControlError(controlName, leafId);
    setText(doc, leaf, label, controlName);
  });
}

/**
 * Section 15 leaves are resolved by pinned id. A positional lookup would
 * follow a swapped column into the wrong cell.
 */
function authorLeaf(row: OicrWordTemplateRow, pinnedId: string): XmlEl {
  const leaf = row.leaves.get(pinnedId);
  const name =
    LEAF_RULES.find((rule) => LEAF[rule.name] === pinnedId)?.name ??
    'authorLeaf';
  if (!leaf) throw new OicrWordTemplateMissingControlError(name, pinnedId);
  return leaf;
}

function applyFields(doc: XmlDoc, fields: OicrWordTemplateFields): void {
  setText(
    doc,
    requireSdt(doc, 'reportingYear', TARGET.reportingYear),
    fields.reportingYear,
    'reportingYear',
  );
  setOption(doc, requireSdt(doc, 'tagAs', TARGET.tagAs), fields.tag, 'tagAs');
  setText(
    doc,
    requireSdt(doc, 'previousHandle', TARGET.previousHandle),
    fields.previousHandle,
    'previousHandle',
  );
  setText(
    doc,
    requireSdt(doc, 'mainProject', TARGET.mainProject),
    fields.mainProject,
    'mainProject',
  );
  setText(doc, requireSdt(doc, 'title', TARGET.title), fields.title, 'title');

  fillOptionRows(
    doc,
    'raPrimarySection',
    LEAF.raPrimaryDropdown,
    listOf(fields.primaryResearchAreas),
    'raPrimaryDropdown',
  );
  fillTextRows(
    doc,
    'raOtherSpecifySection',
    LEAF.raOtherSpecifyItem,
    listOf(fields.otherSpecify),
    'raOtherSpecifyItem',
  );
  fillOptionRows(
    doc,
    'raContribSection',
    LEAF.raContribDropdown,
    listOf(fields.contributingResearchAreas),
    'raContribDropdown',
  );

  setOption(
    doc,
    requireSdt(doc, 'geoScope', TARGET.geoScope),
    fields.geoScope,
    'geoScope',
  );
  setText(
    doc,
    requireSdt(doc, 'regionsCountries', TARGET.regionsCountries),
    fields.regionsCountries,
    'regionsCountries',
  );
  setText(
    doc,
    requireSdt(doc, 'geoComments', TARGET.geoComments),
    fields.geoComments,
    'geoComments',
  );
  setText(
    doc,
    requireSdt(doc, 'elaboration', TARGET.elaboration),
    fields.elaboration,
    'elaboration',
  );

  if (fields.contact) {
    const [row] = cloneItems(
      doc,
      requireSdt(doc, 'authorsSection', TARGET.authorsSection),
      1,
    );
    const contact = fields.contact;
    setText(doc, authorLeaf(row, LEAF.authorName), contact.name, 'authorName');
    setText(
      doc,
      authorLeaf(row, LEAF.authorPosition),
      contact.position,
      'authorPosition',
    );
    setText(
      doc,
      authorLeaf(row, LEAF.authorAffiliation),
      contact.affiliation,
      'authorAffiliation',
    );
    setText(
      doc,
      authorLeaf(row, LEAF.authorEmail),
      contact.email,
      'authorEmail',
    );
    setOption(
      doc,
      authorLeaf(row, LEAF.authorRole),
      contact.role,
      'authorRole',
    );
  }
}

/**
 * Fills `fields` into a copy of the template package.
 * Validation finishes before any control is written. The returned buffer
 * keeps the original declaration, DEFLATE compression, zip entry order,
 * and the bytes of every part other than `word/document.xml`.
 */
export async function build(
  template: Buffer,
  fields: OicrWordTemplateFields = {},
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const entry = zip.file(DOCUMENT_PART);
  if (!entry) {
    throw new OicrWordTemplateUnexpectedStructureError(
      DOCUMENT_PART,
      DOCUMENT_PART,
      'missing word/document.xml',
    );
  }
  const original = await entry.async('string');
  const marker = '<w:document';
  const markerAt = original.indexOf(marker);
  if (markerAt < 0) {
    throw new OicrWordTemplateUnexpectedStructureError(
      DOCUMENT_PART,
      DOCUMENT_PART,
      'missing w:document',
    );
  }
  const prolog = original.slice(0, markerAt);
  const doc = parseXml(original);
  validate(doc, fields);
  applyFields(doc, fields);
  const xml =
    prolog + new XMLSerializer().serializeToString(doc.documentElement);
  zip.file(DOCUMENT_PART, xml);
  const generated = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  return Buffer.from(generated);
}
