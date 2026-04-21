import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { CellValue } from 'exceljs';
import { existsSync } from 'fs';
import { extname } from 'path';
import type {
  ExcelColumnSpec,
  ExcelSheetPreamble,
  ExcelSheetSpec,
  ExcelWorkbookSpec,
} from './excel-workbook.types';

@Injectable()
export class ExcelWorkbookBuilder {
  async toBuffer(spec: ExcelWorkbookSpec): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    for (const sheet of spec.sheets) {
      this.addSheet(workbook, sheet);
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private addSheet(workbook: ExcelJS.Workbook, sheet: ExcelSheetSpec): void {
    const ws = workbook.addWorksheet(sheet.name);
    const colCount = sheet.columns.length;
    let headerRowIndex = 1;
    if (sheet.presentation) {
      headerRowIndex = this.renderPreamble(
        workbook,
        ws,
        sheet.presentation,
        colCount,
      );
    }
    this.applyColumnWidths(ws, sheet.columns);
    const headerRow = ws.getRow(headerRowIndex);
    const defaultBannerFill = sheet.presentation?.headerFillArgb ?? 'FF1F4E79';
    const defaultBannerFont = sheet.presentation?.headerFontArgb ?? 'FFFFFFFF';
    sheet.columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      const fill = col.headerFillArgb ?? defaultBannerFill;
      this.applySolidHeaderCell(cell, fill, defaultBannerFont, true);
    });
    if (sheet.presentation && colCount > 0) {
      ws.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: colCount },
      };
    }
    const fillField = sheet.rowFillArgbField;
    for (const dataRow of sheet.rows) {
      const excelRow = ws.addRow([]);
      sheet.columns.forEach((col, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1);
        cell.value = this.buildCellValue(dataRow, col);
        if (fillField) {
          const raw = dataRow[fillField];
          if (typeof raw === 'string' && /^[0-9A-Fa-f]{8}$/.test(raw)) {
            cell.fill = this.solidFill(raw.toUpperCase());
            const fontArgb = this.isDarkArgb(raw)
              ? 'FFFFFFFF'
              : 'FF000000';
            cell.font = { color: { argb: fontArgb } };
          }
        }
      });
    }
  }

  /**
   * Renders banner (rows 1–2), column-group row (row 3). Returns row index for column headers (4).
   */
  private renderPreamble(
    workbook: ExcelJS.Workbook,
    ws: ExcelJS.Worksheet,
    pre: ExcelSheetPreamble,
    colCount: number,
  ): number {
    const lastCol = Math.max(colCount, pre.bannerTitleMergeToCol);
    const lastLetter = this.excelColumnLetter(lastCol);
    const fillArgb = pre.headerFillArgb ?? 'FF1F4E79';
    const fontArgb = pre.headerFontArgb ?? 'FFFFFFFF';
    const titleFillArgb =
      pre.bannerTitleFillArgb !== undefined ? pre.bannerTitleFillArgb : fillArgb;
    const titleFontArgb =
      pre.bannerTitleFontArgb !== undefined ? pre.bannerTitleFontArgb : fontArgb;

    ws.getRow(1).height = 54;
    ws.getRow(2).height = 28;
    ws.getRow(3).height = 22;

    const fromC = pre.logoMergeFromCol ?? 1;
    const toC = pre.logoMergeToCol ?? 2;
    const toR = pre.logoMergeToRow ?? 1;
    const buf = pre.logoImage?.buffer;
    const bufExt = pre.logoImage?.extension;
    /** ExcelJS `ext` uses px at 96dpi; 180×76 pt ≈ 240×101 px. */
    const logoDisplayExt = pre.logoExtPx ?? { width: 152, height: 64 };
    const logoColOff = pre.logoTlEmu?.nativeColOff ?? 0;
    const logoRowOff = pre.logoTlEmu?.nativeRowOff ?? 0;
    const logoEditAs = pre.logoEditAs ?? 'oneCell';
    const logoTl = {
      nativeCol: fromC - 1,
      nativeRow: 0,
      nativeColOff: logoColOff,
      nativeRowOff: logoRowOff,
    };
    if (buf && buf.length > 0 && bufExt) {
      ws.mergeCells(
        `${this.excelColumnLetter(fromC)}1:${this.excelColumnLetter(toC)}${toR}`,
      );
      const imageId = workbook.addImage({
        base64: Buffer.from(buf).toString('base64'),
        extension: bufExt,
      });
      ws.addImage(
        imageId,
        {
          tl: logoTl,
          ext: logoDisplayExt,
          editAs: logoEditAs,
        } as unknown as Parameters<ExcelJS.Worksheet['addImage']>[1],
      );
    } else if (pre.logoPath && existsSync(pre.logoPath)) {
      ws.mergeCells(
        `${this.excelColumnLetter(fromC)}1:${this.excelColumnLetter(toC)}${toR}`,
      );
      const ext = extname(pre.logoPath).toLowerCase();
      const extension =
        ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : ext === '.gif' ? 'gif' : 'png';
      const imageId = workbook.addImage({
        filename: pre.logoPath,
        extension,
      });
      ws.addImage(
        imageId,
        {
          tl: logoTl,
          ext: logoDisplayExt,
          editAs: logoEditAs,
        } as unknown as Parameters<ExcelJS.Worksheet['addImage']>[1],
      );
    }

    const tFrom = pre.bannerTitleMergeFromCol;
    const tTo = Math.min(pre.bannerTitleMergeToCol, lastCol);
    const titleMerge = `${this.excelColumnLetter(tFrom)}1:${this.excelColumnLetter(tTo)}1`;
    ws.mergeCells(titleMerge);
    const titleCell = ws.getCell(`${this.excelColumnLetter(tFrom)}1`);
    titleCell.value = pre.bannerTitle;
    titleCell.font = {
      bold: true,
      size: 18,
      color: { argb: titleFontArgb },
    };
    titleCell.fill = this.solidFill(titleFillArgb);
    titleCell.alignment = {
      vertical: 'middle',
      horizontal: pre.bannerTitleHorizontalAlign ?? 'right',
      wrapText: false,
    };

    if (pre.bannerSubtitle) {
      ws.mergeCells(`A2:${lastLetter}2`);
      const sub = ws.getCell('A2');
      sub.value = pre.bannerSubtitle;
      sub.font = { size: 11, color: { argb: 'FF000000' } };
      sub.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }

    for (const g of pre.columnGroups) {
      const from = Math.min(g.fromCol, lastCol);
      const to = Math.min(g.toCol, lastCol);
      if (from > to) {
        continue;
      }
      const merge = `${this.excelColumnLetter(from)}3:${this.excelColumnLetter(to)}3`;
      ws.mergeCells(merge);
      const c = ws.getCell(this.excelColumnLetter(from) + '3');
      c.value = g.label;
      const groupFill = g.fillArgb ?? fillArgb;
      this.applySolidHeaderCell(c, groupFill, fontArgb, true);
      c.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
    }

    return 4;
  }

  private applySolidHeaderCell(
    cell: ExcelJS.Cell,
    fillArgb: string,
    fontArgb: string,
    bold: boolean,
  ): void {
    cell.fill = this.solidFill(fillArgb);
    cell.font = { bold, color: { argb: fontArgb }, size: bold ? 11 : 11 };
  }

  private applyColumnWidths(ws: ExcelJS.Worksheet, columns: ExcelColumnSpec[]): void {
    columns.forEach((col, idx) => {
      const column = ws.getColumn(idx + 1);
      if (col.width) {
        column.width = col.width;
      }
    });
  }

  private solidFill(argb: string): ExcelJS.Fill {
    return {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb },
    };
  }

  /** Rough luminance check for ARGB `FFRRGGBB`. */
  private isDarkArgb(argb: string): boolean {
    const h = argb.replace(/^FF/i, '');
    if (h.length !== 6) {
      return false;
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 145;
  }

  /** 1-based column index to Excel letters (1 -> A, 27 -> AA). */
  private excelColumnLetter(colIndex1Based: number): string {
    let n = colIndex1Based;
    let s = '';
    while (n > 0) {
      n -= 1;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }

  private buildCellValue(
    row: Record<string, unknown>,
    col: ExcelColumnSpec,
  ): CellValue {
    if (!col.hyperlink) {
      const v = row[col.key];
      if (v === null || v === undefined) {
        return '';
      }
      return v as CellValue;
    }
    const url = row[col.hyperlink.urlField];
    const urlStr = typeof url === 'string' ? url.trim() : '';
    if (this.isHttpUrl(urlStr)) {
      const displaySource = col.hyperlink.displayField
        ? row[col.hyperlink.displayField]
        : url;
      const text =
        displaySource !== null && displaySource !== undefined
          ? String(displaySource)
          : urlStr;
      return { text, hyperlink: urlStr };
    }
    if (col.hyperlink.emptyDisplay !== undefined) {
      return col.hyperlink.emptyDisplay;
    }
    const displaySource = col.hyperlink.displayField
      ? row[col.hyperlink.displayField]
      : row[col.key];
    if (displaySource === null || displaySource === undefined) {
      return '';
    }
    return String(displaySource);
  }

  private isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }
}
