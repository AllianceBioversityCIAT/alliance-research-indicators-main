import { TestBed } from '@angular/core/testing';
import { PolicyAmountStatusService } from './policy-amount-status.service';

describe('PolicyAmountStatusService', () => {
  it('populates the status list on construction and ends not loading', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(PolicyAmountStatusService);
    await service.main();
    expect(service.list()).toEqual([
      { id: 'Confirmed', name: 'Confirmed' },
      { id: 'Estimated', name: 'Estimated' },
      { id: 'Unknown', name: 'Unknown' }
    ]);
    expect(service.loading()).toBe(false);
  });
});
