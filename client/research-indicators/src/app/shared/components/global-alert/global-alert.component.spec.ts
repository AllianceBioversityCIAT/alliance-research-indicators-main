import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalAlertComponent } from './global-alert.component';
import { ActionsService } from '../../services/actions.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { signal } from '@angular/core';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Select, SelectModule } from 'primeng/select';
import { By } from '@angular/platform-browser';
import { InputComponent } from '../custom-fields/input/input.component';
import { apiServiceMock } from '../../../testing/mock-services.mock';
import { GetYear } from '@shared/interfaces/get-year.interface';

describe('GlobalAlertComponent', () => {
  let component: GlobalAlertComponent;
  let fixture: ComponentFixture<GlobalAlertComponent>;
  let actionsService: jest.Mocked<ActionsService>;
  let serviceLocator: jest.Mocked<ServiceLocatorService>;

  beforeEach(async () => {
    const mockActionsService = {
      globalAlertsStatus: signal<GlobalAlert[]>([]),
      hideGlobalAlert: jest.fn(),
      replaceGlobalAlert: jest.fn()
    };
    mockActionsService.replaceGlobalAlert.mockImplementation((index: number, alert: GlobalAlert) =>
      mockActionsService.globalAlertsStatus.update(prev => prev.map((cur, i) => (i === index ? alert : cur)))
    );

    const mockServiceLocator = {
      getService: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GlobalAlertComponent, FormsModule, ButtonModule, SelectModule, InputComponent],
      providers: [
        { provide: ActionsService, useValue: mockActionsService },
        { provide: ServiceLocatorService, useValue: mockServiceLocator }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalAlertComponent);
    component = fixture.componentInstance;
    actionsService = TestBed.inject(ActionsService) as jest.Mocked<ActionsService>;
    serviceLocator = TestBed.inject(ServiceLocatorService) as jest.Mocked<ServiceLocatorService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle different severity icons', () => {
    const severities = ['success', 'confirm', 'warning', 'secondary', 'error', 'info'] as const;

    severities.forEach(severity => {
      const result = component.getIcon(severity);
      expect(result).toHaveProperty('icon');
      expect(result).toHaveProperty('color');
    });
  });

  it('should validate isInvalid correctly', () => {
    component.body = signal({ commentValue: '', selectValue: null });
    expect(component.isInvalid).toBe(true);

    component.body = signal({ commentValue: '', selectValue: 2024 });
    expect(component.isInvalid).toBe(false);
  });

  it('should setup and clear auto-hide timeouts', () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      autoHideDuration: 1000
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    component.ngOnDestroy();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('should close alert and reset body', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test'
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    component.body = signal({ commentValue: 'test', selectValue: 2024 });
    fixture.detectChanges();

    component.closeAlert(0);

    expect(actionsService.hideGlobalAlert).toHaveBeenCalledWith(0);
    expect(component.body().commentValue).toBe('');
    expect(component.body().selectValue).toBeNull();
  });

  it('should handle all severity types in getIcon', () => {
    const severities = ['success', 'confirm', 'warning', 'secondary', 'error', 'delete', 'processing', 'info'] as const;
    
    severities.forEach(severity => {
      const result = component.getIcon(severity);
      expect(result).toHaveProperty('icon');
      expect(result).toHaveProperty('color');
    });

    // Test default case
    const defaultResult = component.getIcon('unknown' as any);
    expect(defaultResult.icon).toBe('pi pi-info-circle');
    expect(defaultResult.color).toBe('#035BA9');
  });

  it('should handle service with list method in alertList computed', () => {
    const mockService = {
      list: jest.fn().mockReturnValue([
        { report_year: 2023, has_reported: 0 },
        { report_year: 2024, has_reported: 1 }
      ] as GetYear[])
    };

    serviceLocator.getService.mockReturnValue(mockService);

    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      serviceName: 'testService'
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    expect(component.service).toBe(mockService);
    expect(component.optionsList).toEqual([
      { report_year: 2023, has_reported: 0 },
      { report_year: 2024, has_reported: 1 }
    ]);
  });

  it('should handle service returning null in alertList computed', () => {
    serviceLocator.getService.mockReturnValue(null);

    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      serviceName: 'testService'
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    expect(component.service).toBeUndefined();
    expect(component.optionsList).toEqual([]);
  });

  it('should handle alert without serviceName in alertList computed', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test'
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    expect(component.service).toBeUndefined();
  });

  it('should handle commentLabel with commentRequired true', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      commentLabel: 'Test Comment',
      commentRequired: true
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const alertList = component.alertList();
    expect(alertList[0].commentLabel).toBe('Test Comment');
  });

  it('should handle commentLabel with commentRequired false', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      commentLabel: 'Test Comment',
      commentRequired: false
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const alertList = component.alertList();
    expect(alertList[0].commentLabel).toBe('Test Comment (Optional)');
  });

  it('should set default cancelCallback when not provided', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test'
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const alertList = component.alertList();
    expect(alertList[0].cancelCallback?.label).toBe('Cancel');
  });

  it('should handle cancelCallback with existing label', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      cancelCallback: { label: 'Custom Cancel' }
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const alertList = component.alertList();
    expect(alertList[0].cancelCallback?.label).toBe('Custom Cancel');
  });

  it('should handle onSelectChange with has_reported = 1', () => {
    component.optionsList = [
      { report_year: 2023, has_reported: 0 },
      { report_year: 2024, has_reported: 1 }
    ] as GetYear[];

    component.onSelectChange(2024);

    expect(component.showReportedWarning).toBe(true);
    expect(component.body().selectValue).toBeNull();
  });

  it('should handle onSelectChange with has_reported = 0', () => {
    component.optionsList = [
      { report_year: 2023, has_reported: 0 },
      { report_year: 2024, has_reported: 1 }
    ] as GetYear[];

    component.onSelectChange(2023);

    expect(component.showReportedWarning).toBe(false);
    expect(component.body().selectValue).toBe(2023);
  });

  it('should handle onSelectChange with no matching option', () => {
    component.optionsList = [
      { report_year: 2023, has_reported: 0 }
    ] as GetYear[];

    component.onSelectChange(2025);

    expect(component.showReportedWarning).toBe(false);
    expect(component.body().selectValue).toBe(2025);
  });

  it('should clear timeout when closing alert with existing timeout', () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      autoHideDuration: 1000
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    // Manually set a timeout ID to simulate existing timeout
    (component as any).autoHideTimeouts[0] = 123;

    component.closeAlert(0);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    expect((component as any).autoHideTimeouts[0]).toBe(0);

    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  it('should handle closeAlert without existing timeout', () => {
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test'
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    component.closeAlert(0);

    expect(actionsService.hideGlobalAlert).toHaveBeenCalledWith(0);
    expect(component.body().commentValue).toBe('');
    expect(component.body().selectValue).toBeNull();

    clearTimeoutSpy.mockRestore();
  });

  it('should handle clearAllTimeouts with mixed timeout values', () => {
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
    
    // Set up mixed timeout values
    (component as any).autoHideTimeouts = [123, 0, 456, null, undefined];

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(456);
    expect(clearTimeoutSpy).not.toHaveBeenCalledWith(0);
    expect(clearTimeoutSpy).not.toHaveBeenCalledWith(null);
    expect(clearTimeoutSpy).not.toHaveBeenCalledWith(undefined);
    expect((component as any).autoHideTimeouts).toEqual([]);

    clearTimeoutSpy.mockRestore();
  });

  it('should call setupAutoHideForAlerts in ngOnInit', () => {
    const setupSpy = jest.spyOn(component as any, 'setupAutoHideForAlerts');
    
    component.ngOnInit();
    
    expect(setupSpy).toHaveBeenCalledWith(component.alertList());
  });

  it('should trigger closeAlert when autoHideDuration timeout expires', () => {
    jest.useFakeTimers();
    const closeAlertSpy = jest.spyOn(component, 'closeAlert');

    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Test',
      autoHideDuration: 1000
    };

    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    // Advance time to trigger the timeout
    jest.advanceTimersByTime(1000);

    expect(closeAlertSpy).toHaveBeenCalledWith(0);

    jest.useRealTimers();
  });

  it('should handle onCommentInput with null event.target', () => {
    component.body.set({ commentValue: 'initial', selectValue: null });
    const event = { target: null } as unknown as Event;
    
    component.onCommentInput(event);
    
    expect(component.body().commentValue).toBe('');
  });

  it('should handle onCommentInput with undefined event.target', () => {
    component.body.set({ commentValue: 'initial', selectValue: null });
    const event = { target: undefined } as unknown as Event;
    
    component.onCommentInput(event);
    
    expect(component.body().commentValue).toBe('');
  });

  it('should call onDetailLinkClick when click target is inside alert-link-custom and alert has onDetailLinkClick', () => {
    const onDetailLinkClick = jest.fn();
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: '<a href="#" class="alert-link-custom">Link</a>',
      onDetailLinkClick
    };
    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const linkElement = document.createElement('a');
    linkElement.className = 'alert-link-custom';
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const mockEvent = {
      target: linkElement,
      preventDefault,
      stopPropagation
    } as unknown as MouseEvent;
    (linkElement as any).closest = jest.fn((sel: string) => (sel === 'a.alert-link-custom' ? linkElement : null));

    component.onDetailLinkClick(mockEvent, 0);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(onDetailLinkClick).toHaveBeenCalled();
  });

  it('should not call onDetailLinkClick when click target is not inside alert-link-custom', () => {
    const onDetailLinkClick = jest.fn();
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Text',
      onDetailLinkClick
    };
    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const divElement = document.createElement('div');
    const mockEvent = {
      target: divElement,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    } as unknown as MouseEvent;
    (divElement as any).closest = jest.fn(() => null);

    component.onDetailLinkClick(mockEvent, 0);

    expect(onDetailLinkClick).not.toHaveBeenCalled();
  });

  it('should not call onDetailLinkClick when alert has no onDetailLinkClick', () => {
    const mockAlert: GlobalAlert = {
      severity: 'info',
      summary: 'Test',
      detail: 'Text'
    };
    actionsService.globalAlertsStatus.set([mockAlert]);
    fixture.detectChanges();

    const linkElement = document.createElement('a');
    linkElement.className = 'alert-link-custom';
    const mockEvent = {
      target: linkElement,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    } as unknown as MouseEvent;
    (linkElement as any).closest = jest.fn((sel: string) => (sel === 'a.alert-link-custom' ? linkElement : null));

    component.onDetailLinkClick(mockEvent, 0);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });
  describe('update-result-year prompt (infoCard / cancelSwapsTo / excludeYears)', () => {
    const years = [2028, 2027, 2026, 2025].map(report_year => ({ report_year, has_reported: 0 }) as GetYear);
    const listMock = { list: jest.fn() };
    const html = () => fixture.nativeElement as HTMLElement;
    const optionYears = () => {
      const select = fixture.debugElement.query(By.directive(Select));
      return (select.componentInstance.options as GetYear[]).map(o => o.report_year);
    };
    const clickCancel = () => {
      const btn = html().querySelector('p-button button') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();
    };
    let cancelEvent: jest.Mock;
    let picker: GlobalAlert;
    let prompt: GlobalAlert;

    beforeEach(() => {
      listMock.list.mockReturnValue(years);
      serviceLocator.getService.mockReturnValue(listMock as unknown as ReturnType<ServiceLocatorService['getService']>);
      cancelEvent = jest.fn();
      picker = {
        severity: 'info',
        summary: 'Pick',
        detail: 'pick a year',
        serviceName: 'testService' as GlobalAlert['serviceName'],
        selectorLabel: 'Year',
        selectorRequired: true,
        selectorExcludeValues: [2026]
      };
      prompt = {
        severity: 'info',
        summary: 'Prompt',
        detail: 'prompt detail',
        infoCard: { badge: '2026 VERSION', caption: 'Created from approved' },
        cancelCallback: { label: 'Other year', event: cancelEvent },
        cancelSwapsTo: picker
      };
    });

    it('renders the infoCard as real text and no selector (g1)', () => {
      actionsService.globalAlertsStatus.set([prompt]);
      fixture.detectChanges();
      expect(html().querySelector('.info-card-badge')?.textContent?.trim()).toBe('2026 VERSION');
      expect(html().querySelector('.info-card-caption')?.textContent?.trim()).toBe('Created from approved');
      expect(html().querySelector('p-select')).toBeNull();
    });

    it('swaps in place on Cancel when cancelSwapsTo is set (g2)', () => {
      actionsService.globalAlertsStatus.set([prompt]);
      fixture.detectChanges();
      const before = html().querySelector('.alert-overlay');
      expect(before).not.toBeNull();
      expect(html().querySelector('p-select')).toBeNull();

      clickCancel();

      expect(cancelEvent).toHaveBeenCalledTimes(1);
      expect(actionsService.globalAlertsStatus().length).toBe(1);
      expect(html().querySelector('.alert-overlay')).toBe(before);
      expect(html().querySelector('p-select')).not.toBeNull();
      expect(actionsService.hideGlobalAlert).not.toHaveBeenCalled();
    });

    it('excludes 2026 from the rendered options after the swap (g3)', () => {
      actionsService.globalAlertsStatus.set([prompt]);
      fixture.detectChanges();
      clickCancel();
      expect(optionYears()).toEqual([2028, 2027, 2025]);
    });

    it('closes on Cancel without cancelSwapsTo (g4)', () => {
      actionsService.globalAlertsStatus.set([{ severity: 'info', summary: 'x', detail: 'y', cancelCallback: { label: 'Cancel', event: cancelEvent } }]);
      fixture.detectChanges();
      clickCancel();
      expect(cancelEvent).toHaveBeenCalledTimes(1);
      expect(actionsService.hideGlobalAlert).toHaveBeenCalledWith(0);
      expect(actionsService.replaceGlobalAlert).not.toHaveBeenCalled();
    });

    it('closes on the x button without swapping or running cancelCallback (g5)', () => {
      actionsService.globalAlertsStatus.set([prompt]);
      fixture.detectChanges();
      (html().querySelector('i.pi-times') as HTMLElement).click();
      fixture.detectChanges();
      expect(actionsService.hideGlobalAlert).toHaveBeenCalledWith(0);
      expect(actionsService.replaceGlobalAlert).not.toHaveBeenCalled();
      expect(cancelEvent).not.toHaveBeenCalled();
    });

    it('keeps the same options reference without selectorExcludeValues (g6)', () => {
      actionsService.globalAlertsStatus.set([{ ...picker, selectorExcludeValues: undefined }]);
      fixture.detectChanges();
      const select = fixture.debugElement.query(By.directive(Select));
      expect(select.componentInstance.options).toBe(years);
    });

    it('resets the warning and body selection after the swap (g7)', () => {
      actionsService.globalAlertsStatus.set([prompt]);
      fixture.detectChanges();
      component.showReportedWarning = true;
      component.body.set({ commentValue: 'x', selectValue: 2025 });
      clickCancel();
      expect(component.showReportedWarning).toBe(false);
      expect(component.body().selectValue).toBeNull();
      expect(component.body().commentValue).toBe('');
    });
  });
});
