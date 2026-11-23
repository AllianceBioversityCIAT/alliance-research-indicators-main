import { writeExportSheets } from '@shared/utils/xlsx-export.util';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel, FrameworkResponsible } from '@shared/interfaces/strategy-framework.interface';
import { buildExportSheets, descendantCountText, nestFramework, summaryLine, tableRowsForLevel } from './framework-view.util';

// @akili-spec institutional-performance/strategy-framework T-12 — design §6.2, §6.4, R-STF-007 AC.1,
// R-STF-008 AC.3. The seeded shape is 4 / 13 / 31. `1.10` is inserted before `1.2` so a lexical
// sort would fail. The workbook assertion reads `workbook.worksheets` (names and count) — row
// arrays alone cannot show "one sheet per level".

const SEEDED_LEVELS: FrameworkLevel[] = [
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
];

const element = (
  partial: Partial<FrameworkEditorElement> & Pick<FrameworkEditorElement, 'id' | 'depth' | 'code' | 'name'>
): FrameworkEditorElement => ({
  levelId: partial.depth,
  description: null,
  parentId: null,
  descendantCounts: {},
  usage: {},
  deletable: true,
  blockers: [],
  ...partial
});

const responsibles: FrameworkResponsible[] = [
  { carnet: 'IJ', name: 'Idris Jones', email: 'ij@alliance.org', isActiveStaff: true },
  { carnet: 'PA', name: 'Philippe Attey', email: null, isActiveStaff: false }
];

/**
 * Portfolio 2's seeded counts (4 areas, 13 dimensions, 31 indicators) with the
 * dimension codes of area 1 inserted out of order, `1.10` first.
 */
const seededView = (): FrameworkEditorView => {
  const elements: FrameworkEditorElement[] = [];
  for (let area = 1; area <= 4; area++) {
    elements.push(element({ id: area, depth: 1, code: String(area), name: `Area ${area}` }));
  }
  const dimensionCodes = ['1.10', '1.2', '1.1', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '2.1', '2.2', '2.3'];
  const dimensionId = new Map<string, number>();
  dimensionCodes.forEach((code, index) => {
    const id = 100 + index;
    dimensionId.set(code, id);
    const parentCode = code.slice(0, code.indexOf('.'));
    elements.push(element({ id, depth: 2, code, name: `Dimension ${code}`, parentId: Number(parentCode) }));
  });
  for (let n = 1; n <= 31; n++) {
    elements.push(
      element({
        id: 1000 + n,
        depth: 3,
        code: `1.1.${n}`,
        name: `Indicator 1.1.${n}`,
        parentId: dimensionId.get('1.1'),
        responsibles: n === 2 ? responsibles : undefined,
        usage: n === 2 ? { kpis: 46 } : {}
      })
    );
  }
  return {
    portfolioId: 2,
    configured: true,
    levels: SEEDED_LEVELS,
    elements,
    usageLabels: [{ consumerName: 'kpis', label: 'KPIs' }]
  };
};

const FOUR_LEVELS: FrameworkLevel[] = [
  ...SEEDED_LEVELS,
  { id: 4, depth: 4, name: 'Sub-indicator', pluralName: 'Sub-indicators', shortLabel: 'SUB', isIndicatorLevel: false }
];

/** One chain, plus a sibling dimension so a fourth level is not the only new fact. */
const fourLevelView = (): FrameworkEditorView => ({
  portfolioId: 9,
  configured: true,
  levels: FOUR_LEVELS,
  usageLabels: [],
  elements: [
    element({ id: 1, depth: 1, code: '1', name: 'Area' }),
    element({ id: 2, depth: 2, code: '1.1', name: 'Dimension', parentId: 1 }),
    element({ id: 3, depth: 3, code: '1.1.1', name: 'Indicator', parentId: 2, responsibles }),
    element({ id: 4, depth: 4, code: '1.1.1.1', name: 'Sub', parentId: 3 })
  ]
});

type WorkbookLike = import('exceljs').Workbook;

const codesOf = (sheetName: string, workbook: WorkbookLike): string[] => {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`missing sheet ${sheetName}`);
  const codes: string[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    codes.push(String(row.getCell(1).value ?? ''));
  });
  return codes;
};

describe('framework-view.util', () => {
  it('nests the seeded shape in natural order with the seeded counts', async () => {
    const view = seededView();
    expect(summaryLine(view)).toBe('4 performance areas · 13 dimensions · 31 indicators');

    const roots = nestFramework(view);
    expect(roots.map(node => node.element.code)).toEqual(['1', '2', '3', '4']);
    const area1 = roots[0];
    expect(area1.descendantCounts).toEqual({ 2: 10, 3: 31 });
    expect(area1.children.map(node => node.element.code)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10']);
    expect(area1.children.map(node => node.element.code).indexOf('1.2')).toBeLessThan(area1.children.map(node => node.element.code).indexOf('1.10'));
    const dimension11 = area1.children[0];
    expect(dimension11.element.code).toBe('1.1');
    expect(dimension11.descendantCounts).toEqual({ 3: 31 });
    expect(descendantCountText(area1.descendantCounts, view.levels)).toBe('10 dimensions · 31 indicators');

    const indicator = dimension11.children.find(node => node.element.code === '1.1.2');
    expect(indicator).toBeDefined();
    expect(descendantCountText(indicator?.descendantCounts ?? {}, view.levels, indicator?.element.usage, view.usageLabels)).toBe('46 KPIs');

    const indicatorRows = tableRowsForLevel(view, 3);
    expect(indicatorRows.map(row => row.code).indexOf('1.1.2')).toBeLessThan(indicatorRows.map(row => row.code).indexOf('1.1.10'));
    const row = indicatorRows.find(item => item.code === '1.1.2');
    expect(row?.parentCode).toBe('1.1');
    expect(row?.['1Code']).toBe('1');
    expect(row?.['2Code']).toBe('1.1');
    expect(row?.responsiblesText).toBe('Idris Jones; Philippe Attey (inactive)');

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheets = buildExportSheets(view);
    writeExportSheets(workbook, sheets);

    expect(workbook.worksheets).toHaveLength(view.levels.length);
    expect(workbook.worksheets.map(worksheet => worksheet.name)).toEqual(['Performance Areas', 'Dimensions', 'Indicators']);
    const dimensionCodes = codesOf('Dimensions', workbook);
    expect(dimensionCodes).toHaveLength(13);
    expect(dimensionCodes.indexOf('1.2')).toBeLessThan(dimensionCodes.indexOf('1.10'));
    expect(codesOf('Performance Areas', workbook)).toEqual(['1', '2', '3', '4']);
    expect(codesOf('Indicators', workbook)).toHaveLength(31);
    const indicatorSheet = workbook.getWorksheet('Indicators');
    const header: unknown[] = [];
    indicatorSheet?.getRow(1).eachCell(cell => header.push(cell.value));
    expect(header).toContain('Responsibles');
  });

  it('shows a fourth level on the tree, the flattened row and the workbook', async () => {
    const view = fourLevelView();
    expect(summaryLine(view)).toBe('1 performance area · 1 dimension · 1 indicator · 1 sub-indicator');

    const roots = nestFramework(view);
    const sub = roots[0].children[0].children[0].children[0];
    expect(sub.element.code).toBe('1.1.1.1');
    expect(sub.element.depth).toBe(4);
    expect(roots[0].descendantCounts).toEqual({ 2: 1, 3: 1, 4: 1 });

    const [row] = tableRowsForLevel(view, 4);
    expect(row.parentCode).toBe('1.1.1');
    expect(row['1Code']).toBe('1');
    expect(row['2Code']).toBe('1.1');
    expect(row['3Code']).toBe('1.1.1');
    expect(row['1Ancestor']).toBe('1 · Area');
    expect(row['2Ancestor']).toBe('1.1 · Dimension');
    expect(row['3Ancestor']).toBe('1.1.1 · Indicator');
    expect(row.responsiblesText).toBe('');

    const indicatorRow = tableRowsForLevel(view, 3)[0];
    expect(indicatorRow.responsiblesText).toBe('Idris Jones; Philippe Attey (inactive)');

    const sheets = buildExportSheets(view);
    expect(sheets.map(sheet => sheet.name)).toEqual(['Performance Areas', 'Dimensions', 'Indicators', 'Sub-indicators']);
    expect(sheets.find(sheet => sheet.name === 'Sub-indicators')?.columns.map(column => column.field)).not.toContain('responsiblesText');
    expect(sheets.find(sheet => sheet.name === 'Indicators')?.columns.map(column => column.header)).toEqual([
      'Code',
      'Name',
      'Parent code',
      'Performance Area code',
      'Dimension code',
      'Responsibles'
    ]);

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    writeExportSheets(workbook, sheets);
    expect(workbook.worksheets).toHaveLength(4);
    expect(workbook.worksheets.map(worksheet => worksheet.name)).toEqual(['Performance Areas', 'Dimensions', 'Indicators', 'Sub-indicators']);
    expect(codesOf('Sub-indicators', workbook)).toEqual(['1.1.1.1']);
  });
});
