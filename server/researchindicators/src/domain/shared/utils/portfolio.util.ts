import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Portfolio } from '../../entities/portfolios/entities/portfolio.entity';
import {
  DataSource,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { PORTFOLIO_ID_PARAM } from '../decorators/portfolio.decorator';
import { REPORT_YEAR_PARAM, ResultsUtil } from './results.util';

@Injectable()
export class PortfolioUtil {
  private currentPortfolio: Portfolio;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REQUEST) private readonly request: Request,
    private readonly currentResultUtil: ResultsUtil,
  ) {}

  async setup() {
    const portfolioId =
      this.request.params?.[PORTFOLIO_ID_PARAM] ??
      this.request.query?.[PORTFOLIO_ID_PARAM];

    const reportYear =
      this.currentResultUtil.nullReportYearId ??
      this.request.query?.[REPORT_YEAR_PARAM];

    const where: FindOptionsWhere<Portfolio> = {};
    where.is_active = true;
    if (!portfolioId && !reportYear) return null;

    if (portfolioId) {
      where.id = Number(portfolioId);
    } else if (reportYear) {
      where.start_year = LessThanOrEqual(Number(reportYear));
      where.end_year = MoreThanOrEqual(Number(reportYear));
    }

    return this.dataSource
      .getRepository(Portfolio)
      .findOne({
        select: {
          id: true,
          name: true,
          description: true,
          start_year: true,
          end_year: true,
        },
        where,
      })
      .then((portfolio) => {
        this.currentPortfolio = portfolio;
        return portfolio;
      });
  }

  async setCurrentPortfolio(portfolioId: number) {
    const tempPortfolio = await this.dataSource
      .getRepository(Portfolio)
      .findOne({
        select: {
          id: true,
          name: true,
          description: true,
          start_year: true,
          end_year: true,
        },
        where: { id: portfolioId, is_active: true },
      })
      .then((portfolio) => {
        this.currentPortfolio = portfolio;
        return portfolio;
      });
    this.currentPortfolio = tempPortfolio;
  }

  clearManually() {
    this.currentPortfolio = null;
  }

  get portfolio(): Portfolio {
    if (!this.currentPortfolio)
      throw new BadRequestException('Portfolio not found');
    return this.currentPortfolio;
  }

  get portfolioId(): number {
    if (!this.currentPortfolio)
      throw new BadRequestException('Portfolio not found');
    return this.currentPortfolio.id;
  }

  get portfolioName(): string {
    if (!this.currentPortfolio)
      throw new BadRequestException('Portfolio not found');
    return this.currentPortfolio.name;
  }

  get portfolioDescription(): string {
    if (!this.currentPortfolio)
      throw new BadRequestException('Portfolio not found');
    return this.currentPortfolio.description;
  }

  get nullPortfolio(): Portfolio {
    return { ...this.currentPortfolio };
  }

  get nullPortfolioId(): number {
    return this.currentPortfolio?.id ?? null;
  }

  get nullPortfolioName(): string {
    return this.currentPortfolio?.name ?? null;
  }

  get nullPortfolioDescription(): string {
    return this.currentPortfolio?.description ?? null;
  }
}
