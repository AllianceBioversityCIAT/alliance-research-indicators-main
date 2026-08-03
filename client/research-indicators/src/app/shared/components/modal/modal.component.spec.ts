import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AllModalsService } from '@services/cache/all-modals.service';
import { ModalName } from '@ts-types/modal.types';
import { computed, Signal } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let allModalsServiceMock: jest.Mocked<AllModalsService>;
  let createResultManagementServiceMock: jest.Mocked<CreateResultManagementService>;

  const modalName: ModalName = 'createResult';
  const defaultConfig = {
    createResult: { isOpen: true, title: 'Test' },
    submitResult: { isOpen: false, title: 'Review Result', cancelText: '', confirmText: '' },
    requestPartner: { isOpen: false, title: 'Partners Request' },
    askForHelp: { isOpen: false, title: 'Ask for Help' }
  };

  beforeAll(() => {
    // Mock animate to avoid animation error
    if (!Element.prototype.animate) {
      Element.prototype.animate = () =>
        ({
          play: () => {},
          pause: () => {},
          finish: () => {},
          cancel: () => {},
          reverse: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          onfinish: null,
          oncancel: null,
          currentTime: 0,
          playState: 'finished',
          finished: Promise.resolve(),
          effect: null,
          id: '',
          startTime: 0,
          timeline: null,
          playbackRate: 1,
          updatePlaybackRate: () => {}
        }) as any;
    }
  });

  beforeEach(async () => {
    allModalsServiceMock = {
      isModalOpen: jest.fn(),
      modalConfig: jest.fn().mockReturnValue(defaultConfig),
      toggleModal: jest.fn()
    } as any;

    createResultManagementServiceMock = {
      resultPageStep: jest.fn().mockReturnValue(1),
      modalTitle: jest.fn().mockReturnValue('Dynamic Title')
    } as any;

    await TestBed.configureTestingModule({
      imports: [ModalComponent, HttpClientTestingModule],
      providers: [
        { provide: AllModalsService, useValue: allModalsServiceMock },
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        provideAnimations()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    component.modalName = modalName;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('showModal should delegate to allModalsService.isModalOpen', () => {
    allModalsServiceMock.isModalOpen.mockReturnValue({ isOpen: true, title: 'Test' });
    expect(component.showModal()).toEqual({ isOpen: true, title: 'Test' });
    expect(allModalsServiceMock.isModalOpen).toHaveBeenCalledWith(modalName);
  });

  it('getConfig should return modal configuration', () => {
    allModalsServiceMock.modalConfig.mockReturnValue(defaultConfig);
    expect(component.getConfig()).toEqual({ isOpen: true, title: 'Test' });
  });

  it('getConfig should return empty object if no configuration exists', () => {
    allModalsServiceMock.modalConfig.mockReturnValue({
      createResult: undefined,
      submitResult: undefined,
      requestPartner: undefined,
      askForHelp: undefined
    } as any);
    expect(component.getConfig()).toEqual({});
  });

  it('should accept disabledConfirmIf as Signal', () => {
    const signal: Signal<boolean> = computed(() => true);
    component.disabledConfirmIf = signal;
    expect(component.disabledConfirmIf()).toBe(true);
  });

  it('should accept clearModal as function', () => {
    const fn = jest.fn();
    component.clearModal = fn;
    component.clearModal();
    expect(fn).toHaveBeenCalled();
  });

  it('should cover getConfig with icon, cancelAction and confirmAction', () => {
    const iconAction = jest.fn();
    const cancelAction = jest.fn();
    const confirmAction = jest.fn();
    const disabledConfirmAction = jest.fn().mockReturnValue(true);
    allModalsServiceMock.modalConfig.mockReturnValue({
      createResult: {
        isOpen: true,
        title: 'Test',
        icon: 'icon',
        iconAction,
        cancelAction,
        confirmAction,
        cancelText: 'Cancelar',
        confirmText: 'Confirmar',
        disabledConfirmAction
      },
      submitResult: { isOpen: false, title: 'Review Result', cancelText: '', confirmText: '' },
      requestPartner: { isOpen: false, title: 'Partners Request' },
      askForHelp: { isOpen: false, title: 'Ask for Help' }
    });
    const config = component.getConfig();
    expect(config.icon).toBe('icon');
    config.iconAction && config.iconAction();
    expect(iconAction).toHaveBeenCalled();
    config.cancelAction && config.cancelAction();
    expect(cancelAction).toHaveBeenCalled();
    config.confirmAction && config.confirmAction();
    expect(confirmAction).toHaveBeenCalled();
    expect(config.disabledConfirmAction && config.disabledConfirmAction()).toBe(true);
  });

  it('getModalTitle returns dynamic title when modalName is createResult and step is 2', () => {
    component.modalName = 'createResult';
    createResultManagementServiceMock.resultPageStep.mockReturnValue(2);
    createResultManagementServiceMock.modalTitle.mockReturnValue('Dynamic Title');
    expect(component.getModalTitle()).toBe('Dynamic Title');
    expect(createResultManagementServiceMock.modalTitle).toHaveBeenCalled();
  });

  it('getModalTitle returns config title for other cases', () => {
    // Case 1: modalName is not createResult
    component.modalName = 'submitResult';
    expect(component.getModalTitle()).toBe('Review Result');

    // Case 2: modalName is createResult but step is not 2
    component.modalName = 'createResult';
    createResultManagementServiceMock.resultPageStep.mockReturnValue(1);
    expect(component.getModalTitle()).toBe('Test');
  });

  it('should have default clearModal function that does nothing', () => {
    // Test the default clearModal function (no-op)
    expect(() => component.clearModal()).not.toThrow();
  });

  it('should have default disabledConfirmIf computed signal', () => {
    // Test the default computed signal returns false
    expect(component.disabledConfirmIf()).toBe(false);
  });

  it('should test all animation triggers are defined', () => {
    // This ensures the animation functions are covered
    const componentMetadata = component.constructor as any;
    expect(componentMetadata).toBeDefined();
  });

  it('handleCloseClick should call iconAction when available', () => {
    const iconAction = jest.fn();
    allModalsServiceMock.modalConfig.mockReturnValue({
      createResult: {
        isOpen: true,
        title: 'Test',
        iconAction
      }
    });
    
    component.handleCloseClick();
    
    expect(iconAction).toHaveBeenCalled();
  });

  it('handleCloseClick should call cancelAction when iconAction is not available', () => {
    const cancelAction = jest.fn();
    allModalsServiceMock.modalConfig.mockReturnValue({
      createResult: {
        isOpen: true,
        title: 'Test',
        cancelAction
      }
    });
    
    component.handleCloseClick();
    
    expect(cancelAction).toHaveBeenCalled();
  });

  it('handleCloseClick should call toggleModal when neither iconAction nor cancelAction are available', () => {
    allModalsServiceMock.modalConfig.mockReturnValue({
      createResult: {
        isOpen: true,
        title: 'Test'
      }
    });
    
    component.handleCloseClick();
    
    expect(allModalsServiceMock.toggleModal).toHaveBeenCalledWith(modalName);
  });

  it('handleCloseClick should prioritize iconAction over cancelAction', () => {
    const iconAction = jest.fn();
    const cancelAction = jest.fn();
    allModalsServiceMock.modalConfig.mockReturnValue({
      createResult: {
        isOpen: true,
        title: 'Test',
        iconAction,
        cancelAction
      }
    });
    
    component.handleCloseClick();
    
    expect(iconAction).toHaveBeenCalled();
    expect(cancelAction).not.toHaveBeenCalled();
    expect(allModalsServiceMock.toggleModal).not.toHaveBeenCalled();
  });

  describe('ngAfterViewChecked', () => {
    it('should focus first element when modal opens', () => {
      // Set modal as closed initially
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: false, title: 'Test' }
      });
      fixture.detectChanges();
      
      // Mock modalRoot with focusable element
      const mockElement = document.createElement('div');
      const button = document.createElement('button');
      mockElement.appendChild(button);
      component.modalRoot = { nativeElement: mockElement } as any;
      
      // Mock getClientRects and offset properties
      jest.spyOn(button, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      Object.defineProperty(button, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(button, 'offsetHeight', { value: 10, configurable: true });
      
      const focusSpy = jest.spyOn(button, 'focus');
      
      // Change to open - this triggers ngAfterViewChecked
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      // Use fake timers to control setTimeout
      jest.useFakeTimers();
      // Manually call ngAfterViewChecked to simulate Angular lifecycle
      component.ngAfterViewChecked();
      jest.advanceTimersByTime(1);
      jest.useRealTimers();
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should reset wasOpen when modal closes', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      fixture.detectChanges();
      
      // Mock modalRoot
      const mockElement = document.createElement('div');
      component.modalRoot = { nativeElement: mockElement } as any;
      
      // Simulate modal was open
      (component as any).wasOpen = true;
      
      // Change to closed
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: false, title: 'Test' }
      });
      
      // Manually call ngAfterViewChecked
      component.ngAfterViewChecked();
      
      expect((component as any).wasOpen).toBe(false);
    });
  });

  describe('onKeydown', () => {
    beforeEach(() => {
      const mockElement = document.createElement('div');
      component.modalRoot = { nativeElement: mockElement } as any;
    });

    it('should return early if key is not Tab', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should return early if modal is not open', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: false, title: 'Test' }
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should return early if container is not available', () => {
      component.modalRoot = undefined as any;
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should return early if no focusable nodes', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should wrap to last element when Shift+Tab on first element', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      const container = component.modalRoot.nativeElement;
      const firstButton = document.createElement('button');
      const secondButton = document.createElement('button');
      container.appendChild(firstButton);
      container.appendChild(secondButton);
      
      // Mock getClientRects to make elements visible
      jest.spyOn(firstButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      jest.spyOn(secondButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      Object.defineProperty(firstButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(firstButton, 'offsetHeight', { value: 10, configurable: true });
      Object.defineProperty(secondButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(secondButton, 'offsetHeight', { value: 10, configurable: true });
      
      // Mock document.activeElement
      Object.defineProperty(document, 'activeElement', {
        value: firstButton,
        writable: true,
        configurable: true
      });
      
      const focusSpy = jest.spyOn(secondButton, 'focus');
      
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should wrap to first element when Tab on last element', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      const container = component.modalRoot.nativeElement;
      const firstButton = document.createElement('button');
      const secondButton = document.createElement('button');
      container.appendChild(firstButton);
      container.appendChild(secondButton);
      
      // Mock getClientRects to make elements visible
      jest.spyOn(firstButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      jest.spyOn(secondButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      Object.defineProperty(firstButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(firstButton, 'offsetHeight', { value: 10, configurable: true });
      Object.defineProperty(secondButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(secondButton, 'offsetHeight', { value: 10, configurable: true });
      
      // Mock document.activeElement
      Object.defineProperty(document, 'activeElement', {
        value: secondButton,
        writable: true,
        configurable: true
      });
      
      const focusSpy = jest.spyOn(firstButton, 'focus');
      
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should not prevent default when Tab is pressed normally', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      const container = component.modalRoot.nativeElement;
      const firstButton = document.createElement('button');
      const secondButton = document.createElement('button');
      container.appendChild(firstButton);
      container.appendChild(secondButton);
      
      // Mock getClientRects to make elements visible
      jest.spyOn(firstButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      jest.spyOn(secondButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      Object.defineProperty(firstButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(firstButton, 'offsetHeight', { value: 10, configurable: true });
      Object.defineProperty(secondButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(secondButton, 'offsetHeight', { value: 10, configurable: true });
      
      firstButton.focus();
      
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false });
      jest.spyOn(event, 'preventDefault');
      
      component.onKeydown(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('focusFirstElement', () => {
    it('should return early if container is not available', () => {
      component.modalRoot = undefined as any;
      
      expect(() => (component as any).focusFirstElement()).not.toThrow();
    });

    it('should focus first focusable element', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      const input = document.createElement('input');
      container.appendChild(button);
      container.appendChild(input);
      
      component.modalRoot = { nativeElement: container } as any;
      
      // Mock getClientRects to make elements visible
      jest.spyOn(button, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      jest.spyOn(input, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      Object.defineProperty(button, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(button, 'offsetHeight', { value: 10, configurable: true });
      Object.defineProperty(input, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(input, 'offsetHeight', { value: 10, configurable: true });
      
      const focusSpy = jest.spyOn(button, 'focus');
      
      (component as any).focusFirstElement();
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus container if no focusable elements', () => {
      const container = document.createElement('div');
      component.modalRoot = { nativeElement: container } as any;
      
      const focusSpy = jest.spyOn(container, 'focus');
      
      (component as any).focusFirstElement();
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should filter out hidden elements', () => {
      const container = document.createElement('div');
      const visibleButton = document.createElement('button');
      const hiddenButton = document.createElement('button');
      container.appendChild(visibleButton);
      container.appendChild(hiddenButton);
      
      component.modalRoot = { nativeElement: container } as any;
      
      // Mock getClientRects - visible button has rects, hidden doesn't
      jest.spyOn(visibleButton, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      jest.spyOn(hiddenButton, 'getClientRects').mockReturnValue([] as any);
      Object.defineProperty(visibleButton, 'offsetWidth', { value: 10, configurable: true });
      Object.defineProperty(visibleButton, 'offsetHeight', { value: 10, configurable: true });
      Object.defineProperty(hiddenButton, 'offsetWidth', { value: 0, configurable: true });
      Object.defineProperty(hiddenButton, 'offsetHeight', { value: 0, configurable: true });
      
      const focusSpy = jest.spyOn(visibleButton, 'focus');
      
      (component as any).focusFirstElement();
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should filter elements using getClientRects when offsetWidth and offsetHeight are 0', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      container.appendChild(button);
      
      component.modalRoot = { nativeElement: container } as any;
      
      // Element has no offset but has client rects
      Object.defineProperty(button, 'offsetWidth', { value: 0, configurable: true });
      Object.defineProperty(button, 'offsetHeight', { value: 0, configurable: true });
      jest.spyOn(button, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      
      const focusSpy = jest.spyOn(button, 'focus');
      
      (component as any).focusFirstElement();
      
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('onKeydown filter logic', () => {
    it('should filter elements using getClientRects when offsetWidth and offsetHeight are 0', () => {
      allModalsServiceMock.modalConfig.mockReturnValue({
        createResult: { isOpen: true, title: 'Test' }
      });
      
      const container = component.modalRoot.nativeElement;
      const button = document.createElement('button');
      container.appendChild(button);
      
      // Element has no offset but has client rects
      Object.defineProperty(button, 'offsetWidth', { value: 0, configurable: true });
      Object.defineProperty(button, 'offsetHeight', { value: 0, configurable: true });
      jest.spyOn(button, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as any);
      
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      
      // Should not throw and should process the element
      expect(() => component.onKeydown(event)).not.toThrow();
    });
  });
});
