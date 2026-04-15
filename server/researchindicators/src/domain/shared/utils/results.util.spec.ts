import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';
import {
  REPORT_YEAR_PARAM,
  REPORTING_PLATFORMS,
  RESULT_CODE_PARAM,
  ResultsUtil,
  resultDefaultParametersSQL,
} from './results.util';

describe('resultDefaultParametersSQL', () => {
  it('uses alias r by default', () => {
    expect(resultDefaultParametersSQL()).toContain('r.result_id');
    expect(resultDefaultParametersSQL()).toContain('r.platform_code');
  });

  it('uses custom alias', () => {
    const sql = resultDefaultParametersSQL('res');
    expect(sql).toContain('res.result_id');
    expect(sql).not.toContain('r.result_id');
  });
});

describe('ResultsUtil', () => {
  let util: ResultsUtil;
  let findOne: jest.Mock;

  const mockResult = {
    report_year_id: 2024,
    result_official_code: 99,
    result_id: 7,
    indicator_id: 3,
    result_status_id: 2,
    platform_code: 'STAR',
  } as Result;

  async function createUtil(request: { params?: any; query?: any }) {
    findOne = jest.fn();
    const mockRepository = { findOne };
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsUtil,
        { provide: DataSource, useValue: mockDataSource },
        { provide: REQUEST, useValue: request },
      ],
    }).compile();

    return module.get(ResultsUtil);
  }

  it('setup returns null when result code is missing', async () => {
    util = await createUtil({ params: {}, query: {} });
    await expect(util.setup()).resolves.toBeNull();
  });

  it('setup loads active non-snapshot result when report year omitted', async () => {
    util = await createUtil({
      params: { [RESULT_CODE_PARAM]: '99' },
      query: {},
    });
    findOne.mockResolvedValue(mockResult);

    const out = await util.setup();

    expect(out).toEqual(mockResult);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          result_official_code: 99,
          is_active: true,
          is_snapshot: false,
        }),
      }),
    );
  });

  it('setup uses report year and snapshot when reportYear query set', async () => {
    util = await createUtil({
      params: { [RESULT_CODE_PARAM]: '99' },
      query: { [REPORT_YEAR_PARAM]: '2024', [REPORTING_PLATFORMS]: 'PRMS' },
    });
    findOne.mockResolvedValue(mockResult);

    await util.setup();

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          result_official_code: 99,
          report_year_id: 2024,
          is_snapshot: true,
          platform_code: 'PRMS',
        }),
      }),
    );
  });

  it('setup reads result code from query when params missing', async () => {
    util = await createUtil({
      params: {},
      query: { [RESULT_CODE_PARAM]: '5' },
    });
    findOne.mockResolvedValue(mockResult);

    await util.setup();

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ result_official_code: 5 }),
      }),
    );
  });

  it('setCurrentResult assigns repository row', async () => {
    util = await createUtil({ params: {}, query: {} });
    findOne.mockResolvedValue(mockResult);

    await util.setCurrentResult(7);

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { result_id: 7, is_active: true },
      }),
    );
    expect(util.result).toEqual(mockResult);
  });

  it('clearManually and nullable getters', async () => {
    util = await createUtil({ params: {}, query: {} });

    expect(util.nullResultCode).toBeNull();
    expect(util.nullResultId).toBeNull();

    findOne.mockResolvedValue(mockResult);
    await util.setCurrentResult(7);
    util.clearManually();

    expect(util.nullResultCode).toBeNull();
    expect(() => util.result).toThrow(BadRequestException);
  });

  it('throws BadRequestException when accessing strict getters without current result', async () => {
    util = await createUtil({ params: {}, query: {} });

    expect(() => util.result).toThrow(BadRequestException);
    expect(() => util.platformCode).toThrow(BadRequestException);
    expect(() => util.resultId).toThrow(BadRequestException);
    expect(() => util.resultCode).toThrow(BadRequestException);
    expect(() => util.statusId).toThrow(BadRequestException);
    expect(() => util.indicatorId).toThrow(BadRequestException);
  });

  it('exposes fields when current result is set', async () => {
    util = await createUtil({ params: {}, query: {} });
    findOne.mockResolvedValue(mockResult);
    await util.setCurrentResult(7);

    expect(util.result).toEqual(mockResult);
    expect(util.platformCode).toBe('STAR');
    expect(util.resultId).toBe(7);
    expect(util.resultCode).toBe(99);
    expect(util.statusId).toBe(2);
    expect(util.indicatorId).toBe(3);
    expect(util.nullReportYearId).toBe(2024);
    expect(util.nullStatusId).toBe(2);
    expect(util.nullIndicatorId).toBe(3);
    expect(util.nullPlatformCode).toBe('STAR');
  });
});
