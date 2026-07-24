import { SharedResultFormComponent } from './shared-result-form.component';
import { ChangeDetectorRef, ElementRef } from '@angular/core';

describe('SharedResultFormComponent', () => {
  let component: SharedResultFormComponent;
  let mockChangeDetectorRef: jest.Mocked<ChangeDetectorRef>;

  beforeEach(() => {
    mockChangeDetectorRef = {
      detectChanges: jest.fn(),
      checkNoChanges: jest.fn(),
      detach: jest.fn(),
      reattach: jest.fn(),
      markForCheck: jest.fn()
    } as any;

    component = new SharedResultFormComponent(mockChangeDetectorRef);

    // Mock global observers
    (globalThis as any).ResizeObserver = class {
      constructor(callback: (entries: any[]) => void) {
        (globalThis as any).resizeCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    (globalThis as any).MutationObserver = class {
      constructor(callback: (mutations: any[]) => void) {
        (globalThis as any).mutationCallback = callback;
      }
      observe() {}
      disconnect() {}
    };

    // Mock DOM methods
    document.querySelector = jest.fn();
    document.querySelectorAll = jest.fn();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit validityChanged on ngOnChanges', () => {
    const spy = jest.spyOn(component.validityChanged, 'emit');
    component.contractId = null;
    component.ngOnChanges();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('should emit contractIdChange and validityChanged when contract is changed', () => {
    const contractId = 123;
    const emitSpy = jest.spyOn(component.contractIdChange, 'emit');
    const validitySpy = jest.spyOn(component.validityChanged, 'emit');

    component.onContractChange(contractId);

    expect(component.contractId).toBe(contractId);
    expect(emitSpy).toHaveBeenCalledWith(contractId);
    expect(validitySpy).toHaveBeenCalledWith(true);
  });

  describe('ngAfterViewInit', () => {
    it('should setup ResizeObserver and update containerWidth', () => {
      // Mock containerRef (lines 31-33)
      component.containerRef = {
        nativeElement: document.createElement('div')
      } as ElementRef;

      component.ngAfterViewInit();

      // Simulate ResizeObserver callback
      const mockEntry = {
        contentRect: { width: 500 }
      };
      (globalThis as any).resizeCallback([mockEntry]);

      expect(component.containerWidth).toBe(500);
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
    });

    it('should setup MutationObserver for DOM changes', () => {
      component.containerRef = {
        nativeElement: document.createElement('div')
      } as ElementRef;

      component.ngAfterViewInit();

      expect((globalThis as any).mutationCallback).toBeDefined();
    });
  });

  describe('forceSelectOverlayWidth - DOM manipulation (lines 49-82)', () => {
    beforeEach(() => {
      component.containerRef = {
        nativeElement: document.createElement('div')
      } as ElementRef;
    });

    it('should apply styles to select overlay when found', () => {
      // Mock select overlay elements
      const mockSelectOverlay = {
        style: {},
        querySelector: jest.fn().mockReturnValue({
          style: {}
        }),
        querySelectorAll: jest
          .fn()
          .mockReturnValueOnce([{ style: {} }]) // for .p-select-option
          .mockReturnValueOnce([{ style: {} }]) // for .p-select-option-label
      };

      (document.querySelector as jest.Mock).mockReturnValue(mockSelectOverlay);

      component.ngAfterViewInit();

      // Trigger MutationObserver callback (lines 49-82)
      (globalThis as any).mutationCallback([]);

      expect(document.querySelector).toHaveBeenCalledWith('.p-select-overlay.shared-result-form-select-panel');

      // Verify styles were applied to overlay
      expect(mockSelectOverlay.style.width).toBe('100%');
      expect(mockSelectOverlay.style.minWidth).toBe('0');
      expect(mockSelectOverlay.style.maxWidth).toBe('100vw');
      expect(mockSelectOverlay.style.boxSizing).toBe('border-box');
    });

    it('should handle case when select overlay is not found', () => {
      (document.querySelector as jest.Mock).mockReturnValue(null);

      component.ngAfterViewInit();

      // Should not throw when overlay is null
      expect(() => (globalThis as any).mutationCallback([])).not.toThrow();
    });

    it('should handle case when select list is not found within overlay', () => {
      const mockSelectOverlay = {
        style: {},
        querySelector: jest.fn().mockReturnValue(null), // select list not found
        querySelectorAll: jest
          .fn()
          .mockReturnValueOnce([{ style: {} }]) // for .p-select-option
          .mockReturnValueOnce([{ style: {} }]) // for .p-select-option-label
      };

      (document.querySelector as jest.Mock).mockReturnValue(mockSelectOverlay);

      component.ngAfterViewInit();

      // Should not throw when select list is null
      expect(() => (globalThis as any).mutationCallback([])).not.toThrow();

      // Verify overlay styles were still applied
      expect(mockSelectOverlay.style.width).toBe('100%');
    });

    it('should apply styles to select options and labels', () => {
      const mockOption = { style: {} };
      const mockLabel = { style: {} };

      const mockSelectOverlay = {
        style: {},
        querySelector: jest.fn().mockReturnValue({ style: {} }),
        querySelectorAll: jest
          .fn()
          .mockReturnValueOnce([mockOption]) // for .p-select-option
          .mockReturnValueOnce([mockLabel]) // for .p-select-option-label
      };

      (document.querySelector as jest.Mock).mockReturnValue(mockSelectOverlay);

      component.ngAfterViewInit();
      (globalThis as any).mutationCallback([]);

      // Verify option styles
      expect(mockOption.style.maxWidth).toBe('100%');
      expect(mockOption.style.minWidth).toBe('0');
      expect(mockOption.style.overflow).toBe('hidden');
      expect(mockOption.style.textOverflow).toBe('ellipsis');
      expect(mockOption.style.whiteSpace).toBe('nowrap');
      expect(mockOption.style.boxSizing).toBe('border-box');

      // Verify label styles
      expect(mockLabel.style.maxWidth).toBe('100%');
      expect(mockLabel.style.minWidth).toBe('0');
      expect(mockLabel.style.overflow).toBe('hidden');
      expect(mockLabel.style.textOverflow).toBe('ellipsis');
      expect(mockLabel.style.whiteSpace).toBe('nowrap');
      expect(mockLabel.style.boxSizing).toBe('border-box');
    });
  });

  describe('getShortDescription (lines 108-110)', () => {
    it('should use max=100 when dropdown width > 600', () => {
      // Mock dropdown with width > 600 (line 109: if (width > 600) max = 100)
      const mockDropdown = { offsetWidth: 700 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const veryLongText = 'A'.repeat(150);
      const result = component.getShortDescription(veryLongText);

      // Should use max = 100 for width > 600, and truncate
      expect(result).toBe(veryLongText.slice(0, 100) + '...');
    });

    it('should use max=60 when dropdown width > 400 but <= 600', () => {
      // Mock dropdown with width between 400-600 (line 110: else if (width > 400) max = 60)
      const mockDropdown = { offsetWidth: 500 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const longText = 'A'.repeat(80);
      const result = component.getShortDescription(longText);

      // Should use max = 60 for width > 400 but <= 600
      expect(result).toBe(longText.slice(0, 60) + '...');
    });

    it('should use max=40 when dropdown width <= 400', () => {
      // Mock dropdown with width <= 400 (default max = 40)
      const mockDropdown = { offsetWidth: 300 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const longText = 'A'.repeat(50);
      const result = component.getShortDescription(longText);

      // Should use max = 40 for width <= 400
      expect(result).toBe(longText.slice(0, 40) + '...');
    });

    it('should use default max=40 when dropdown is not found', () => {
      // Mock dropdown not found (line 105: dropdown = null)
      (document.querySelector as jest.Mock).mockReturnValue(null);

      const longText = 'A'.repeat(50);
      const result = component.getShortDescription(longText);

      // Should use default max = 40 when dropdown is null
      expect(result).toBe(longText.slice(0, 40) + '...');
    });

    it('should return full text when shorter than max length', () => {
      const mockDropdown = { offsetWidth: 300 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const shortText = 'Short text';
      const result = component.getShortDescription(shortText);

      expect(result).toBe(shortText);
    });

    it('should return text without truncation when exactly at max length', () => {
      const mockDropdown = { offsetWidth: 300 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const exactText = 'A'.repeat(40);
      const result = component.getShortDescription(exactText);

      expect(result).toBe(exactText);
    });

    it('should test exact boundary conditions for width > 600', () => {
      // Test exact boundary: width = 601
      const mockDropdown = { offsetWidth: 601 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const longText = 'A'.repeat(120);
      const result = component.getShortDescription(longText);

      expect(result).toBe(longText.slice(0, 100) + '...');
    });

    it('should test exact boundary conditions for width > 400', () => {
      // Test exact boundary: width = 401
      const mockDropdown = { offsetWidth: 401 };
      (document.querySelector as jest.Mock).mockReturnValue(mockDropdown);

      const longText = 'A'.repeat(80);
      const result = component.getShortDescription(longText);

      expect(result).toBe(longText.slice(0, 60) + '...');
    });
  });

  describe('isInvalid getter', () => {
    it('should return true when contractId is null', () => {
      component.contractId = null;
      expect(component.isInvalid).toBe(true);
    });

    it('should return true when contractId is 0', () => {
      component.contractId = 0;
      expect(component.isInvalid).toBe(true);
    });

    it('should return true when contractId is undefined', () => {
      component.contractId = undefined as any;
      expect(component.isInvalid).toBe(true);
    });

    it('should return false when contractId has a valid value', () => {
      component.contractId = 123;
      expect(component.isInvalid).toBe(false);
    });

    it('should return false when contractId is negative (truthy)', () => {
      component.contractId = -1;
      expect(component.isInvalid).toBe(false);
    });
  });

  describe('Input properties', () => {
    it('should have default values', () => {
      expect(component.contracts).toEqual([]);
      expect(component.contractId).toBeNull();
      expect(component.title).toBe('Reporting Project');
      expect(component.maxLength).toBe(117);
      expect(component.showWarning).toBe(false);
      expect(component.getContractStatusClasses).toBeDefined();
    });

    it('should handle getContractStatusClasses default function', () => {
      const result = component.getContractStatusClasses('any-status');
      expect(result).toBe('');
    });
  });

  describe('Output events', () => {
    it('should emit validityChanged with correct value', () => {
      const spy = jest.spyOn(component.validityChanged, 'emit');

      component.contractId = 123;
      component.ngOnChanges();
      expect(spy).toHaveBeenCalledWith(true);

      component.contractId = null;
      component.ngOnChanges();
      expect(spy).toHaveBeenCalledWith(false);
    });

    it('should emit contractIdChange when onContractChange is called', () => {
      const spy = jest.spyOn(component.contractIdChange, 'emit');

      component.onContractChange(456);
      expect(spy).toHaveBeenCalledWith(456);
    });
  });
});
