import { TestBed } from '@angular/core/testing';

import { CapacitySharingService } from './capacity-sharing.service';

describe('CapacitySharingService', () => {
  let service: CapacitySharingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CapacitySharingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
