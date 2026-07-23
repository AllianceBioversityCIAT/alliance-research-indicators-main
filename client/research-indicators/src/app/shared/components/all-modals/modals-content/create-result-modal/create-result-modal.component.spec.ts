import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateResultModalComponent } from './create-result-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CreateResultModalComponent', () => {
  let component: CreateResultModalComponent;
  let fixture: ComponentFixture<CreateResultModalComponent>;

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe() {
        // intentionally left blank for testing
      }
      unobserve() {
        // intentionally left blank for testing
      }
      disconnect() {
        // intentionally left blank for testing
      }
    };

    await TestBed.configureTestingModule({
      imports: [CreateResultModalComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateResultModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
