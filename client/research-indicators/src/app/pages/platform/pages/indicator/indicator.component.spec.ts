import { ComponentFixture, TestBed } from '@angular/core/testing';
import IndicatorComponent from './indicator.component';
import { ApiService } from '@services/api.service';
import { CacheService } from '@services/cache/cache.service';
import { ActivatedRoute } from '@angular/router';

describe('IndicatorComponent', () => {
  let component: IndicatorComponent;
  let fixture: ComponentFixture<IndicatorComponent>;
  let apiService: any;
  let cacheService: any;

  beforeEach(async () => {
    apiService = {
      GET_IndicatorById: jest.fn(),
      GET_IndicatorTypes: jest.fn().mockResolvedValue({ data: [] })
    };
    cacheService = { setCurrentSectionHeaderName: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [IndicatorComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: CacheService, useValue: cacheService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    apiService.GET_IndicatorById.mockResolvedValue({ data: undefined });
    await fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set currentIndicator and header name if data and name exist', async () => {
    apiService.GET_IndicatorById.mockResolvedValue({ data: { name: 'Test', long_description: 'desc' } });
    await component.getIndicatorById(1);
    expect(component.currentIndicator()?.name).toBe('Test');
    expect(cacheService.setCurrentSectionHeaderName).toHaveBeenCalledWith('Test');
  });

  it('should set header name to empty string if name is undefined', async () => {
    apiService.GET_IndicatorById.mockResolvedValue({ data: { long_description: 'desc' } });
    await component.getIndicatorById(1);
    expect(cacheService.setCurrentSectionHeaderName).toHaveBeenCalledWith('');
  });

  it('should handle undefined data from API', async () => {
    apiService.GET_IndicatorById.mockResolvedValue({ data: undefined });
    await component.getIndicatorById(1);
    expect(component.currentIndicator()).toBeUndefined();
    expect(cacheService.setCurrentSectionHeaderName).toHaveBeenCalledWith('');
  });
});
