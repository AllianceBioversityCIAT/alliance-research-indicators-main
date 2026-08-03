import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectResultsTableService } from './project-results-table.service';
import { ApiService } from '../../services/api.service';

describe('ProjectResultsTableService', () => {
  let service: ProjectResultsTableService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    const apiSpy = {
      GET_ResultsByContractId: jest.fn().mockResolvedValue({
        data: []
      })
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: apiSpy }]
    });
    service = TestBed.inject(ProjectResultsTableService);
    mockApiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch data and process results', async () => {
    const mockResults = [
      {
        result_official_code: 123,
        title: 'Test Result',
        indicator: { name: 'Test Indicator' },
        result_status: { name: 'Active' },
        created_user: { first_name: 'John', last_name: 'Doe' }
      }
    ];

    mockApiService.GET_ResultsByContractId.mockResolvedValue({
      data: mockResults
    });

    service.contractId = 'test-contract';
    await service.getData();

    expect(mockApiService.GET_ResultsByContractId).toHaveBeenCalledWith('test-contract');
    expect(service.loading()).toBe(false);
    expect(service.resultList()).toEqual([
      {
        ...mockResults[0],
        full_name: '123 - Test Result - Test Indicator',
        indicatorName: 'Test Indicator',
        statusName: 'Active',
        creatorName: 'John Doe'
      }
    ]);
  });
});
