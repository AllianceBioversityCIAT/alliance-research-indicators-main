import { DataSource } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultOicrAudiencesService } from './result-oicr-audiences.service';
import { ResultOicrThematicKeywordsService } from './result-oicr-thematic-keywords.service';
import { ResultOicrAudience } from './entities/result-oicr-audience.entity';
import { ResultOicrThematicKeyword } from './entities/result-oicr-thematic-keyword.entity';

describe('OICR result link services', () => {
  const getRepository = jest.fn().mockReturnValue({
    metadata: { primaryColumns: [{ propertyName: 'id' }] },
  });
  const dataSource = { getRepository } as unknown as DataSource;
  const currentUser = {} as CurrentUserUtil;

  it('binds the audiences link service to ResultOicrAudience keyed by result_id', () => {
    const service = new ResultOicrAudiencesService(dataSource, currentUser);
    expect(service).toBeInstanceOf(ResultOicrAudiencesService);
    expect(getRepository).toHaveBeenCalledWith(ResultOicrAudience);
    expect((service as any).resultKey).toBe('result_id');
  });

  it('binds the thematic keywords link service to ResultOicrThematicKeyword keyed by result_id', () => {
    const service = new ResultOicrThematicKeywordsService(
      dataSource,
      currentUser,
    );
    expect(service).toBeInstanceOf(ResultOicrThematicKeywordsService);
    expect(getRepository).toHaveBeenCalledWith(ResultOicrThematicKeyword);
    expect((service as any).resultKey).toBe('result_id');
  });
});
