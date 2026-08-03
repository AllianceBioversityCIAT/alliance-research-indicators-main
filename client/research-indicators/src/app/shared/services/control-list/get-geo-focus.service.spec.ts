import { TestBed } from '@angular/core/testing';
import { GetGeoFocusService } from './get-geo-focus.service';
import { ApiService } from '../api.service';

describe('GetGeoFocusService', () => {
  let service: GetGeoFocusService;

  beforeEach(() => {
    const mainSpy = jest.spyOn(GetGeoFocusService.prototype, 'main');

    TestBed.configureTestingModule({
      providers: [
        GetGeoFocusService,
        { provide: ApiService, useValue: {} }
      ]
    });

    service = TestBed.inject(GetGeoFocusService);

    expect(mainSpy).toHaveBeenCalled();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize signals with expected values after constructor/main', () => {
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
    expect(service.list()).toEqual([
      { value: '1', label: 'Global' },
      { value: '2', label: 'Regional' },
      { value: '4', label: 'National' },
      { value: '5', label: 'Sub-national' },
      { value: '50', label: 'This is yet to be determined' }
    ]);
  });

  it('main should set list and loading correctly when invoked explicitly', async () => {
    // mutate signals to ensure main actually performs the set operations
    service.list.set([]);
    service.loading.set(true);

    await service.main();

    expect(service.loading()).toBe(false);
    expect(service.list()).toEqual([
      { value: '1', label: 'Global' },
      { value: '2', label: 'Regional' },
      { value: '4', label: 'National' },
      { value: '5', label: 'Sub-national' },
      { value: '50', label: 'This is yet to be determined' }
    ]);
    expect(service.list().length).toBe(5);
  });
});
