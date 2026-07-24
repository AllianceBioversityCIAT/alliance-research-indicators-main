import { TestBed } from '@angular/core/testing';

import { DynamicComponentSelectorService } from './dynamic-component-selector.service';

describe('DynamicComponentSelectorService', () => {
  let service: DynamicComponentSelectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamicComponentSelectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
