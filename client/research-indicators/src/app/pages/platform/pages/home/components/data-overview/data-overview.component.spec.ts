import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DataOverviewComponent } from './data-overview.component';
import { apiServiceMock, mockResultsStatus, mockIndicatorsResults, cacheServiceMock, httpClientMock } from 'src/app/testing/mock-services.mock';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { HttpClient } from '@angular/common/http';

describe('DataOverviewComponent', () => {
  let component: DataOverviewComponent;
  let fixture: ComponentFixture<DataOverviewComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = { ...apiServiceMock };
    mockApiService.GET_ResultsStatus = jest.fn().mockResolvedValue(mockResultsStatus);
    mockApiService.GET_IndicatorsResultsAmount = jest.fn().mockResolvedValue(mockIndicatorsResults);

    await TestBed.configureTestingModule({
      imports: [DataOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: mockApiService },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: HttpClient, useValue: httpClientMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DataOverviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.results).toBe(true);
    expect(component.showChart()).toBe(false);
    expect(component.showIndicatorList()).toBe(false);
    expect(component.indicatorList()).toEqual([]);
    expect(component.chartLegend()).toEqual([]);
  });

  it('should call getData and getIndicatorData on init', async () => {
    component.ngOnInit();
    expect(mockApiService.GET_ResultsStatus).toHaveBeenCalled();
    expect(mockApiService.GET_IndicatorsResultsAmount).toHaveBeenCalled();
  });

  it('should update showChart when results are available', async () => {
    await component.getData();
    expect(component.showChart()).toBe(true);
  });

  it('should update showIndicatorList when indicators have results', async () => {
    await component.getIndicatorData();
    expect(component.showIndicatorList()).toBe(true);
  });

  it('should not show chart when no results are available', async () => {
    mockApiService.GET_ResultsStatus = jest.fn().mockResolvedValue({
      data: [
        { name: 'Status 1', amount_results: 0, result_status_id: 1 },
        { name: 'Status 2', amount_results: 0, result_status_id: 2 }
      ]
    });

    await component.getData();
    expect(component.showChart()).toBe(false);
  });

  it('should not show indicator list when no indicators have results', async () => {
    mockApiService.GET_IndicatorsResultsAmount = jest.fn().mockResolvedValue({
      data: [
        {
          indicator_id: 1,
          name: 'Indicator 1',
          amount_results: 0,
          icon_src: 'science'
        }
      ]
    });

    await component.getIndicatorData();
    expect(component.showIndicatorList()).toBe(false);
  });

  it('should generate correct chart legend', async () => {
    await component.getData();

    const legend = component.chartLegend();
    expect(legend).toHaveLength(2);
    expect(legend[0]).toEqual({
      color: '#112F5C',
      label: 'Status 1',
      value: 5,
      result_status_id: 1
    });
  });

  it('should handle API errors gracefully', async () => {
    mockApiService.GET_ResultsStatus = jest.fn().mockRejectedValue(new Error('API Error'));
    mockApiService.GET_IndicatorsResultsAmount = jest.fn().mockRejectedValue(new Error('API Error'));

    await expect(component.getData()).rejects.toThrow('API Error');
    await expect(component.getIndicatorData()).rejects.toThrow('API Error');
  });

  it('should use fallback color when result_status.config.color.text is not available', async () => {
    mockApiService.GET_ResultsStatus = jest.fn().mockResolvedValue({
      data: [{ name: 'Status X', amount_results: 2, result_status_id: 999, result_status: null }]
    });
    await component.getData();
    expect(component.chartLegend()[0].color).toBe('#1689CA');
  });

  it('chartData treats non-array input as empty rows', () => {
    component.chartData(null as any);
    expect(component.chartLegend()).toEqual([]);
  });

  it('getData uses empty chart when API response has no data property', async () => {
    mockApiService.GET_ResultsStatus = jest.fn().mockResolvedValue({});
    await component.getData();
    expect(component.chartLegend()).toEqual([]);
    expect(component.showChart()).toBe(false);
  });

  it('getData uses empty array when response.data is null', async () => {
    mockApiService.GET_ResultsStatus = jest.fn().mockResolvedValue({ data: null });
    await component.getData();
    expect(component.chartLegend()).toEqual([]);
    expect(component.showChart()).toBe(false);
  });

  describe('statusBarsMax', () => {
    it('returns 0 when chartLegend is empty', () => {
      component.chartLegend.set([]);
      expect(component.statusBarsMax()).toBe(0);
    });

    it('returns the maximum value among legend items', () => {
      component.chartLegend.set([
        { color: '#000', label: 'A', value: 3, result_status_id: 1 },
        { color: '#000', label: 'B', value: 12, result_status_id: 2 }
      ]);
      expect(component.statusBarsMax()).toBe(12);
    });
  });

  describe('statusRowQueryParams (R-RCU-007 AC.1, AC.1b)', () => {
    it('resolves the canonical status slug from the frozen vocabulary and adds tab=my', () => {
      expect(
        component.statusRowQueryParams({
          color: '#173F6F',
          label: 'Submitted',
          value: 12,
          result_status_id: 7
        })
      ).toEqual({
        status: 'not-approved',
        tab: 'my'
      });
    });

    it('resolves a different status id to its own distinct slug (KZ-004 — not a shared default)', () => {
      expect(
        component.statusRowQueryParams({
          color: '#000',
          label: 'Editing',
          value: 3,
          result_status_id: 1
        })
      ).toEqual({
        status: 'editing',
        tab: 'my'
      });
    });

    it('emits no indicatorTab/statusTab/statusLabel keys (R-RCU-007 AC.3)', () => {
      const params = component.statusRowQueryParams({
        color: '#000',
        label: 'Submitted',
        value: 1,
        result_status_id: 2
      });
      expect(params).not.toHaveProperty('statusTab');
      expect(params).not.toHaveProperty('statusLabel');
    });

    it('degrades to an unfiltered tab=my link when the id has no slug (vocabulary drift)', () => {
      expect(
        component.statusRowQueryParams({
          color: '#000',
          label: 'Unknown',
          value: 1,
          result_status_id: 9999
        })
      ).toEqual({ tab: 'my' });
    });
  });

  describe('indicatorRowQueryParams (R-RCU-007 AC.1, AC.1b)', () => {
    it('resolves the canonical indicator slug from the frozen vocabulary and adds tab=my', () => {
      expect(
        component.indicatorRowQueryParams({
          indicator_id: 1,
          name: 'Capacity Sharing',
          indicator_type_id: 1,
          description: '',
          long_description: '',
          icon_src: 'science',
          other_names: null,
          amount_results: 2
        })
      ).toEqual({
        indicator: 'capacity-sharing-for-development',
        tab: 'my'
      });
    });

    it('resolves a different indicator id to its own distinct slug (KZ-004 — not a shared default)', () => {
      expect(
        component.indicatorRowQueryParams({
          indicator_id: 2,
          name: 'Innovation Development',
          indicator_type_id: 2,
          description: '',
          long_description: '',
          icon_src: 'analytics',
          other_names: null,
          amount_results: 0
        })
      ).toEqual({
        indicator: 'innovation-dev',
        tab: 'my'
      });
    });

    it('emits no indicatorTab key (R-RCU-007 AC.3)', () => {
      const params = component.indicatorRowQueryParams({
        indicator_id: 1,
        name: 'Capacity Sharing',
        indicator_type_id: 1,
        description: '',
        long_description: '',
        icon_src: 'science',
        other_names: null,
        amount_results: 2
      });
      expect(params).not.toHaveProperty('indicatorTab');
    });

    it('degrades to an unfiltered tab=my link when the id has no slug (vocabulary drift)', () => {
      expect(
        component.indicatorRowQueryParams({
          indicator_id: 9999,
          name: 'Unknown',
          indicator_type_id: 0,
          description: '',
          long_description: '',
          icon_src: '',
          other_names: null,
          amount_results: 0
        })
      ).toEqual({ tab: 'my' });
    });
  });

  describe('barFillPercent', () => {
    it('returns 0 when there is no positive max (empty legend)', () => {
      component.chartLegend.set([]);
      expect(component.statusBarsMax()).toBe(0);
      expect(component.barFillPercent(10)).toBe(0);
    });

    it('returns proportional width capped at 100', () => {
      component.chartLegend.set([{ color: '#000', label: 'A', value: 20, result_status_id: 1 }]);
      expect(component.barFillPercent(10)).toBe(50);
      expect(component.barFillPercent(20)).toBe(100);
    });

    it('caps at 100 when value would exceed the scale', () => {
      component.chartLegend.set([
        { color: '#000', label: 'A', value: 5, result_status_id: 1 },
        { color: '#000', label: 'B', value: 10, result_status_id: 2 }
      ]);
      expect(component.barFillPercent(25)).toBe(100);
    });
  });
});
