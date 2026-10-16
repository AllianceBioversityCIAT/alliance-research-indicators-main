import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { AppConfig } from '../app-config/entities/app-config.entity';
import { AppConfigKey } from '../app-config/enum/app-config-key.enum';
import { ClarisaSdgTarget } from '../../tools/clarisa/entities/clarisa-sdg-targets/entities/clarisa-sdg-target.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { PORTFOLIO_2026_SDG_TARGET_CODES } from './portfolio-2026-sdg-target-codes';

@Injectable()
export class Portfolio2026SdgTargetCatalogService {
  private readonly configRepo: Repository<AppConfig>;
  private readonly clarisaRepo: Repository<ClarisaSdgTarget>;

  constructor(
    dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
  ) {
    this.configRepo = dataSource.getRepository(AppConfig);
    this.clarisaRepo = dataSource.getRepository(ClarisaSdgTarget);
  }

  /** Stored codes when the config row exists; otherwise the built-in 2026 list. */
  async getCodes(): Promise<string[]> {
    const config = await this.configRepo.findOne({
      where: {
        key: AppConfigKey.PORTFOLIO_2026_SDG_TARGET_CODES,
        is_active: true,
      },
    });
    if (!config) return [...PORTFOLIO_2026_SDG_TARGET_CODES];

    const stored = this.parseCodes(config.json_value);
    return stored ?? [...PORTFOLIO_2026_SDG_TARGET_CODES];
  }

  async replaceByTargetIds(sdgTargetIds: number[]): Promise<string[]> {
    const ids = [
      ...new Set(
        (sdgTargetIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    const rows =
      ids.length === 0
        ? []
        : await this.clarisaRepo.find({ where: { id: In(ids) } });
    const byId = new Map(rows.map((row) => [Number(row.id), row]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown SDG target id(s): ${missing.join(', ')}`,
      );
    }

    const codes = ids
      .map((id) => String(byId.get(id)?.sdg_target_code ?? '').trim())
      .filter((code) => code.length > 0)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    await this.upsertCodes(codes);
    return codes;
  }

  private parseCodes(value: unknown): string[] | null {
    const raw = typeof value === 'string' ? this.tryParseJson(value) : value;
    if (!Array.isArray(raw)) return null;
    return raw
      .map((code) => String(code).trim())
      .filter((code) => code.length > 0);
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private async upsertCodes(codes: string[]): Promise<void> {
    const key = AppConfigKey.PORTFOLIO_2026_SDG_TARGET_CODES;
    const existing = await this.configRepo.findOne({ where: { key } });
    if (!existing) {
      await this.configRepo.save({
        key,
        description: 'Clarisa SDG target codes offered on portfolio 2026 OICRs',
        category: 'portfolio',
        subcategory: 'sdg',
        json_value: codes,
        is_active: true,
        ...this.currentUser.audit(SetAuditEnum.NEW),
      });
      return;
    }

    await this.configRepo.update(key, {
      json_value: codes,
      is_active: true,
      ...this.currentUser.audit(SetAuditEnum.UPDATE),
    });
  }
}
