import { TestBed } from '@angular/core/testing';
import { ScalingService } from './scaling.service';

describe('ScalingService', () => {
  let service: ScalingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ScalingService]
    });
    service = TestBed.inject(ScalingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default scaling list', () => {
    const list = service.list();
    expect(list).toEqual([
      { name: '1', value: 1 },
      { name: '2', value: 2 },
      { name: '3', value: 3 },
      { name: '4', value: 4 },
      { name: '5', value: 5 }
    ]);
  });

  it('should initialize loading signal as false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should allow updating the list signal', () => {
    const newList = [{ name: 'Test', value: 10 }];
    service.list.set(newList);
    expect(service.list()).toEqual(newList);
  });

  it('should allow updating the loading signal', () => {
    service.loading.set(true);
    expect(service.loading()).toBe(true);

    service.loading.set(false);
    expect(service.loading()).toBe(false);
  });
});
