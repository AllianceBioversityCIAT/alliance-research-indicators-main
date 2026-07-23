import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultInformationModalComponent } from './result-information-modal.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { signal } from '@angular/core';

describe('ResultInformationModalComponent', () => {
  let component: ResultInformationModalComponent;
  let fixture: ComponentFixture<ResultInformationModalComponent>;
  let allModalsMock: { selectedResultForInfo: ReturnType<typeof signal>; closeModal: jest.Mock };
  let selectedResultSignal: ReturnType<typeof signal>;

  beforeEach(async () => {
    selectedResultSignal = signal(undefined);
    allModalsMock = {
      selectedResultForInfo: selectedResultSignal,
      closeModal: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ResultInformationModalComponent],
      providers: [{ provide: AllModalsService, useValue: allModalsMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultInformationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('close should call allModals.closeModal', () => {
    component.close();
    expect(allModalsMock.closeModal).toHaveBeenCalledWith('resultInformation');
  });

  describe('getPlatformColors', () => {
    it('should return undefined for unknown code', () => {
      expect(component.getPlatformColors('UNKNOWN' as any)).toBeUndefined();
    });
    it('should return the mapped colors for a known platform code', () => {
      expect(component.getPlatformColors('PRMS')).toEqual(PLATFORM_COLOR_MAP['PRMS']);
      expect(component.getPlatformColors('STAR')).toEqual(PLATFORM_COLOR_MAP['STAR']);
      expect(component.getPlatformColors('TIP')).toEqual(PLATFORM_COLOR_MAP['TIP']);
    });
  });

  describe('formatResultCode', () => {
    it('should return empty for null/undefined', () => {
      expect(component.formatResultCode(null)).toBe('');
      expect(component.formatResultCode(undefined)).toBe('');
    });
    it('should pad numbers/strings and return empty for empty string', () => {
      expect(component.formatResultCode('')).toBe('');
      expect(component.formatResultCode('7')).toBe('007');
      expect(component.formatResultCode(12)).toBe('012');
      expect(component.formatResultCode(123)).toBe('123');
    });
  });

  describe('getValue', () => {
    it('should return - when no result available', () => {
      selectedResultSignal.set(undefined);
      expect(component.getValue()).toBe('-');
    });

    it('should return - when no levers present or empty array', () => {
      const r: any = { result_levers: [] };
      expect(component.getValue(r)).toBe('-');
      expect(component.getValue({} as any)).toBe('-');
    });

    it('should return - when result_levers is not an array (defensive)', () => {
      const r: any = { result_levers: { bogus: true } };
      expect(component.getValue(r)).toBe('-');
    });

    it('should return - when no primary levers', () => {
      const r: any = { result_levers: [{ is_primary: 0 }, { is_primary: '0' }] };
      expect(component.getValue(r)).toBe('-');
    });

    it('should return the first primary lever short_name only', () => {
      const r: any = {
        result_levers: [
          { is_primary: 1, lever: { short_name: 'A' } },
          { is_primary: '1', lever: { short_name: '' } },
          { is_primary: 1, lever: { short_name: 'B' } },
        ],
      };
      expect(component.getValue(r)).toBe('A');
    });

    it('should return - when primary levers have undefined lever/short_name (nullish coalescing branch)', () => {
      const r: any = {
        result_levers: [
          { is_primary: 1, lever: undefined },
        ],
      };
      expect(component.getValue(r)).toBe('-');
    });

    it('should return empty string when primary lever has empty short_name', () => {
      const r: any = {
        result_levers: [
          { is_primary: 1, lever: { short_name: '' } },
          { is_primary: '1', lever: { short_name: '' } },
        ],
      };
      expect(component.getValue(r)).toBe('');
    });
  });

  describe('getPrimaryContract', () => {
    it('should return null when result is null', () => {
      selectedResultSignal.set(null);
      expect(component.getPrimaryContract()).toBeNull();
    });

    it('should return null when result_contracts is null', () => {
      selectedResultSignal.set({ result_contracts: null } as any);
      expect(component.getPrimaryContract()).toBeNull();
    });

    it('should return null when result_contracts is undefined', () => {
      selectedResultSignal.set({} as any);
      expect(component.getPrimaryContract()).toBeNull();
    });

    it('should return contract_id when primary contract exists in array', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 0, contract_id: 'A123' },
          { is_primary: 1, contract_id: 'B456' },
          { is_primary: 0, contract_id: 'C789' }
        ]
      } as any);
      expect(component.getPrimaryContract()).toBe('B456');
    });

    it('should return contract_id when primary contract exists as single object', () => {
      selectedResultSignal.set({
        result_contracts: { is_primary: 1, contract_id: 'D012' }
      } as any);
      expect(component.getPrimaryContract()).toBe('D012');
    });

    it('should return null when no primary contract exists', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 0, contract_id: 'A123' },
          { is_primary: '0', contract_id: 'B456' }
        ]
      } as any);
      expect(component.getPrimaryContract()).toBeNull();
    });

    it('should return null when primary contract has no contract_id', () => {
      selectedResultSignal.set({
        result_contracts: [{ is_primary: 1 }]
      } as any);
      expect(component.getPrimaryContract()).toBeNull();
    });

    it('should handle string is_primary value', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: '1', contract_id: 'E345' }
        ]
      } as any);
      expect(component.getPrimaryContract()).toBe('E345');
    });

    it('should return null when result_contracts is a single object without is_primary 1', () => {
      selectedResultSignal.set({
        result_contracts: { is_primary: 0, contract_id: 'F456' }
      } as any);
      expect(component.getPrimaryContract()).toBeNull();
    });

    it('should return null when result_contracts is a single object without is_primary property', () => {
      selectedResultSignal.set({
        result_contracts: { contract_id: 'G567' }
      } as any);
      expect(component.getPrimaryContract()).toBeNull();
    });
  });

  describe('getContributingContracts', () => {
    it('should return empty array when result is null', () => {
      selectedResultSignal.set(null);
      expect(component.getContributingContracts()).toEqual([]);
    });

    it('should return empty array when result_contracts is null', () => {
      selectedResultSignal.set({ result_contracts: null } as any);
      expect(component.getContributingContracts()).toEqual([]);
    });

    it('should return empty array when result_contracts is undefined', () => {
      selectedResultSignal.set({} as any);
      expect(component.getContributingContracts()).toEqual([]);
    });

    it('should return contributing contract_ids from array', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 1, contract_id: 'A123' },
          { is_primary: 0, contract_id: 'B456' },
          { is_primary: '0', contract_id: 'C789' },
          { is_primary: 0 }
        ]
      } as any);
      expect(component.getContributingContracts()).toEqual(['B456', 'C789']);
    });

    it('should return contributing contract_id from single object', () => {
      selectedResultSignal.set({
        result_contracts: { is_primary: 0, contract_id: 'D012' }
      } as any);
      expect(component.getContributingContracts()).toEqual(['D012']);
    });

    it('should return empty array when all contracts are primary', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 1, contract_id: 'A123' },
          { is_primary: '1', contract_id: 'B456' }
        ]
      } as any);
      expect(component.getContributingContracts()).toEqual([]);
    });

    it('should filter out contracts without contract_id', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 0, contract_id: 'B456' },
          { is_primary: 0 }
        ]
      } as any);
      expect(component.getContributingContracts()).toEqual(['B456']);
    });

    it('should return contributing contract_id when result_contracts is a single object with is_primary 0', () => {
      selectedResultSignal.set({
        result_contracts: { is_primary: 0, contract_id: 'H678' }
      } as any);
      expect(component.getContributingContracts()).toEqual(['H678']);
    });

    it('should return empty array when result_contracts is a single object with is_primary 1', () => {
      selectedResultSignal.set({
        result_contracts: { is_primary: 1, contract_id: 'I789' }
      } as any);
      expect(component.getContributingContracts()).toEqual([]);
    });
  });

  describe('getContributingProjects', () => {
    it('should return only snapshot_years when no contributing contracts', () => {
      selectedResultSignal.set({
        result_contracts: [{ is_primary: 1, contract_id: 'A123' }],
        snapshot_years: [2021, 2022]
      } as any);
      expect(component.getContributingProjects()).toEqual([2021, 2022]);
    });

    it('should return contributing contracts and snapshot_years', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 1, contract_id: 'A123' },
          { is_primary: 0, contract_id: 'B456' }
        ],
        snapshot_years: [2021, 2022]
      } as any);
      expect(component.getContributingProjects()).toEqual(['B456', 2021, 2022]);
    });

    it('should return only contributing contracts when no snapshot_years', () => {
      selectedResultSignal.set({
        result_contracts: [
          { is_primary: 0, contract_id: 'B456' },
          { is_primary: 0, contract_id: 'C789' }
        ],
        snapshot_years: []
      } as any);
      expect(component.getContributingProjects()).toEqual(['B456', 'C789']);
    });

    it('should return empty array when no contributing contracts and no snapshot_years', () => {
      selectedResultSignal.set({
        result_contracts: [{ is_primary: 1, contract_id: 'A123' }],
        snapshot_years: []
      } as any);
      expect(component.getContributingProjects()).toEqual([]);
    });

    it('should handle undefined snapshot_years', () => {
      selectedResultSignal.set({
        result_contracts: [{ is_primary: 0, contract_id: 'B456' }]
      } as any);
      expect(component.getContributingProjects()).toEqual(['B456']);
    });
  });

  describe('openExternalLink', () => {
    it('should not open link when result is null', () => {
      selectedResultSignal.set(null);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should not open link when external_link is null', () => {
      selectedResultSignal.set({ external_link: null } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should not open link when external_link is undefined', () => {
      selectedResultSignal.set({} as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should not open link when external_link is empty string', () => {
      selectedResultSignal.set({ external_link: '' } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should open link for TIP platform', () => {
      selectedResultSignal.set({
        platform_code: 'TIP',
        external_link: 'https://tip.com'
      } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).toHaveBeenCalledWith('https://tip.com', '_blank', 'noopener');
      openSpy.mockRestore();
    });

    it('should open link for AICCRA platform', () => {
      selectedResultSignal.set({
        platform_code: 'AICCRA',
        external_link: 'https://aiccra.com'
      } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).toHaveBeenCalledWith('https://aiccra.com', '_blank', 'noopener');
      openSpy.mockRestore();
    });

    it('should open link for PRMS platform', () => {
      selectedResultSignal.set({
        platform_code: 'PRMS',
        external_link: 'https://prms.com'
      } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).toHaveBeenCalledWith('https://prms.com', '_blank', 'noopener');
      openSpy.mockRestore();
    });

    it('should not open link for unsupported platform', () => {
      selectedResultSignal.set({
        platform_code: 'OTHER',
        external_link: 'https://other.com'
      } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  describe('openDocumentLink', () => {
    it('should do nothing when result is null', () => {
      selectedResultSignal.set(null);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openDocumentLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should do nothing when public_link is missing', () => {
      selectedResultSignal.set({ platform_code: 'AICCRA', public_link: null } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openDocumentLink();
      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('should open public_link for AICCRA platform', () => {
      selectedResultSignal.set({
        platform_code: 'AICCRA',
        public_link: 'https://doc.aiccra.org/view/123'
      } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openDocumentLink();
      expect(openSpy).toHaveBeenCalledWith('https://doc.aiccra.org/view/123', '_blank', 'noopener');
      openSpy.mockRestore();
    });

    it('should open public_link for PRMS platform', () => {
      selectedResultSignal.set({
        platform_code: 'PRMS',
        public_link: 'https://doc.example.com'
      } as any);
      fixture.detectChanges();
      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openDocumentLink();
      expect(openSpy).toHaveBeenCalledWith('https://doc.example.com', '_blank', 'noopener');
      openSpy.mockRestore();
    });
  });
});


