import { ComponentFixture, TestBed } from '@angular/core/testing';

import CacheTestComponent from './cache-test.component';

describe('CacheTestComponent', () => {
  let component: CacheTestComponent;
  let fixture: ComponentFixture<CacheTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CacheTestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CacheTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
