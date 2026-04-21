import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ExcelWorkbookBuilder } from './excel-workbook.builder';
import type {
  ExcelColumnSpec,
  ExcelSheetPreamble,
  ExcelWorkbookSpec,
} from './excel-workbook.types';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
}));

const existsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

/** Logo merges cols 1–2; title must start at col ≥3 to avoid ExcelJS merge overlap. */
const preambleSheetColumns: ExcelColumnSpec[] = [
  { key: 'c1', header: 'C1', width: 10 },
  { key: 'c2', header: 'C2' },
  { key: 'c3', header: 'C3', width: 11 },
  { key: 'c4', header: 'C4' },
  { key: 'c5', header: 'C5', width: 12 },
];

const preambleBase = (): Pick<
  ExcelSheetPreamble,
  | 'bannerTitle'
  | 'bannerTitleMergeFromCol'
  | 'bannerTitleMergeToCol'
  | 'logoMergeFromCol'
  | 'logoMergeToCol'
  | 'logoMergeToRow'
  | 'headerFillArgb'
  | 'headerFontArgb'
> => ({
  bannerTitle: 'T',
  bannerTitleMergeFromCol: 3,
  bannerTitleMergeToCol: 5,
  logoMergeFromCol: 1,
  logoMergeToCol: 2,
  logoMergeToRow: 1,
  headerFillArgb: 'FF1F4E79',
  headerFontArgb: 'FFFFFFFF',
});

describe('ExcelWorkbookBuilder', () => {
  let builder: ExcelWorkbookBuilder;

  beforeEach(() => {
    builder = new ExcelWorkbookBuilder();
    existsSync.mockReturnValue(false);
  });

  async function bufferFrom(spec: ExcelWorkbookSpec): Promise<Buffer> {
    const buf = await builder.toBuffer(spec);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    return buf;
  }

  it('writes a minimal workbook without presentation', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'Sheet1',
          columns: [{ key: 'a', header: 'A' }],
          rows: [{ a: '1' }],
        },
      ],
    });
  });

  it('omits column width when not specified', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'k', header: 'H' }],
          rows: [],
        },
      ],
    });
  });

  it('renders hyperlinks for valid http(s) URLs', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: { urlField: 'u', displayField: 'label' },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 'https://a.test', label: 'Text' }],
        },
      ],
    });
  });

  it('uses URL as hyperlink text when displayField is omitted', async () => {
    const columns: ExcelColumnSpec[] = [
      { key: 'u', header: 'Link', hyperlink: { urlField: 'u' } },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 'https://example.test/path' }],
        },
      ],
    });
  });

  it('falls back to URL string when displayField is set but missing on row', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: { urlField: 'u', displayField: 'label' },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 'https://example.test/x' }],
        },
      ],
    });
  });

  it('treats non-string hyperlink URL field as empty string', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: { urlField: 'u', emptyDisplay: '—' },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 404 as unknown as string }],
        },
      ],
    });
  });

  it('uses emptyDisplay when URL is invalid', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: {
          urlField: 'u',
          displayField: 'label',
          emptyDisplay: 'N/A',
        },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 'not-a-url', label: 'ignored' }],
        },
      ],
    });
  });

  it('falls back to displayField text when URL invalid and no emptyDisplay', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: { urlField: 'u', displayField: 'label' },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: '', label: 'Shown' }],
        },
      ],
    });
  });

  it('returns empty string for non-hyperlink cell when value is null', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'z', header: 'Z' }],
          rows: [{ z: null }],
        },
      ],
    });
  });

  it('returns empty string for invalid URL when displayField is missing on row', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: { urlField: 'u', displayField: 'missing' },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 'not-url' }],
        },
      ],
    });
  });

  it('returns empty string for invalid URL without displayField when display is null', async () => {
    const columns: ExcelColumnSpec[] = [
      {
        key: 'u',
        header: 'Link',
        hyperlink: { urlField: 'u' },
      },
    ];
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns,
          rows: [{ u: 'bad' }],
        },
      ],
    });
  });

  it('applies row fill and dark font for dark ARGB fills', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'x', header: 'X' }],
          rows: [{ x: 'v', _f: 'FF000000' }],
          rowFillArgbField: '_f',
        },
      ],
    });
  });

  it('applies row fill and light font for light ARGB fills', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'x', header: 'X' }],
          rows: [{ x: 'v', _f: 'FFFFFFFF' }],
          rowFillArgbField: '_f',
        },
      ],
    });
  });

  it('skips row fill when value is not a valid 8-hex ARGB string', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'x', header: 'X' }],
          rows: [
            { x: 'v', _f: 'ZZZZZZZZ' },
            { x: '2', _f: 'nothex' },
          ],
          rowFillArgbField: '_f',
        },
      ],
    });
  });

  it('skips row fill when value is not a string', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'x', header: 'X' }],
          rows: [{ x: 'v', _f: 123 as unknown as string }],
          rowFillArgbField: '_f',
        },
      ],
    });
  });

  it('treats non-FF-prefixed 8-hex row fill as non-dark via isDarkArgb guard', async () => {
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [{ key: 'x', header: 'X' }],
          rows: [{ x: 'v', _f: '12345678' }],
          rowFillArgbField: '_f',
        },
      ],
    });
  });

  it('renders preamble with logo image buffer', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [
        { fromCol: 1, toCol: 1, label: 'G', fillArgb: 'FF203C61' },
      ],
      logoImage: {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        extension: 'png',
      },
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('renders preamble with logo from path when file exists', async () => {
    const logoPath = join(tmpdir(), `excel-logo-${Date.now()}.jpeg`);
    fs.writeFileSync(
      logoPath,
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    );
    existsSync.mockImplementation((p) =>
      typeof p === 'string' && p === logoPath
        ? true
        : (jest.requireActual('fs') as typeof fs).existsSync(p as string),
    );
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      logoPath,
    };
    try {
      await bufferFrom({
        sheets: [
          {
            sheetKey: 's',
            name: 'S',
            columns: preambleSheetColumns,
            rows: [],
            presentation,
          },
        ],
      });
    } finally {
      try {
        fs.unlinkSync(logoPath);
      } catch {
        /* ignore */
      }
    }
  });

  it('uses jpeg extension for .jpg logo path', async () => {
    const logoPath = join(tmpdir(), `excel-logo-${Date.now()}.jpg`);
    fs.writeFileSync(logoPath, Buffer.from([0xff, 0xd8, 0xff]));
    existsSync.mockImplementation((p) =>
      typeof p === 'string' && p === logoPath
        ? true
        : (jest.requireActual('fs') as typeof fs).existsSync(p as string),
    );
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      logoPath,
    };
    try {
      await bufferFrom({
        sheets: [
          {
            sheetKey: 's',
            name: 'S',
            columns: preambleSheetColumns,
            rows: [],
            presentation,
          },
        ],
      });
    } finally {
      try {
        fs.unlinkSync(logoPath);
      } catch {
        /* ignore */
      }
    }
  });

  it('uses gif extension for .gif logo path', async () => {
    const logoPath = join(tmpdir(), `excel-logo-${Date.now()}.gif`);
    fs.writeFileSync(
      logoPath,
      Buffer.from(
        'GIF89a\x01\x00\x01\x00\x00\x00\x00!\xf9\x04\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02',
      ),
    );
    existsSync.mockImplementation((p) =>
      typeof p === 'string' && p === logoPath
        ? true
        : (jest.requireActual('fs') as typeof fs).existsSync(p as string),
    );
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      logoPath,
    };
    try {
      await bufferFrom({
        sheets: [
          {
            sheetKey: 's',
            name: 'S',
            columns: preambleSheetColumns,
            rows: [],
            presentation,
          },
        ],
      });
    } finally {
      try {
        fs.unlinkSync(logoPath);
      } catch {
        /* ignore */
      }
    }
  });

  it('uses png extension for unknown logo path extension', async () => {
    const logoPath = join(tmpdir(), `excel-logo-${Date.now()}.bin`);
    fs.writeFileSync(
      logoPath,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    existsSync.mockImplementation((p) =>
      typeof p === 'string' && p === logoPath
        ? true
        : (jest.requireActual('fs') as typeof fs).existsSync(p as string),
    );
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      logoPath,
    };
    try {
      await bufferFrom({
        sheets: [
          {
            sheetKey: 's',
            name: 'S',
            columns: preambleSheetColumns,
            rows: [],
            presentation,
          },
        ],
      });
    } finally {
      try {
        fs.unlinkSync(logoPath);
      } catch {
        /* ignore */
      }
    }
  });

  it('skips logo image when buffer is empty', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      logoImage: { buffer: Buffer.alloc(0), extension: 'png' },
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('skips embedded logo when extension is missing', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      logoImage: {
        buffer: Buffer.from([1, 2, 3]),
      } as ExcelSheetPreamble['logoImage'],
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('uses default header colors when preamble omits headerFillArgb and headerFontArgb', async () => {
    const base = preambleBase();
    const presentation: ExcelSheetPreamble = {
      ...base,
      headerFillArgb: undefined as unknown as string,
      headerFontArgb: undefined as unknown as string,
      columnGroups: [],
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('omits banner subtitle row when not provided', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('uses explicit banner title colors when provided', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      bannerTitleFillArgb: 'FF00FF00',
      bannerTitleFontArgb: 'FF0000FF',
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('defaults banner title horizontal alignment to right when omitted', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [],
      bannerSubtitle: 'Sub',
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('skips invalid column group merge when from > to', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [
        { fromCol: 5, toCol: 2, label: 'bad', fillArgb: 'FF000000' },
      ],
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('uses group header fill fallback when group fillArgb is omitted', async () => {
    const presentation: ExcelSheetPreamble = {
      ...preambleBase(),
      columnGroups: [
        { fromCol: 1, toCol: 1, label: 'G', fillArgb: undefined },
      ] as ExcelSheetPreamble['columnGroups'],
      headerFillArgb: 'FF112233',
      headerFontArgb: 'FFFFFFFF',
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('does not set autoFilter when presentation exists but there are no columns', async () => {
    const presentation: ExcelSheetPreamble = {
      bannerTitle: 'T',
      bannerTitleMergeFromCol: 1,
      bannerTitleMergeToCol: 1,
      columnGroups: [],
      headerFillArgb: 'FF1F4E79',
      headerFontArgb: 'FFFFFFFF',
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: [],
          rows: [],
          presentation,
        },
      ],
    });
  });

  it('uses default logo merge columns and oneCell editAs when omitted', async () => {
    const presentation: ExcelSheetPreamble = {
      bannerTitle: 'T',
      bannerTitleMergeFromCol: 3,
      bannerTitleMergeToCol: 5,
      columnGroups: [],
      headerFillArgb: 'FF1F4E79',
      headerFontArgb: 'FFFFFFFF',
      logoImage: {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        extension: 'png',
      },
    };
    await bufferFrom({
      sheets: [
        {
          sheetKey: 's',
          name: 'S',
          columns: preambleSheetColumns,
          rows: [],
          presentation,
        },
      ],
    });
  });
});
