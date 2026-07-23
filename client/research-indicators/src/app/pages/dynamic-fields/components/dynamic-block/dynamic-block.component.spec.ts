import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicBlockComponent } from './dynamic-block.component';

describe('DynamicBlockComponent', () => {
  let component: DynamicBlockComponent;
  let fixture: ComponentFixture<DynamicBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicBlockComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DynamicBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
