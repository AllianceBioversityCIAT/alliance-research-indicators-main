import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertTagComponent } from './alert-tag.component';

describe('AlertTagComponent', () => {
  let component: AlertTagComponent;
  let fixture: ComponentFixture<AlertTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertTagComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
