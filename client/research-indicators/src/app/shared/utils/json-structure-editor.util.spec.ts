import {
  applyFlatValuesToJson,
  buildJsonEditorTree,
  cloneJsonTemplate,
  flattenJsonLeaves,
  formatJsonFieldLabel,
  getJsonLeafType
} from '@shared/utils/json-structure-editor.util';

const DATE_FORMAT = {
  date: {
    order: 'DMY',
    style: 'numeric',
    monthName: {
      format: 'long',
      enabled: false,
      uppercase: true
    },
    separator: '/',
    twoDigitDay: true,
    fourDigitYear: true,
    twoDigitMonth: true
  },
  time: {
    hour12: true,
    twoDigitMinute: true
  },
  locale: 'en-US',
  display: {
    order: 'DATE_TIME',
    suffix: {
      wrap: 'PAREN',
      style: 'AUTO_TZ_ABBR',
      enabled: true,
      fallback: 'CET'
    },
    separator: ' at '
  },
  timezone: {
    iana: 'Europe/Paris',
    displayName: 'CET',
    abbreviationMode: 'AUTO'
  }
};

describe('json-structure-editor.util', () => {
  it('builds nested groups for top-level JSON sections', () => {
    const tree = buildJsonEditorTree(DATE_FORMAT);
    expect(tree.map(n => n.key)).toEqual(['date', 'time', 'locale', 'display', 'timezone']);
    expect(tree[0].type).toBe('group');
    if (tree[0].type === 'group') {
      expect(tree[0].children.some(c => c.key === 'monthName' && c.type === 'group')).toBe(true);
    }
  });

  it('flattens leaf values with dot paths', () => {
    const flat = flattenJsonLeaves(DATE_FORMAT);
    expect(flat['locale']).toBe('en-US');
    expect(flat['timezone.iana']).toBe('Europe/Paris');
    expect(flat['date.monthName.enabled']).toBe(false);
  });

  it('rebuilds JSON preserving keys while updating leaf values', () => {
    const flat = flattenJsonLeaves(DATE_FORMAT);
    flat['timezone.iana'] = 'America/New_York';
    flat['date.monthName.enabled'] = true;
    flat['locale'] = 'en-GB';

    const rebuilt = applyFlatValuesToJson(DATE_FORMAT, flat);
    expect(rebuilt).toEqual({
      ...DATE_FORMAT,
      locale: 'en-GB',
      date: {
        ...DATE_FORMAT.date,
        monthName: {
          ...DATE_FORMAT.date.monthName,
          enabled: true
        }
      },
      timezone: {
        ...DATE_FORMAT.timezone,
        iana: 'America/New_York'
      }
    });
    expect(Object.keys(rebuilt as object)).toEqual(Object.keys(DATE_FORMAT));
  });

  it('formats field labels from camelCase keys', () => {
    expect(formatJsonFieldLabel('monthName')).toBe('Month Name');
    expect(formatJsonFieldLabel('twoDigitDay')).toBe('Two Digit Day');
  });

  it('classifies leaf types and treats unsupported values as string leaves in the tree', () => {
    expect(getJsonLeafType(null)).toBe('null');
    expect(getJsonLeafType(true)).toBe('boolean');
    expect(getJsonLeafType(1)).toBe('number');
    expect(getJsonLeafType('x')).toBe('string');
    expect(getJsonLeafType([])).toBe('unsupported');

    const tree = buildJsonEditorTree({ odd: [] as unknown as Record<string, unknown> });
    expect(tree[0].type).toBe('leaf');
    if (tree[0].type === 'leaf') {
      expect(tree[0].valueType).toBe('string');
    }
  });

  it('skips arrays when flattening leaves', () => {
    const flat = flattenJsonLeaves({ items: [1, 2], name: 'x' });
    expect(flat).toEqual({ name: 'x' });
    expect(flattenJsonLeaves(null)).toEqual({});
    expect(flattenJsonLeaves({ empty: undefined })).toEqual({ empty: null });
  });

  it('deep-clones templates via cloneJsonTemplate', () => {
    const source = { nested: { value: 1 } };
    const clone = cloneJsonTemplate(source);
    (clone.nested as { value: number }).value = 2;
    expect(source.nested.value).toBe(1);
  });

  it('coerces number, boolean, and null leaves when applying flat values', () => {
    const template = { count: 5, flag: false, nullable: null as null, label: 'ok' };

    expect(applyFlatValuesToJson(template, { count: 10 }).count).toBe(10);
    expect(applyFlatValuesToJson(template, { count: '' }).count).toBe(5);
    expect(applyFlatValuesToJson(template, { count: 'not-a-number' }).count).toBe(5);
    expect(applyFlatValuesToJson(template, { count: null }).count).toBe(5);

    expect(applyFlatValuesToJson(template, { flag: true }).flag).toBe(true);
    expect(applyFlatValuesToJson(template, { flag: 'TRUE' }).flag).toBe(true);
    expect(applyFlatValuesToJson(template, { flag: 'false' }).flag).toBe(false);

    expect(applyFlatValuesToJson(template, { nullable: '' }).nullable).toBeNull();
    expect(applyFlatValuesToJson(template, { nullable: 'x' }).nullable).toBe('x');

    expect(applyFlatValuesToJson(template, { label: null }).label).toBe('');
  });
});
