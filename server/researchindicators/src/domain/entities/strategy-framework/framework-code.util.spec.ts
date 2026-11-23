import {
  proposeElementCode,
  proposeIobCode,
  CodeElement,
} from './framework-code.util';

const el = (
  id: number,
  parentId: number | null,
  depth: number,
  code: string,
): CodeElement => ({ id, parentId, depth, code });

describe('proposeElementCode (design 5.3, R-STF-005, D-STF-16)', () => {
  it.each([
    {
      label: 'root skips a hand-typed 5 on a dimension',
      elements: [
        el(1, null, 1, '1'),
        el(2, null, 1, '2'),
        el(3, null, 1, '3'),
        el(4, null, 1, '4'),
        el(5, 1, 2, ' 5 '),
      ],
      parentId: null as number | null,
      expected: { code: '6' },
    },
    {
      label: 'child gap 1.1, 1.3 proposes 1.4 (not the filled gap)',
      elements: [el(1, null, 1, ' 1 '), el(2, 1, 2, '1.1'), el(3, 1, 2, '1.3')],
      parentId: 1,
      expected: { code: '1.4' },
    },
    {
      label: 'moved 1.7 under area 2 still blocks 1.7 under area 1',
      elements: [
        el(1, null, 1, '1'),
        el(2, null, 1, '2'),
        el(11, 1, 2, '1.1'),
        el(12, 1, 2, '1.2'),
        el(13, 1, 2, '1.3'),
        el(14, 1, 2, '1.4'),
        el(15, 1, 2, '1.5'),
        el(16, 1, 2, '1.6'),
        el(17, 2, 2, '1.7'),
      ],
      parentId: 1,
      expected: { code: '1.8' },
    },
    {
      label: 'parent 1.1 does not match a 121.x code',
      elements: [el(1, null, 1, '1'), el(2, 1, 2, '1.1'), el(9, 1, 2, '121.3')],
      parentId: 2,
      expected: { code: '1.1.1' },
    },
    {
      label: 'non-numeric parent A.b is escaped and matched ignoring case',
      elements: [
        el(1, null, 1, 'A.b'),
        el(2, 1, 2, 'a.b.2'),
        el(3, 1, 2, 'Axb.9'),
      ],
      parentId: 1,
      expected: { code: 'A.b.3' },
    },
  ])('$label', ({ elements, parentId, expected }) => {
    expect(proposeElementCode(elements, parentId)).toEqual(expected);
  });

  it('rejects a proposal longer than 30 characters', () => {
    const parentCode = '12345678901234567890123456789';
    expect(parentCode).toHaveLength(29);
    expect(proposeElementCode([el(1, null, 1, parentCode)], 1)).toEqual({
      field: 'code',
      description: 'parent code too long to extend; type a code',
    });
  });

  it('offers a proposal of exactly 30 characters', () => {
    const parentCode = '1234567890123456789012345678';
    expect(parentCode).toHaveLength(28);
    expect(proposeElementCode([el(1, null, 1, parentCode)], 1)).toEqual({
      code: `${parentCode}.1`,
    });
  });
});

describe('proposeIobCode (design 5.3, R-STF-005)', () => {
  it.each([
    {
      label: 'IOB-1…3 proposes IOB-4',
      codes: ['IOB-1', 'IOB-2', 'IOB-3'],
      expected: { code: 'IOB-4' },
    },
    {
      label: 'a gap and a non-numeric code propose the next free number',
      codes: ['IOB-1', 'IOB-3', 'IOB-x'],
      expected: { code: 'IOB-4' },
    },
    {
      label: 'matches a trimmed lowercase code',
      codes: [' iob-2 '],
      expected: { code: 'IOB-3' },
    },
    {
      label: 'an empty year starts at IOB-1',
      codes: [] as string[],
      expected: { code: 'IOB-1' },
    },
  ])('$label', ({ codes, expected }) => {
    expect(proposeIobCode(codes)).toEqual(expected);
  });
});
