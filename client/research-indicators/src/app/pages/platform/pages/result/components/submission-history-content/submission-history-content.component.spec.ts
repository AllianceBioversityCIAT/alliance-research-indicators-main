import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmissionHistoryContentComponent } from './submission-history-content.component';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@services/cache/cache.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToPromiseService } from '@shared/services/to-promise.service';
import { SubmissionHistoryItem } from '@shared/interfaces/submission-history-item.interface';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SubmissionHistoryContentComponent', () => {
  let component: SubmissionHistoryContentComponent;
  let fixture: ComponentFixture<SubmissionHistoryContentComponent>;
  let apiServiceMock: Partial<ApiService>;
  let cacheServiceMock: Partial<CacheService>;

  const mockHistoryItem: SubmissionHistoryItem = {
    created_by_object: {
      first_name: 'Test',
      last_name: 'User'
    },
    updated_at: '2023-10-10',
    from_status_id: 1,
    to_status_id: 2,
    submission_comment: ''
  };

  beforeEach(async () => {
    apiServiceMock = {
      GET_SubmitionHistory: jest.fn().mockResolvedValue({ data: [mockHistoryItem] })
    };

    cacheServiceMock = {
      currentResultId: signal(123),
      getCurrentNumericResultId: jest.fn(() => 123)
    };

    await TestBed.configureTestingModule({
      imports: [SubmissionHistoryContentComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        ToPromiseService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ version: '1.0' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionHistoryContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load submission history on init', async () => {
    // Arrange already done in beforeEach

    // Act - ngOnInit is called in beforeEach
    await fixture.whenStable();

    // Assert
    expect(apiServiceMock.GET_SubmitionHistory).toHaveBeenCalledWith(123);
    expect(component.historyList()).toEqual([mockHistoryItem]);
  });

  it('should set historyList to empty array when response.data is falsy', async () => {
    (apiServiceMock.GET_SubmitionHistory as jest.Mock).mockResolvedValueOnce({ data: null });
    component.getSubmitionHistory();
    await fixture.whenStable();
    expect(component.historyList()).toEqual([]);
  });
});
