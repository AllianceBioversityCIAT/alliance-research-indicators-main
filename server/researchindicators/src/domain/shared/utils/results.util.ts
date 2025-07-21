import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';

@Injectable()
export class ResultsUtil {
  private currentResult: Result;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async setup() {
    const resultCode =
      this.request.params?.[RESULT_CODE_PARAM] ??
      this.request.query?.[RESULT_CODE_PARAM];
    const reportYear = this.request.query?.[REPORT_YEAR_PARAM];
    const where: FindOptionsWhere<Result> = {};
    if (!resultCode) return null;

    if (!reportYear) {
      where.result_official_code = Number(resultCode);
      where.is_active = true;
      where.is_snapshot = false;
    } else {
      where.result_official_code = Number(resultCode);
      where.report_year_id = Number(reportYear);
      where.is_active = true;
      where.is_snapshot = true;
    }

    return this.dataSource
      .getRepository(Result)
      .findOne({
        select: {
          report_year_id: true,
          result_official_code: true,
          result_id: true,
          indicator_id: true,
        },
        where,
      })
      .then((result) => {
        this.currentResult = result;
        return result;
      });
  }

  get result(): Result {
    if (!this.currentResult) throw new BadRequestException('Result not found');
    return this.currentResult;
  }

  get resultId(): number {
    if (!this.currentResult) throw new BadRequestException('Result not found');
    return this.currentResult.result_id;
  }

  get resultCode(): number {
    if (!this.currentResult) throw new BadRequestException('Result not found');
    return this.currentResult.result_official_code;
  }

  get nullResultCode(): number {
    return this.currentResult?.result_official_code ?? null;
  }

  get nullReportYearId(): number {
    return this.currentResult?.report_year_id ?? null;
  }
}

export const RESULT_CODE = ':resultCode(\\d+)';
export const RESULT_CODE_PARAM = 'resultCode';
export const REPORT_YEAR_PARAM = 'reportYear';
