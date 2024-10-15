import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsTableComponent } from './results-table.component';
import { ApiService } from '../../services/api.service';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ResultsTableComponent', () => {
  let component: ResultsTableComponent;
  let fixture: ComponentFixture<ResultsTableComponent>;
  let apiServiceMock: Partial<ApiService>;

  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(async () => {
    apiServiceMock = {
      GET_results: jest.fn().mockReturnValue(of([])) // Mock the GET_results method
    };

    await TestBed.configureTestingModule({
      imports: [ResultsTableComponent],
      providers: [{ provide: ApiService, useValue: apiServiceMock }, provideHttpClient(withInterceptorsFromDi())]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
