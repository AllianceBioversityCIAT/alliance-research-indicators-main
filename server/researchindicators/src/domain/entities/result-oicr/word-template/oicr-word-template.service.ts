// @akili-spec results/oicr-word-template-2026

import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  catchError,
  firstValueFrom,
  map,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { PortfolioIdEnum } from '../../results/portfolio-handlers/enum/portfolio-id.enum';
import { ResultOicrRepository } from '../repositories/result-oicr.repository';
import {
  OicrWordTemplateMissingControlError,
  OicrWordTemplateMissingOptionError,
  OicrWordTemplateUnexpectedStructureError,
  build,
} from './oicr-word-template.engine';
import { mapOicrWordTemplate } from './oicr-word-template.mapper';

const TEMPLATE_FETCH_TIMEOUT_MS = 10_000;

const NOT_AN_OICR = 'Result is not an OICR';
const PORTFOLIO_2_ONLY =
  'The OICR Word template applies to 2026 (Portfolio 2) OICRs only';
const URL_NOT_CONFIGURED = 'OICR template URL is not configured';

type NamedTemplateError =
  | OicrWordTemplateMissingControlError
  | OicrWordTemplateUnexpectedStructureError
  | OicrWordTemplateMissingOptionError;

/**
 * Orchestrates a 2026 OICR Word download.
 * Indicator, portfolio and the template URL are decided before any fetch.
 * The template bytes are not cached (K-016).
 */
@Injectable()
export class OicrWordTemplateService {
  private readonly logger = new LoggerUtil({
    name: OicrWordTemplateService.name,
  });

  constructor(
    private readonly http: HttpService,
    private readonly appConfig: AppConfig,
    private readonly dataSource: DataSource,
    private readonly resultOicrRepository: ResultOicrRepository,
  ) {}

  async download(
    resultId: number,
    indicatorId: number,
    resultCode: number,
  ): Promise<Buffer> {
    if (indicatorId !== IndicatorsEnum.OICR) {
      this.logger._warn(`result_code=${resultCode} reason=not_an_oicr`);
      throw new BadRequestException(NOT_AN_OICR);
    }

    const portfolioId = await this.portfolioIdOf(resultId);
    if (portfolioId !== PortfolioIdEnum.PORTFOLIO_2) {
      this.logger._warn(
        `result_code=${resultCode} reason=portfolio_${portfolioId ?? 'missing'}`,
      );
      throw new BadRequestException(PORTFOLIO_2_ONLY);
    }

    const url = this.appConfig.ARI_OICR_TEMPLATE_URL?.trim() ?? '';
    if (!url) {
      this.logger._error(
        `result_code=${resultCode} reason=template_url_missing`,
      );
      throw new InternalServerErrorException(URL_NOT_CONFIGURED);
    }

    const data = await this.resultOicrRepository.getWordTemplateData(resultId);
    const template = await this.fetchTemplate(url, resultCode);

    try {
      return await build(template, mapOicrWordTemplate(data));
    } catch (err) {
      if (!isNamedTemplateError(err)) {
        throw err;
      }
      this.logger._error(
        `result_code=${resultCode} control=${err.control} reason=${err.reason}`,
      );
      throw new InternalServerErrorException(err.message);
    }
  }

  /** Same read as `ResultOicrService.findStepTwoLeverRole`. Issued here (P-4). */
  private async portfolioIdOf(resultId: number): Promise<number | null> {
    const rows: { portfolio_id: number | string | null }[] =
      await this.dataSource.query(
        'SELECT get_portfolio_id_by_result(?) AS portfolio_id',
        [resultId],
      );
    const raw = rows?.[0]?.portfolio_id;
    if (raw === null || raw === undefined) return null;
    return Number(raw);
  }

  private async fetchTemplate(
    url: string,
    resultCode: number,
  ): Promise<Buffer> {
    const response = await firstValueFrom(
      this.http
        .get<ArrayBuffer>(url, {
          timeout: TEMPLATE_FETCH_TIMEOUT_MS,
          responseType: 'arraybuffer',
        })
        .pipe(
          timeout(TEMPLATE_FETCH_TIMEOUT_MS),
          map((upstream) => {
            if (upstream.status !== 200) {
              throw Object.assign(new Error('upstream'), {
                response: { status: upstream.status },
              });
            }
            return upstream;
          }),
          catchError((err: unknown) => {
            const detail = fetchFailureDetail(err);
            this.logger._error(
              detail === 'timeout'
                ? `result_code=${resultCode} timeout`
                : `result_code=${resultCode} upstream_status=${detail}`,
            );
            return throwError(
              () =>
                new BadGatewayException(
                  `Could not fetch the OICR template (${detail})`,
                ),
            );
          }),
        ),
    );

    const bytes = response.data;
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  }
}

function isNamedTemplateError(err: unknown): err is NamedTemplateError {
  return (
    err instanceof OicrWordTemplateMissingControlError ||
    err instanceof OicrWordTemplateUnexpectedStructureError ||
    err instanceof OicrWordTemplateMissingOptionError
  );
}

function fetchFailureDetail(err: unknown): number | 'timeout' | 'network' {
  if (isTimeoutFailure(err)) return 'timeout';
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const status = (err as { response?: { status?: unknown } }).response
      ?.status;
    if (typeof status === 'number') return status;
  }
  return 'network';
}

function isTimeoutFailure(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === 'ECONNABORTED' || code === 'ETIMEDOUT';
}
