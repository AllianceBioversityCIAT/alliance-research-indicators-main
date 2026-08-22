import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetContractSpAlignmentService } from './get-contract-sp-alignment.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';

const alignmentUrl = (id: string) =>
  `${environment.mainApiUrl}agresso/contracts/reports/sp-alignment?contract-id=${encodeURIComponent(id)}`;

describe('GetContractSpAlignmentService', () => {
  let service: GetContractSpAlignmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetContractSpAlignmentService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetContractSpAlignmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the null empty-state contract before any load resolves', () => {
    expect(service.list()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('should store the contract id and trigger an update from main', () => {
    service.update = jest.fn();

    service.main('A1676');

    expect(service.contractId).toBe('A1676');
    expect(service.update).toHaveBeenCalled();
  });

  it('should not issue a request when update is called with an empty contract id', async () => {
    await service.update();

    expect(service.list()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should load the SP alignment report from the API envelope (envelope handling)', async () => {
    const payload: ContractSpAlignmentReport = {
      sps: [
        {
          sp_code: 'SP01',
          name: 'Science Program 1',
          category: 'Category A',
          icon_key: 'icon-sp01',
          links: [
            {
              result_official_code: 'STAR-101',
              result_title: 'Result Title 1',
              role: 'PRIMARY'
            },
            {
              result_official_code: 'STAR-102',
              result_title: 'Result Title 2',
              role: 'CONTRIBUTING'
            },
            {
              result_official_code: 'STAR-103',
              result_title: 'Result Title 3',
              role: 'UNKNOWN'
            }
          ]
        }
      ],
      results_with_alignment: 3,
      results_without_alignment: 1
    };
    service.contractId = 'A1676';

    const updatePromise = service.update();
    const req = httpMock.expectOne(alignmentUrl('A1676'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: payload, successfulRequest: true });
    await updatePromise;

    expect(service.list()).toEqual(payload);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should transition the loading signal false -> true -> false (KZ-015)', async () => {
    expect(service.loading()).toBe(false);

    service.contractId = 'A1676';
    const updatePromise = service.update();
    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne(alignmentUrl('A1676'));
    req.flush({ data: { sps: [], results_with_alignment: 0, results_without_alignment: 0 }, successfulRequest: true });
    await updatePromise;

    expect(service.loading()).toBe(false);
  });

  it('should set loadError and list null when an HTTP error resolves with successfulRequest: false (red input)', async () => {
    service.contractId = 'A1676';

    const updatePromise = service.update();
    const req = httpMock.expectOne(alignmentUrl('A1676'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await updatePromise;

    expect(service.loadError()).toBe(true);
    expect(service.list()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('should retry via update() after an error and recover to the data state', async () => {
    service.contractId = 'A1676';

    const firstPromise = service.update();
    const req1 = httpMock.expectOne(alignmentUrl('A1676'));
    req1.error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    await firstPromise;
    expect(service.loadError()).toBe(true);

    const payload: ContractSpAlignmentReport = {
      sps: [
        {
          sp_code: 'SP02',
          name: 'Science Program 2',
          category: null,
          icon_key: null,
          links: [
            {
              result_official_code: 'STAR-201',
              result_title: 'Result Title 201',
              role: 'PRIMARY'
            }
          ]
        }
      ],
      results_with_alignment: 1,
      results_without_alignment: 0
    };
    const secondPromise = service.update();
    const req2 = httpMock.expectOne(alignmentUrl('A1676'));
    req2.flush({ data: payload, successfulRequest: true });
    await secondPromise;

    expect(service.list()).toEqual(payload);
    expect(service.loadError()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('should standardize an empty envelope on null', async () => {
    service.contractId = 'A1676';

    const updatePromise = service.update();
    const req = httpMock.expectOne(alignmentUrl('A1676'));
    req.flush({});
    await updatePromise;

    expect(service.list()).toBeNull();
    expect(service.loadError()).toBe(false);
  });
});
