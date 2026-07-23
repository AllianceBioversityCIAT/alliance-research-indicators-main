import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MyLatestResultsComponent } from './my-latest-results.component';
import { ApiService } from '@shared/services/api.service';
import { mockLatestResults, mockGreenChecks, apiServiceMock, routerMock } from '../../../../../../testing/mock-services.mock';
import { GreenChecks } from '@shared/interfaces/get-green-checks.interface';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { STATUS_COLOR_MAP } from '@shared/constants/status-colors';
import { CacheService } from '@shared/services/cache/cache.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { Router } from '@angular/router';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import {
  RESULT_ENTRY_SOURCE_QUERY,
  RESULT_ENTRY_SOURCE_VALUE_HOME
} from '@shared/constants/result-entry-source';

const MOCK_USER_ID = 46;

function latestMockItemToResult(
  item: (typeof mockLatestResults.data)[0],
  overrides: Partial<Result> = {}
): Result {
  return {
    is_active: item.is_active,
    result_id: item.result_id,
    result_platform: item.platform_code,
    result_official_code: String(item.result_official_code),
    version_id: null,
    title: item.title,
    platform_code: item.platform_code,
    description: item.description ?? null,
    indicator_id: item.indicator_id,
    geo_scope_id: null,
    indicators: item.indicator
      ? { name: item.indicator.name, icon_src: item.indicator.icon_src }
      : undefined,
    result_status: item.result_status as Result['result_status'],
    result_contracts: item.result_contracts
      ? { contract_id: item.result_contracts.contract_id, is_primary: 1 }
      : undefined,
    ...overrides
  } as Result;
}

describe('MyLatestResultsComponent', () => {
  let component: MyLatestResultsComponent;
  let fixture: ComponentFixture<MyLatestResultsComponent>;

  const cacheData = signal<{ user?: { sec_user_id?: number } }>({ user: { sec_user_id: MOCK_USER_ID } });
  const cacheMock = { dataCache: cacheData } as Pick<CacheService, 'dataCache'>;

  const allModalsServiceMock = {
    openModal: jest.fn(),
    closeModal: jest.fn(),
    isModalOpen: jest.fn().mockReturnValue({ isOpen: false }),
    setResultInformationEntryContext: jest.fn(),
    selectedResultForInfo: signal<Result | null>(null)
  };

  const dateFormatConfigMock = {
    config: signal({ format: 'dd/MM/yyyy' })
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    cacheData.set({ user: { sec_user_id: MOCK_USER_ID } });
    await TestBed.configureTestingModule({
      imports: [MyLatestResultsComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AllModalsService, useValue: allModalsServiceMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: Router, useValue: routerMock },
        { provide: DateFormatConfigService, useValue: dateFormatConfigMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyLatestResultsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty signals', () => {
    expect(component.latestResultList()).toEqual([]);
    expect(component.greenChecksByResult()).toEqual({});
  });

  describe('getStatusProgressColor', () => {
    it('should use config text color when present', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], {
        result_status: {
          ...mockLatestResults.data[0].result_status,
          config: { color: { text: '  #abc  ', border: '#000', background: null } }
        } as Result['result_status']
      });
      expect(component.getStatusProgressColor(result)).toBe('#abc');
    });

    it('should fall back to STATUS_COLOR_MAP when config text is missing', () => {
      const rs = { ...mockLatestResults.data[0].result_status } as Result['result_status'];
      delete (rs as { config?: unknown }).config;
      const result = latestMockItemToResult(mockLatestResults.data[0], { result_status: rs });
      expect(component.getStatusProgressColor(result)).toBe(STATUS_COLOR_MAP['1'].text);
    });

    it('should fall back to default STATUS_COLOR_MAP when status id is unknown', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], {
        result_status: {
          ...mockLatestResults.data[0].result_status,
          result_status_id: 999
        } as Result['result_status']
      });
      delete (result.result_status as { config?: unknown }).config;
      expect(component.getStatusProgressColor(result)).toBe(STATUS_COLOR_MAP[''].text);
    });

    it('should use default STATUS_COLOR_MAP when result_status is missing', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { result_status: undefined });
      expect(component.getStatusProgressColor(result)).toBe(STATUS_COLOR_MAP[''].text);
    });
  });

  describe('calculateProgressFor', () => {
    it('should return 0 when no green checks are available', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { platform_code: 'STAR' });
      expect(component.calculateProgressFor(result)).toBe(0);
    });

    it('should calculate progress correctly for indicator type 4', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { indicator_id: 4, platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {
          general_information: 1,
          alignment: 1,
          policy_change: 1,
          partners: 1,
          geo_location: 1,
          evidences: 1
        }
      });

      expect(component.calculateProgressFor(result)).toBe(86);
    });

    it('should return 0 when total steps is 0', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {} as GreenChecks
      });
      expect(component.calculateProgressFor(result)).toBe(0);
    });

    it('should handle undefined green checks', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {} as GreenChecks
      });
      expect(component.calculateProgressFor(result)).toBe(0);
    });

    it('should return 0 if steps are empty', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { indicator_id: 999, platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      jest.spyOn(component as any, 'getSteps').mockReturnValue([]);
      component.greenChecksByResult.set({
        [resultCode]: {} as GreenChecks
      });
      expect(component.calculateProgressFor(result)).toBe(0);
    });

    it('should calculate progress correctly for indicator type 1 (cap_sharing, cap_sharing_ip)', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { indicator_id: 1, platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {
          general_information: 1,
          alignment: 1,
          cap_sharing_ip: 1,
          partners: 1,
          geo_location: 1,
          evidences: 1
        }
      });
      expect(component.calculateProgressFor(result)).toBe(75);
    });

    it('should calculate progress correctly for indicator type different from 1 and 4', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { indicator_id: 2, platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {
          general_information: 1,
          alignment: 1,
          innovation_dev: 1,
          partners: 1,
          geo_location: 1,
          evidences: 1
        }
      });
      expect(component.calculateProgressFor(result)).toBe(86);
    });

    it('should calculate progress for indicator type 5 (link_result, oicr) covering getSteps branches', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { indicator_id: 5, platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {
          general_information: 1,
          alignment: 1,
          link_result: 1,
          oicr: 1,
          partners: 1,
          geo_location: 1,
          evidences: 1
        }
      });
      expect(component.calculateProgressFor(result)).toBe(88);
    });

    it('should return 0 if result is undefined', () => {
      expect(component.calculateProgressFor(undefined as any)).toBe(0);
    });

    it('should return 100 when completness is 1', () => {
      const result = latestMockItemToResult(mockLatestResults.data[0], { indicator_id: 2, platform_code: 'STAR' });
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      component.greenChecksByResult.set({
        [resultCode]: {
          general_information: 0,
          alignment: 0,
          partners: 0,
          geo_location: 0,
          evidences: 0,
          completness: 1
        }
      });
      expect(component.calculateProgressFor(result)).toBe(100);
    });
  });

  describe('getSteps', () => {
    it('should include cap_sharing and cap_sharing_ip for indicator 1', () => {
      const steps = (component as any).getSteps(1);
      expect(steps).toContain('cap_sharing');
      expect(steps).toContain('cap_sharing_ip');
      expect(steps).toContain('ip_rights');
    });

    it('should include policy_change for indicator 4', () => {
      const steps = (component as any).getSteps(4);
      expect(steps).toContain('policy_change');
    });

    it('should include link_result and oicr for indicator 5', () => {
      const steps = (component as any).getSteps(5);
      expect(steps).toContain('link_result');
      expect(steps).toContain('oicr');
    });

    it('should include innovation_dev and ip_rights for indicator 2', () => {
      const steps = (component as any).getSteps(2);
      expect(steps).toContain('innovation_dev');
      expect(steps).toContain('ip_rights');
    });

    it('should not include ip_rights for indicator 3', () => {
      const steps = (component as any).getSteps(3);
      expect(steps).not.toContain('ip_rights');
      expect(steps[steps.length - 1]).toEqual([]);
    });
  });

  describe('ngOnInit', () => {
    it('should call loadLatestResultsWithGreenChecks', async () => {
      const loadLatestResultsSpy = jest.spyOn(component, 'loadLatestResultsWithGreenChecks');

      component.ngOnInit();

      expect(loadLatestResultsSpy).toHaveBeenCalled();
    });
  });

  describe('loadLatestResultsWithGreenChecks', () => {
    it('should load v2 results and green checks', async () => {
      const r1 = latestMockItemToResult(
        { ...mockLatestResults.data[0], result_official_code: 101, platform_code: 'STAR' },
        {}
      );
      const mockGreenChecksResponse = {
        ...mockGreenChecks,
        data: {
          general_information: 1,
          alignment: 1,
          cap_sharing_ip: 1,
          policy_change: 0,
          partners: 1,
          geo_location: 1,
          evidences: 0
        }
      };

      apiServiceMock.GET_Results.mockResolvedValueOnce({
        successfulRequest: true,
        data: { results: [r1], total: 1 }
      } as any);
      apiServiceMock.GET_GreenChecks.mockResolvedValueOnce(mockGreenChecksResponse as any);

      await component.loadLatestResultsWithGreenChecks();

      expect(apiServiceMock.GET_Results).toHaveBeenCalledWith(
        {
          'indicator-codes': [],
          'lever-codes': [],
          'create-user-codes': [String(MOCK_USER_ID)]
        },
        undefined,
        { page: 1, limit: 3, sortOrder: 'DESC', sortField: 'last-updated' }
      );
      expect(apiServiceMock.GET_GreenChecks).toHaveBeenCalledWith(101, 'STAR');
      expect(component.latestResultList()).toEqual([r1]);
      expect(component.greenChecksByResult()['STAR-101']).toEqual(mockGreenChecksResponse.data);
    });

    it('should handle multiple results', async () => {
      const r1 = latestMockItemToResult(
        { ...mockLatestResults.data[0], result_official_code: 101, platform_code: 'STAR' },
        {}
      );
      const r2 = latestMockItemToResult(
        { ...mockLatestResults.data[1], result_official_code: 102, platform_code: 'STAR' },
        {}
      );

      const mockGreenChecks1 = {
        ...mockGreenChecks,
        data: {
          general_information: 1,
          alignment: 1,
          cap_sharing_ip: 1,
          policy_change: 0,
          partners: 1,
          geo_location: 1,
          evidences: 0
        }
      };

      const mockGreenChecks2 = {
        ...mockGreenChecks,
        data: {
          general_information: 0,
          alignment: 1,
          cap_sharing_ip: 0,
          policy_change: 1,
          partners: 0,
          geo_location: 1,
          evidences: 1
        }
      };

      apiServiceMock.GET_Results.mockResolvedValueOnce({
        successfulRequest: true,
        data: { results: [r1, r2], total: 2 }
      } as any);
      apiServiceMock.GET_GreenChecks.mockResolvedValueOnce(mockGreenChecks1).mockResolvedValueOnce(mockGreenChecks2);

      await component.loadLatestResultsWithGreenChecks();

      expect(apiServiceMock.GET_Results).toHaveBeenCalled();
      expect(apiServiceMock.GET_GreenChecks).toHaveBeenCalledTimes(2);
      expect(apiServiceMock.GET_GreenChecks).toHaveBeenNthCalledWith(1, 101, 'STAR');
      expect(apiServiceMock.GET_GreenChecks).toHaveBeenNthCalledWith(2, 102, 'STAR');
      expect(component.latestResultList()).toEqual([r1, r2]);
      expect(component.greenChecksByResult()['STAR-101']).toEqual(mockGreenChecks1.data);
      expect(component.greenChecksByResult()['STAR-102']).toEqual(mockGreenChecks2.data);
    });

    it('should handle empty results', async () => {
      apiServiceMock.GET_Results.mockResolvedValueOnce({
        successfulRequest: true,
        data: { results: [], total: 0 }
      } as any);

      await component.loadLatestResultsWithGreenChecks();

      expect(apiServiceMock.GET_Results).toHaveBeenCalled();
      expect(apiServiceMock.GET_GreenChecks).not.toHaveBeenCalled();
      expect(component.latestResultList()).toEqual([]);
      expect(component.greenChecksByResult()).toEqual({});
    });

    it('should skip fetch when sec_user_id is missing', async () => {
      cacheData.set({ user: {} });
      await component.loadLatestResultsWithGreenChecks();
      expect(apiServiceMock.GET_Results).not.toHaveBeenCalled();
      expect(component.latestResultList()).toEqual([]);
      expect(component.greenChecksByResult()).toEqual({});
    });

    it('should use empty results when API response has no data', async () => {
      apiServiceMock.GET_Results.mockResolvedValueOnce({ successfulRequest: true } as any);
      await component.loadLatestResultsWithGreenChecks();
      expect(component.latestResultList()).toEqual([]);
      expect(apiServiceMock.GET_GreenChecks).not.toHaveBeenCalled();
    });

    it('should use empty results when data has no results array', async () => {
      apiServiceMock.GET_Results.mockResolvedValueOnce({ successfulRequest: true, data: { total: 0 } } as any);
      await component.loadLatestResultsWithGreenChecks();
      expect(component.latestResultList()).toEqual([]);
      expect(apiServiceMock.GET_GreenChecks).not.toHaveBeenCalled();
    });

    it('should skip green checks for rows whose official code does not parse to a finite number', async () => {
      const rBad = latestMockItemToResult(mockLatestResults.data[0], {
        result_official_code: 'not-a-number',
        platform_code: 'STAR'
      });
      const rGood = latestMockItemToResult(
        { ...mockLatestResults.data[1], result_official_code: 102, platform_code: 'STAR' },
        {}
      );
      apiServiceMock.GET_Results.mockResolvedValueOnce({
        successfulRequest: true,
        data: { results: [rBad, rGood], total: 2 }
      } as any);
      apiServiceMock.GET_GreenChecks.mockResolvedValueOnce({ ...mockGreenChecks, data: { general_information: 1 } } as any);

      await component.loadLatestResultsWithGreenChecks();

      expect(apiServiceMock.GET_GreenChecks).toHaveBeenCalledTimes(1);
      expect(apiServiceMock.GET_GreenChecks).toHaveBeenCalledWith(102, 'STAR');
      expect(component.greenChecksByResult()['STAR-102']).toEqual({ general_information: 1 });
      expect(component.greenChecksByResult()['STAR-not-a-number']).toBeUndefined();
    });
  });

  describe('lastUpdatedAt', () => {
    it('should prefer updated_at over created_at', () => {
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        updated_at: '2025-01-02',
        created_at: '2025-01-01'
      });
      expect(component.lastUpdatedAt(r)).toBe('2025-01-02');
    });

    it('should fall back to created_at when updated_at is empty', () => {
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        updated_at: '   ',
        created_at: '2025-01-01'
      });
      expect(component.lastUpdatedAt(r)).toBe('2025-01-01');
    });

    it('should return undefined when both dates are missing or blank', () => {
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        updated_at: undefined,
        created_at: undefined
      });
      expect(component.lastUpdatedAt(r)).toBeUndefined();
    });
  });

  describe('onResultCardClick and navigation', () => {
    beforeEach(() => {
      (routerMock.navigate as jest.Mock).mockClear();
      (allModalsServiceMock.openModal as jest.Mock).mockClear();
      (allModalsServiceMock.closeModal as jest.Mock).mockClear();
      (allModalsServiceMock.setResultInformationEntryContext as jest.Mock).mockClear();
      allModalsServiceMock.isModalOpen.mockReturnValue({ isOpen: false });
    });

    it('should open result information modal for PRMS and call preventDefault', () => {
      const ev = new Event('click', { cancelable: true });
      jest.spyOn(ev, 'preventDefault');
      const r = latestMockItemToResult(mockLatestResults.data[0], { platform_code: PLATFORM_CODES.PRMS });
      component.onResultCardClick(r, ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
      expect(allModalsServiceMock.setResultInformationEntryContext).toHaveBeenCalledWith(null);
      expect(allModalsServiceMock.selectedResultForInfo()).toBe(r);
    });

    it('should open result information modal for TIP', () => {
      const ev = new Event('click', { cancelable: true });
      const r = latestMockItemToResult(mockLatestResults.data[0], { platform_code: PLATFORM_CODES.TIP });
      component.onResultCardClick(r, ev);
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
    });

    it('should open result information modal for AICCRA', () => {
      const ev = new Event('click', { cancelable: true });
      const r = latestMockItemToResult(mockLatestResults.data[0], { platform_code: PLATFORM_CODES.AICCRA });
      component.onResultCardClick(r, ev);
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
    });

    it('should build STAR router link and from=home query params', () => {
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        platform_code: PLATFORM_CODES.STAR,
        result_official_code: '101',
        snapshot_years: []
      });
      expect(component.getStarResultRouterLink(r)).toEqual(['/result', 'STAR-101']);
      expect(component.getStarResultQueryParams(r)).toEqual({
        [RESULT_ENTRY_SOURCE_QUERY]: RESULT_ENTRY_SOURCE_VALUE_HOME
      });
    });

    it('should build general-information link with version when status is 6 and snapshot years exist', () => {
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        platform_code: PLATFORM_CODES.STAR,
        result_official_code: '101',
        result_status: { ...mockLatestResults.data[0].result_status, result_status_id: 6 } as Result['result_status'],
        snapshot_years: [2024, 2025]
      });
      expect(component.getStarResultRouterLink(r)).toEqual(['/result', 'STAR-101', 'general-information']);
      expect(component.getStarResultQueryParams(r)).toEqual({
        version: 2025,
        [RESULT_ENTRY_SOURCE_QUERY]: RESULT_ENTRY_SOURCE_VALUE_HOME
      });
    });

    it('should not activate when click target is inside more-vert menu', () => {
      const more = document.createElement('div');
      more.className = 'more-vert';
      const inner = document.createElement('span');
      more.appendChild(inner);
      document.body.appendChild(more);
      const ev = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(ev, 'target', { value: inner, enumerable: true });

      const r = latestMockItemToResult(mockLatestResults.data[0], { platform_code: PLATFORM_CODES.STAR });
      component.onResultCardClick(r, ev);

      more.remove();
      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
    });

    it('should close result information modal when open before navigating to STAR', () => {
      allModalsServiceMock.isModalOpen.mockReturnValue({ isOpen: true });
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        platform_code: PLATFORM_CODES.STAR,
        result_official_code: '102'
      });
      component.onResultCardClick(r, new Event('click'));
      expect(allModalsServiceMock.closeModal).toHaveBeenCalledWith('resultInformation');
      expect(allModalsServiceMock.selectedResultForInfo()).toBeNull();
    });

    it('should clear modal context when information modal was not open before STAR navigation', () => {
      allModalsServiceMock.isModalOpen.mockReturnValue({ isOpen: false });
      const r = latestMockItemToResult(mockLatestResults.data[0], {
        platform_code: PLATFORM_CODES.STAR,
        result_official_code: '103'
      });
      component.onResultCardClick(r, new Event('click'));
      expect(allModalsServiceMock.setResultInformationEntryContext).toHaveBeenCalledWith(null);
      expect(allModalsServiceMock.selectedResultForInfo()).toBeNull();
    });
  });

  describe('isInteractionOnMoreMenu (private)', () => {
    it('should return false when event target is not a Node', () => {
      const ev = { target: {} } as unknown as Event;
      expect((component as any).isInteractionOnMoreMenu(ev)).toBe(false);
    });

    it('should return false for text node target outside more-vert', () => {
      const el = document.createElement('div');
      const text = document.createTextNode('label');
      el.appendChild(text);
      const ev = { target: text } as unknown as Event;
      expect((component as any).isInteractionOnMoreMenu(ev)).toBe(false);
    });
  });

  describe('truncateTitle', () => {
    it('should return empty string for null title', () => {
      expect(component.truncateTitle(null)).toBe('');
    });

    it('should return empty string for undefined title', () => {
      expect(component.truncateTitle(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(component.truncateTitle('')).toBe('');
    });

    it('should return empty string for whitespace-only string', () => {
      expect(component.truncateTitle('   ')).toBe('');
    });

    it('should return original text if 30 words or less', () => {
      const shortTitle = 'This is a short title with less than thirty words';
      expect(component.truncateTitle(shortTitle)).toBe(shortTitle);
    });

    it('should return original text if exactly 30 words', () => {
      const words = Array(30).fill('word');
      const title = words.join(' ');
      expect(component.truncateTitle(title)).toBe(title);
    });

    it('should truncate text if more than 30 words', () => {
      const words = Array(35).fill('word');
      const title = words.join(' ');
      const expected = words.slice(0, 30).join(' ') + '...';
      expect(component.truncateTitle(title)).toBe(expected);
    });

    it('should handle multiple spaces between words', () => {
      const title = 'word1    word2   word3';
      expect(component.truncateTitle(title)).toBe('word1    word2   word3');
    });

    it('should handle leading and trailing whitespace', () => {
      const title = '   This is a title   ';
      expect(component.truncateTitle(title)).toBe('This is a title');
    });

    it('should handle very long single word', () => {
      const longWord = 'a'.repeat(1000);
      expect(component.truncateTitle(longWord)).toBe(longWord);
    });

    it('should handle mixed whitespace characters', () => {
      const title = 'word1\tword2\nword3\rword4';
      expect(component.truncateTitle(title)).toBe('word1\tword2\nword3\rword4');
    });
  });
});
