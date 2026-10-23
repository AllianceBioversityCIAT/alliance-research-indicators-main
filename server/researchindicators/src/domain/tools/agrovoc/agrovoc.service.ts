import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  catchError,
  firstValueFrom,
  map,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { mapAgrovocTerms } from './agrovoc-terms.mapper';
import {
  AgrovocTermDto,
  AgrovocUpstreamResponse,
} from './dto/agrovoc-term.dto';

const SEARCH_TIMEOUT_MS = 15_000;
const UPSTREAM_UNAVAILABLE = 'AGROVOC service is unavailable';
const HOST_UNCONFIGURED = 'AGROVOC host is not configured (ARI_AGROVOC_URL)';

/**
 * Direct HttpService call. BaseApi is not used: its catchError maps
 * transport failures to null, which would look like "no matches".
 */
@Injectable()
export class AgrovocService {
  private readonly logger = new LoggerUtil({ name: AgrovocService.name });

  constructor(
    private readonly http: HttpService,
    private readonly appConfig: AppConfig,
  ) {}

  async search(query: string): Promise<AgrovocTermDto[]> {
    const normalized = this.normalizeQuery(query);
    const host = this.appConfig.ARI_AGROVOC_URL?.trim() ?? '';
    if (!host) {
      this.logger._warn(HOST_UNCONFIGURED);
      throw new ServiceUnavailableException(HOST_UNCONFIGURED);
    }

    const url = `${host.replace(/\/+$/, '')}/browse/rest/v1/search/`;
    return firstValueFrom(
      this.http
        .get<AgrovocUpstreamResponse>(url, {
          params: {
            query: `*${normalized}*`,
            lang: 'en',
            maxhits: 1000,
          },
        })
        .pipe(
          timeout(SEARCH_TIMEOUT_MS),
          map((response) => {
            if (!Array.isArray(response?.data?.results)) {
              this.logUpstreamFailure(
                normalized,
                response?.status ?? 'network',
              );
              throw new BadGatewayException(UPSTREAM_UNAVAILABLE);
            }
            return mapAgrovocTerms(response.data.results, normalized);
          }),
          catchError((err: unknown) => {
            if (!(err instanceof BadGatewayException)) {
              this.logUpstreamFailure(normalized, upstreamStatusOf(err));
            }
            return throwError(() =>
              err instanceof BadGatewayException
                ? err
                : new BadGatewayException(UPSTREAM_UNAVAILABLE),
            );
          }),
        ),
    );
  }

  private normalizeQuery(query: string): string {
    const normalized = String(query ?? '')
      .trim()
      .replace(/\*/g, '')
      .trim();
    if (normalized.length < 3 || normalized.length > 100) {
      throw new BadRequestException(
        'query must be between 3 and 100 characters',
      );
    }
    return normalized;
  }

  private logUpstreamFailure(
    query: string,
    upstreamStatus: number | 'timeout' | 'network',
  ): void {
    this.logger._error(JSON.stringify({ query, upstreamStatus }));
  }
}

function upstreamStatusOf(err: unknown): number | 'timeout' | 'network' {
  if (err instanceof TimeoutError) {
    return 'timeout';
  }
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const status = (err as { response?: { status?: unknown } }).response
      ?.status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return 'network';
}
