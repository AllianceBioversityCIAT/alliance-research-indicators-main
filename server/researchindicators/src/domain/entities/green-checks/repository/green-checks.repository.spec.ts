import { DataSource } from 'typeorm';
import { GreenCheckRepository } from './green-checks.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';

jest.mock('date-fns-tz', () => ({
  format: jest.fn(() => '15/06/2025 at 14:30'),
}));

describe('GreenCheckRepository', () => {
  let repository: GreenCheckRepository;
  let queryMock: jest.Mock;
  let findOneMock: jest.Mock;

  const appConfig = {
    ARI_MYSQL_NAME: 'main_db',
  } as AppConfig;

  beforeEach(() => {
    queryMock = jest.fn();
    findOneMock = jest.fn();
    const dataSource = {
      query: queryMock,
      getRepository: jest.fn().mockReturnValue({
        findOne: findOneMock,
      }),
    } as unknown as DataSource;
    repository = new GreenCheckRepository(dataSource, appConfig);
  });

  it('validation helpers return SQL fragments', () => {
    expect(repository.generalInformationValidation('r.x')).toContain(
      'general_information_validation',
    );
    expect(repository.alignmentValidation('r.x')).toContain('alignment_validation');
    expect(repository.geoLocationValidation('r.x')).toContain('geo_location_validation');
    expect(repository.partnersValidation('r.x')).toContain('partners_validation');
    expect(repository.evidencesValidation('r.x')).toContain('evidences_validation');
    expect(repository.capSharingValidation('r.x')).toContain('cap_sharing_validation');
    expect(repository.capSharingIpValidation('r.x')).toContain(
      'intellectual_property_validation',
    );
    expect(repository.policyChangeValidation('r.x')).toContain(
      'policy_change_validation',
    );
    expect(repository.innovationDevValidation('r.x')).toContain(
      'innovation_dev_validation',
    );
    expect(repository.oicrValidation('r.x')).toContain('oicr_validation');
    expect(repository.link_resultValidation('r.x')).toContain(
      'link_result_validation',
    );
  });

  it('calculateGreenChecks includes policy_change for POLICY_CHANGE', async () => {
    findOneMock.mockResolvedValue({ indicator_id: IndicatorsEnum.POLICY_CHANGE });
    queryMock.mockResolvedValueOnce([{ general_information: 1 }]);
    const out = await repository.calculateGreenChecks(1);
    expect(queryMock.mock.calls[0][0] as string).toContain(
      'policy_change_validation',
    );
    expect(out).toEqual({ general_information: 1 });
  });

  it('calculateGreenChecks adds OICR-specific validations', async () => {
    findOneMock.mockResolvedValue({ indicator_id: IndicatorsEnum.OICR });
    queryMock.mockResolvedValueOnce([{}]);
    await repository.calculateGreenChecks(1);
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('oicr_validation');
    expect(sql).toContain('link_result_validation');
  });

  it('calculateGreenChecks adds cap sharing and IP for CAPACITY_SHARING', async () => {
    findOneMock.mockResolvedValue({
      indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    });
    queryMock.mockResolvedValueOnce([{}]);
    await repository.calculateGreenChecks(2);
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('cap_sharing_validation');
    expect(sql).toContain('intellectual_property_validation');
  });

  it('calculateGreenChecks adds innovation and IP for INNOVATION_DEV', async () => {
    findOneMock.mockResolvedValue({ indicator_id: IndicatorsEnum.INNOVATION_DEV });
    queryMock.mockResolvedValueOnce([{}]);
    await repository.calculateGreenChecks(3);
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('innovation_dev_validation');
    expect(sql).toContain('intellectual_property_validation');
  });

  it('calculateGreenChecks returns null when query empty', async () => {
    findOneMock.mockResolvedValue({ indicator_id: IndicatorsEnum.INNOVATION_USE });
    queryMock.mockResolvedValueOnce([]);
    await expect(repository.calculateGreenChecks(9)).resolves.toBeNull();
  });

  it('getSubmissionHistory queries with mysql name', async () => {
    queryMock.mockResolvedValueOnce([]);
    await repository.getSubmissionHistory(3);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('main_db.sec_users'),
      [3],
    );
  });

  it('canSubmit returns true when principal', async () => {
    queryMock
      .mockResolvedValueOnce([{ is_principal: 1 }])
      .mockResolvedValueOnce([{ validation: 0 }])
      .mockResolvedValueOnce([{ validation: 0 }]);
    await expect(repository.canSubmit(1, 2)).resolves.toBe(true);
  });

  it('canSubmit uses role and owner checks when not principal', async () => {
    queryMock
      .mockResolvedValueOnce([{ is_principal: 0 }])
      .mockResolvedValueOnce([{ validation: 1 }])
      .mockResolvedValueOnce([{ validation: 1 }]);
    await expect(repository.canSubmit(1, 2)).resolves.toBe(true);
  });

  it('canSubmit embeds needRoles in roles query', async () => {
    queryMock
      .mockResolvedValueOnce([{ is_principal: 0 }])
      .mockResolvedValueOnce([{ validation: 1 }])
      .mockResolvedValueOnce([{ validation: 1 }]);
    await repository.canSubmit(1, 2, [7, 8]);
    const rolesSql = queryMock.mock.calls[1][0] as string;
    expect(rolesSql).toContain('sur.role_id IN (7,8)');
  });

  it('canSubmit returns false when not principal and checks fail', async () => {
    queryMock
      .mockResolvedValueOnce([{ is_principal: 0 }])
      .mockResolvedValueOnce([{ validation: 0 }])
      .mockResolvedValueOnce([{ validation: 1 }]);
    await expect(repository.canSubmit(5, 6)).resolves.toBe(false);
  });

  it('oircData formats decision_date and applies metadata flags', async () => {
    queryMock.mockResolvedValueOnce([
      {
        title: 'T',
        oicr_number: 'N1',
        mel_expert_name: 'A B',
        requester_by: 'C, D',
        sharepoint_url: 'sp',
        reviewed_by: 'E, F',
        decision_date: '2025-01-15T10:00:00.000Z',
        justification: 'ok',
        url: 'x',
        requester_by_email: 'c@d',
        reviewed_by_email: 'e@f',
        mel_expert_email: 'm@e',
      },
    ]);
    const out = await repository.oircData(9, {
      url: 'https://x.org/y',
      historyId: 100,
      is_requested: true,
    });
    expect(queryMock.mock.calls[0][0] as string).toContain(
      'sh.submission_history_id = 100',
    );
    expect(queryMock.mock.calls[0][0] as string).toContain(
      'AND sh.from_status_id = 9',
    );
    expect(out.url).toBe('https://x.org/y');
    expect(out.decision_date).toBe('15/06/2025 at 14:30');
  });

  it('getDataForSubmissionResult returns null when empty', async () => {
    queryMock.mockResolvedValueOnce([]);
    await expect(repository.getDataForSubmissionResult(1)).resolves.toBeNull();
  });

  it('getDataForSubmissionResult returns first row', async () => {
    queryMock.mockResolvedValueOnce([{ contributor_id: 1 }]);
    await expect(repository.getDataForSubmissionResult(2)).resolves.toEqual({
      contributor_id: 1,
    });
  });

  it('createSnapshot skips delete when no snapshot', async () => {
    findOneMock.mockResolvedValue(null);
    queryMock.mockResolvedValueOnce(undefined);
    await repository.createSnapshot(100, 2024);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain('SP_versioning');
  });

  it('createSnapshot deletes existing snapshot first', async () => {
    findOneMock.mockResolvedValue({ result_id: 1 });
    queryMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    await repository.createSnapshot(100, 2024);
    expect(queryMock.mock.calls[0][0]).toContain('SP_delete_result_version');
  });

  it('getDataForReviseResult merges history rows', async () => {
    queryMock
      .mockResolvedValueOnce([
        { result_id: 10, title: 'T', indicator: 'I' },
      ])
      .mockResolvedValueOnce([
        {
          to_status_id: ResultStatusEnum.REVISED,
          submission_comment: 'rev',
          user: {
            first_name: 'R',
            last_name: 'V',
            email: 'r@v.com',
          },
        },
        {
          to_status_id: ResultStatusEnum.DRAFT,
          submission_comment: 'sub',
          user: {
            first_name: 'S',
            last_name: 'U',
            email: 's@u.com',
          },
        },
      ]);

    const out = await repository.getDataForReviseResult(
      1,
      ResultStatusEnum.REVISED,
      ResultStatusEnum.DRAFT,
    );

    expect(out.result_id).toBe(10);
    expect(out.rev_first_name).toBe('R');
    expect(out.sub_first_name).toBe('S');
  });
});
