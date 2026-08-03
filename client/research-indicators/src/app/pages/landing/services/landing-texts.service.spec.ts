import { TestBed } from '@angular/core/testing';

import { LandingTextsService } from './landing-texts.service';

describe('LandingTextsService', () => {
  let service: LandingTextsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LandingTextsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
