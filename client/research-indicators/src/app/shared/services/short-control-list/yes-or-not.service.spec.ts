import { TestBed } from '@angular/core/testing';

import { YesOrNotService } from './yes-or-not.service';

describe('YesOrNotService', () => {
  let service: YesOrNotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YesOrNotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with correct list values', () => {
    const list = service.list();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ name: 'Yes', value: 1 });
    expect(list[1]).toEqual({ name: 'No', value: 0 });
  });

  it('should initialize loading as false', () => {
    expect(service.loading()).toBeFalsy();
  });

  it('should update loading state', () => {
    service.loading.set(true);
    expect(service.loading()).toBeTruthy();
    
    service.loading.set(false);
    expect(service.loading()).toBeFalsy();
  });

  it('should maintain list immutability', () => {
    const originalList = service.list();
    const modifiedList = [...originalList];
    modifiedList[0] = { name: 'Maybe', value: 2 };
    
    expect(service.list()).toEqual(originalList);
    expect(service.list()).not.toEqual(modifiedList);
  });
});
