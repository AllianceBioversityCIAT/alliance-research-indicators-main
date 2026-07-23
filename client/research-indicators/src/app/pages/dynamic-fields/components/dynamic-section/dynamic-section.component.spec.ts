import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicSectionComponent } from './dynamic-section.component';

describe('DynamicSectionComponent', () => {
  let component: DynamicSectionComponent;
  let fixture: ComponentFixture<DynamicSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicSectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DynamicSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
