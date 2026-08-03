import { TestBed } from '@angular/core/testing';

import { GetProjectStatusService } from './get-project-status.service';

describe('GetProjectStatusService', () => {
  let service: GetProjectStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetProjectStatusService]
    });
    service = TestBed.inject(GetProjectStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize list with default statuses and set loading to false on construction', () => {
    const list = service.list();
    expect(list).toEqual([
      { name: 'Ongoing', value: 'ONGOING' },
      { name: 'Completed', value: 'COMPLETED' },
      { name: 'Suspended', value: 'SUSPENDED' }
    ]);
    expect(service.loading()).toBe(false);
  });

  it('should set loading to false when main is called', () => {
    service.loading.set(true);
    service.main();
    expect(service.loading()).toBe(false);
  });
});


