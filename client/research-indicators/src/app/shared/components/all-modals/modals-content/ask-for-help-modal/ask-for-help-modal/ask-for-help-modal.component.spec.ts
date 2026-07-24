import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AskForHelpModalComponent } from './ask-for-help-modal.component';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AllModalsService } from '../../../../../services/cache/all-modals.service';
import { ActionsService } from '../../../../../services/actions.service';
import { ApiService } from '../../../../../services/api.service';
import { CacheService } from '../../../../../services/cache/cache.service';
import * as browserUtil from '../../../../../utils/browser.util';

describe('AskForHelpModalComponent', () => {
  let component: AskForHelpModalComponent;
  let fixture: ComponentFixture<AskForHelpModalComponent>;
  let modalServiceMock: { closeModal: jest.Mock };
  let actionsServiceMock: { showGlobalAlert: jest.Mock };
  let apiServiceMock: { PATCH_Feedback: jest.Mock };
  let cacheServiceMock: {
    currentUrlPath: jest.Mock;
    currentMetadata: jest.Mock;
    dataCache: jest.Mock;
    currentResultId: jest.Mock;
    getCurrentNumericResultId?: jest.Mock;
    currentRouteTitle: jest.Mock;
    windowWidth: jest.Mock;
    windowHeight: jest.Mock;
  };

  const mockBrowserInfo = {
    name: 'Chrome',
    fullVersion: '120.0.0.0',
    majorVersion: 120
  };

  beforeEach(async () => {
    modalServiceMock = { closeModal: jest.fn() };
    actionsServiceMock = { showGlobalAlert: jest.fn() };
    apiServiceMock = { PATCH_Feedback: jest.fn() };
    cacheServiceMock = {
      currentUrlPath: jest.fn(),
      currentMetadata: jest.fn(),
      dataCache: jest.fn(),
      currentResultId: jest.fn(),
      currentRouteTitle: jest.fn(),
      windowWidth: jest.fn(),
      windowHeight: jest.fn()
    };

    cacheServiceMock.currentUrlPath.mockReturnValue('/test-path');
    cacheServiceMock.currentMetadata.mockReturnValue({ id: 1 });
    cacheServiceMock.dataCache.mockReturnValue({ user: { id: 123, name: 'Test User' } });
    cacheServiceMock.currentResultId.mockReturnValue(456);
    cacheServiceMock.getCurrentNumericResultId = jest.fn().mockReturnValue(456);
    cacheServiceMock.currentRouteTitle.mockReturnValue('Test Route');
    cacheServiceMock.windowWidth.mockReturnValue(1920);
    cacheServiceMock.windowHeight.mockReturnValue(1080);

    jest.spyOn(browserUtil, 'getBrowserInfo').mockReturnValue(mockBrowserInfo);

    await TestBed.configureTestingModule({
      imports: [FormsModule, SelectModule, InputTextModule, ButtonModule, TextareaModule],
      providers: [
        { provide: AllModalsService, useValue: modalServiceMock },
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: CacheService, useValue: cacheServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AskForHelpModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validateForm', () => {
    it('should return false when type is empty', () => {
      component.body.set({ type: '', message: 'This is a message that is long enough' });
      expect(component.validateForm()).toBeFalsy();
    });

    it('should return false when message is empty', () => {
      component.body.set({ type: 'technical-support', message: '' });
      expect(component.validateForm()).toBeFalsy();
    });

    it('should return false when message is less than 25 characters', () => {
      component.body.set({ type: 'technical-support', message: 'Short message' });
      expect(component.validateForm()).toBeFalsy();
    });

    it('should return true when type and message are valid', () => {
      component.body.set({ type: 'technical-support', message: 'This is a message that is long enough to validate' });
      expect(component.validateForm()).toBeTruthy();
    });
  });

  describe('resetModal', () => {
    it('should reset form and close modal', () => {
      component.body.set({ type: 'technical-support', message: 'Test message' });
      component.resetModal();
      expect(component.body()).toEqual({ type: '', message: '' });
      expect(modalServiceMock.closeModal).toHaveBeenCalledWith('askForHelp');
    });
  });

  describe('sendRequest', () => {
    beforeEach(() => {
      component.body.set({ type: 'technical-support', message: 'This is a test message that is long enough' });
    });

    it('should send request and show success message when API call succeeds', async () => {
      apiServiceMock.PATCH_Feedback.mockResolvedValue({ successfulRequest: true });

      await component.sendRequest();

      expect(apiServiceMock.PATCH_Feedback).toHaveBeenCalledWith({
        type: 'technical-support',
        message: 'This is a test message that is long enough',
        url: '/test-path',
        metadata: { id: 1 },
        userData: { id: 123, name: 'Test User' },
        currentResultId: 456,
        currentRouteTitle: 'Test Route',
        windowWidth: 1920,
        windowHeight: 1080,
        browserInfo: mockBrowserInfo
      });

      expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'HELP REQUEST SUBMITTED',
        detail: 'We&apos;ve received your request and will get back to you as soon as possible.',
        cancelCallback: {
          label: 'Close'
        },
        autoHideDuration: 2000,
        hideCancelButton: true
      });

      expect(component.body()).toEqual({ type: '', message: '' });
      expect(modalServiceMock.closeModal).toHaveBeenCalledWith('askForHelp');
    });

    it('should show error message when API call fails', async () => {
      apiServiceMock.PATCH_Feedback.mockResolvedValue({ successfulRequest: false });

      await component.sendRequest();

      expect(apiServiceMock.PATCH_Feedback).toHaveBeenCalled();
      expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to send request',
        cancelCallback: {
          label: 'Close'
        },
        autoHideDuration: 2000,
        hideCancelButton: true
      });

      expect(component.body()).toEqual({ type: '', message: '' });
      expect(modalServiceMock.closeModal).toHaveBeenCalledWith('askForHelp');
    });
  });

  it('should have correct support types', () => {
    expect(component.supportTypes.length).toBe(2);
    expect(component.supportTypes[0].value).toBe('technical-support');
    expect(component.supportTypes[1].value).toBe('content-support');
  });
});
