import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { PiDelegatesService } from './pi-delegates.service';
import { ExcelWorkbookBuilder } from '../reports/core/excel-workbook.builder';
import type {
  ExcelColumnSpec,
  ExcelSheetPreamble,
  ExcelWorkbookSpec,
} from '../reports/core/excel-workbook.types';
import { STAR_RESULTS_METADATA_HEADER_LOGO_URL } from '../reports/constants/star-results-metadata.constants';
import {
  STAR_RAW_BANNER_TITLE_FILL_ARGB,
  STAR_RAW_BANNER_TITLE_FONT_ARGB,
  STAR_RAW_LOGO_EXT_PX,
  STAR_RAW_LOGO_ROW_OFF_EMU,
  STAR_RAW_SHEET_HEADER_FILL_ARGB,
  STAR_RAW_SHEET_HEADER_FONT_ARGB,
} from '../reports/handlers/star-results-metadata/star-results-metadata.sheet-presentation';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { sanitizeXml1Text } from '../../shared/utils/xml1-text-sanitize.util';
import { PiDelegateScopeEnum } from './enum/pi-delegate-scope.enum';
import {
  ExportByPersonDto,
  ExportByPersonFiltersDto,
  ExportByProjectDto,
  ExportByProjectFiltersDto,
} from './dto/export-pi-delegates.dto';
import { DelegateProjectsResponseDto } from './dto/pi-delegate-response.dto';

const HEADER_LOGO_CANDIDATE = join(
  __dirname,
  '../reports/assets/report-header-logo.png',
);

export const PI_DELEGATES_EXPORT_SUBTITLE_PREFIX =
  'This file contains the PI delegates data generated from the selected filters in STAR';

type LogoImage = { buffer: Buffer; extension: 'png' | 'jpeg' | 'gif' };

export const BY_PROJECT_COLUMNS: ExcelColumnSpec[] = [
  { key: 'project_code', header: 'Project code', width: 16 },
  { key: 'project_name', header: 'Project name', width: 50 },
  { key: 'status', header: 'Status', width: 16 },
  { key: 'pool_funding', header: 'Pool funding contributor', width: 22 },
  { key: 'pi_name', header: 'Principal Investigator', width: 28 },
  {
    key: 'delegate_count',
    header: 'Number of delegates',
    width: 18,
    cellDataType: 'integer',
  },
  { key: 'delegate_names', header: 'Delegates', width: 45 },
];

export const BY_PERSON_COLUMNS: ExcelColumnSpec[] = [
  { key: 'name', header: 'Name', width: 30 },
  { key: 'email', header: 'Email', width: 34 },
  { key: 'carnet', header: 'Carnet', width: 14 },
  { key: 'active', header: 'Active status', width: 14 },
  {
    key: 'project_count',
    header: 'Number of projects',
    width: 18,
    cellDataType: 'integer',
  },
  { key: 'project_codes', header: 'Project codes', width: 40 },
  { key: 'project_names', header: 'Project names', width: 60 },
];

function clean(s: string | null | undefined): string {
  return sanitizeXml1Text((s ?? '').trim());
}

export function buildByProjectFiltersText(
  filters?: ExportByProjectFiltersDto,
): string {
  const parts: string[] = [];
  if (filters?.role === 'pi') parts.push('Role: Principal Investigator');
  if (filters?.role === 'delegate') parts.push('Role: PI Delegate');
  if (filters?.ongoing_only) parts.push('Ongoing projects');
  if (filters?.without_delegates_only) parts.push('Projects without delegates');
  const q = clean(filters?.search);
  if (q) parts.push(`Search: "${q}"`);
  return parts.length ? parts.join(' · ') : 'No filters applied';
}

export function buildByPersonFiltersText(
  filters?: ExportByPersonFiltersDto,
): string {
  const q = clean(filters?.search);
  return q ? `Search: "${q}"` : 'No filters applied';
}

@Injectable()
export class PiDelegatesExportService {
  private readonly logger = new LoggerUtil({
    name: PiDelegatesExportService.name,
  });

  constructor(
    private readonly piDelegatesService: PiDelegatesService,
    private readonly excelWorkbookBuilder: ExcelWorkbookBuilder,
    private readonly currentUserUtil: CurrentUserUtil,
  ) {}

  /** Keeps only `keys`, in the request order, from the authorized `rows`. */
  private pickInOrder<T, K>(rows: T[], keys: K[], keyOf: (row: T) => K): T[] {
    const byKey = new Map<K, T>();
    for (const row of rows) byKey.set(keyOf(row), row);
    const seen = new Set<K>();
    const out: T[] = [];
    for (const key of keys ?? []) {
      const row = byKey.get(key);
      if (row && !seen.has(key)) {
        seen.add(key);
        out.push(row);
      }
    }
    return out;
  }

  async buildByProjectWorkbook(dto: ExportByProjectDto): Promise<Buffer> {
    const scope = dto.scope ?? PiDelegateScopeEnum.MANAGED;
    const authorized = await this.piDelegatesService.listManagedProjects(
      dto.user_id,
      scope,
    );
    const projects = this.pickInOrder(
      authorized,
      dto.project_codes,
      (p) => p.project_code,
    );
    this.logger._log(
      `by-project export: ${projects.length}/${dto.project_codes?.length ?? 0} keys authorized`,
    );
    const rows = projects.map((p) => ({
      project_code: clean(p.project_code),
      project_name: clean(p.project_name),
      status: clean(p.status),
      pool_funding: p.is_pool_funding_contributor ? 'Yes' : 'No',
      pi_name: clean(p.pi_name),
      delegate_count: p.delegates.length,
      delegate_names: p.delegates.map((d) => clean(d.name)).join('; '),
    }));
    return this.toBuffer(
      'By project',
      'PROJECTS',
      BY_PROJECT_COLUMNS,
      rows,
      buildByProjectFiltersText(dto.filters),
    );
  }

  async buildByPersonWorkbook(dto: ExportByPersonDto): Promise<Buffer> {
    const scope = dto.scope ?? PiDelegateScopeEnum.MANAGED;
    const authorized = await this.piDelegatesService.listManagedDelegates(
      dto.user_id,
      scope,
    );
    const people: DelegateProjectsResponseDto[] = this.pickInOrder(
      authorized,
      dto.delegate_user_ids,
      (p) => p.delegate_user_id,
    );
    this.logger._log(
      `by-person export: ${people.length}/${dto.delegate_user_ids?.length ?? 0} keys authorized`,
    );
    const rows = people.map((p) => ({
      name: clean(p.name),
      email: clean(p.email),
      carnet: clean(p.carnet),
      active: p.is_active ? 'Active' : 'Inactive',
      project_count: p.projects.length,
      project_codes: p.projects.map((x) => clean(x.project_code)).join('; '),
      project_names: p.projects.map((x) => clean(x.project_name)).join('; '),
    }));
    return this.toBuffer(
      'By person',
      'PEOPLE',
      BY_PERSON_COLUMNS,
      rows,
      buildByPersonFiltersText(dto.filters),
    );
  }

  /** Subtitle text shared by both exports. */
  buildSubtitle(filtersText: string): string {
    return `${PI_DELEGATES_EXPORT_SUBTITLE_PREFIX}. Filters applied: ${filtersText}`;
  }

  /** `STAR_pi_delegates_<kind>_YYYYMMDD_HHMM_<INITIALS>.xlsx` */
  buildFilename(kind: 'by_project' | 'by_person', now = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
    return `STAR_pi_delegates_${kind}_${stamp}_${this.initials()}.xlsx`;
  }

  private initials(): string {
    const user = this.currentUserUtil.user;
    const f = (user?.first_name ?? '').trim().charAt(0);
    const l = (user?.last_name ?? '').trim().charAt(0);
    const out = `${f}${l}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return out || 'UU';
  }

  private async toBuffer(
    sheetName: string,
    groupLabel: string,
    columns: ExcelColumnSpec[],
    rows: Record<string, unknown>[],
    filtersText: string,
  ): Promise<Buffer> {
    const logo = await this.resolveHeaderLogoImage();
    const presentation: ExcelSheetPreamble = {
      bannerTitle: 'ALLIANCE PI DELEGATES',
      bannerTitleHorizontalAlign: 'left',
      bannerTitleFillArgb: STAR_RAW_BANNER_TITLE_FILL_ARGB,
      bannerTitleFontArgb: STAR_RAW_BANNER_TITLE_FONT_ARGB,
      bannerTitleMergeFromCol: 3,
      bannerTitleMergeToCol: columns.length,
      logoMergeFromCol: 1,
      logoMergeToCol: 2,
      logoMergeToRow: 1,
      logoExtPx: STAR_RAW_LOGO_EXT_PX,
      logoTlEmu: { nativeColOff: 0, nativeRowOff: STAR_RAW_LOGO_ROW_OFF_EMU },
      logoEditAs: 'absolute',
      headerFillArgb: STAR_RAW_SHEET_HEADER_FILL_ARGB,
      headerFontArgb: STAR_RAW_SHEET_HEADER_FONT_ARGB,
      bannerSubtitle: this.buildSubtitle(filtersText),
      columnGroups: [
        {
          fromCol: 1,
          toCol: columns.length,
          label: groupLabel,
          fillArgb: 'FF203C61',
        },
      ],
      ...(logo ? { logoImage: logo } : {}),
    };
    const spec: ExcelWorkbookSpec = {
      sheets: [{ name: sheetName, columns, rows, presentation }],
    };
    return this.excelWorkbookBuilder.toBuffer(spec);
  }

  private async resolveHeaderLogoImage(): Promise<LogoImage | undefined> {
    try {
      const res = await fetch(STAR_RESULTS_METADATA_HEADER_LOGO_URL);
      if (!res.ok) return this.readBundledHeaderLogo();
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) return this.readBundledHeaderLogo();
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      const extension: LogoImage['extension'] = ct.includes('gif')
        ? 'gif'
        : ct.includes('jpeg') || ct.includes('jpg')
          ? 'jpeg'
          : 'png';
      return { buffer: buf, extension };
    } catch {
      return this.readBundledHeaderLogo();
    }
  }

  private readBundledHeaderLogo(): LogoImage | undefined {
    if (!existsSync(HEADER_LOGO_CANDIDATE)) return undefined;
    const ext = extname(HEADER_LOGO_CANDIDATE).toLowerCase();
    const extension: LogoImage['extension'] =
      ext === '.jpg' || ext === '.jpeg'
        ? 'jpeg'
        : ext === '.gif'
          ? 'gif'
          : 'png';
    return { buffer: readFileSync(HEADER_LOGO_CANDIDATE), extension };
  }
}
