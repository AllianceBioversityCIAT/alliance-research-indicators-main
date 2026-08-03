import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsDropdownComponent } from './notifications-dropdown.component';

describe('NotificationsDropdownComponent', () => {
  let component: NotificationsDropdownComponent;
  let fixture: ComponentFixture<NotificationsDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
