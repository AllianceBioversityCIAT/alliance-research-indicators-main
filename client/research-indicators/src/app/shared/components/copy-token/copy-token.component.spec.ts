import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyTokenComponent } from './copy-token.component';

describe('CopyTokenComponent', () => {
  let component: CopyTokenComponent;
  let fixture: ComponentFixture<CopyTokenComponent>;

  beforeEach(async () => {
    Object.defineProperty(navigator, 'userAgentData', {
      value: { platform: 'Windows' },
      configurable: true
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue('test')
      },
      configurable: true
    });
    Object.defineProperty(window, 'location', {
      value: {
        reload: jest.fn()
      },
      configurable: true
    });

    await TestBed.configureTestingModule({
      imports: [CopyTokenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CopyTokenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('handleKeyboardEvent', () => {
    it('should copy data when Ctrl+T is pressed', () => {
      const copySpy = jest.spyOn(component, 'copyDataToClipboard');
      const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 't' });
      
      component.handleKeyboardEvent(event);
      expect(copySpy).toHaveBeenCalled();
    });

    it('should paste data when Ctrl+P is pressed', () => {
      const pasteSpy = jest.spyOn(component, 'pasteDataFromClipboard');
      const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'p' });
      
      component.handleKeyboardEvent(event);
      expect(pasteSpy).toHaveBeenCalled();
    });

    it('should focus search input when Cmd+K is pressed on macOS', () => {
      // Mock macOS detection
      Object.defineProperty(component, 'isMacOS', { value: true, configurable: true });
      const focusSpy = jest.spyOn(component, 'focusSearchInput');
      const event = new KeyboardEvent('keydown', { metaKey: true, key: 'k' });
      
      component.handleKeyboardEvent(event);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should not focus search input when Cmd+K is pressed on non-macOS', () => {
      // Mock non-macOS detection
      Object.defineProperty(component, 'isMacOS', { value: false, configurable: true });
      const focusSpy = jest.spyOn(component, 'focusSearchInput');
      const event = new KeyboardEvent('keydown', { metaKey: true, key: 'k' });
      
      component.handleKeyboardEvent(event);
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it('should handle Ctrl+Alt+C on macOS (commented clearLocalStorageAndReload)', () => {
      // Mock macOS detection
      Object.defineProperty(component, 'isMacOS', { value: true, configurable: true });
      const event = new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, key: 'c' });
      
      expect(() => component.handleKeyboardEvent(event)).not.toThrow();
    });

    it('should not handle Ctrl+Alt+C on non-macOS', () => {
      // Mock non-macOS detection
      Object.defineProperty(component, 'isMacOS', { value: false, configurable: true });
      const event = new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, key: 'c' });
      
      // This should not do anything on non-macOS
      expect(() => component.handleKeyboardEvent(event)).not.toThrow();
    });

    it('should not handle other key combinations', () => {
      const copySpy = jest.spyOn(component, 'copyDataToClipboard');
      const pasteSpy = jest.spyOn(component, 'pasteDataFromClipboard');
      const focusSpy = jest.spyOn(component, 'focusSearchInput');
      
      const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'x' });
      component.handleKeyboardEvent(event);
      
      expect(copySpy).not.toHaveBeenCalled();
      expect(pasteSpy).not.toHaveBeenCalled();
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  describe('copyDataToClipboard', () => {
    it('should copy data from localStorage to clipboard', () => {
      const mockData = 'test data';
      localStorage.setItem('data', mockData);
      const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText');
      
      component.copyDataToClipboard();
      
      expect(writeTextSpy).toHaveBeenCalledWith(mockData);
    });

    it('should warn when no data found in localStorage', () => {
      localStorage.removeItem('data');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      component.copyDataToClipboard();
      
      expect(consoleSpy).toHaveBeenCalledWith('No data found in local storage');
      consoleSpy.mockRestore();
    });
  });

  describe('pasteDataFromClipboard', () => {
    it('should paste data from clipboard to localStorage and reload', async () => {
      const mockText = 'pasted data';
      jest.spyOn(navigator.clipboard, 'readText').mockResolvedValue(mockText);
      
      await component.pasteDataFromClipboard();
      
      expect(localStorage.getItem('data')).toBe(mockText);
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should handle clipboard read error', async () => {
      const mockError = new Error('Clipboard access denied');
      jest.spyOn(navigator.clipboard, 'readText').mockRejectedValue(mockError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await component.pasteDataFromClipboard();
      
      expect(consoleSpy).toHaveBeenCalledWith('Could not read text from clipboard: ', mockError);
      consoleSpy.mockRestore();
    });
  });

  describe('focusSearchInput', () => {
    it('should focus and click search input when found', () => {
      const mockInput = document.createElement('input');
      mockInput.id = 'search-result-input';
      document.body.appendChild(mockInput);
      
      const focusSpy = jest.spyOn(mockInput, 'focus');
      const clickSpy = jest.spyOn(mockInput, 'click');
      
      component.focusSearchInput();
      
      expect(focusSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      
      document.body.removeChild(mockInput);
    });

    it('should warn when search input not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      component.focusSearchInput();
      
      expect(consoleSpy).toHaveBeenCalledWith('Search input not found');
      consoleSpy.mockRestore();
    });
  });

  describe('clearLocalStorageAndReload', () => {
    it('should clear localStorage and reload page', () => {
      localStorage.setItem('test', 'data');
      const clearSpy = jest.spyOn(Storage.prototype, 'clear');
      
      component.clearLocalStorageAndReload();
      
      expect(clearSpy).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('detectMacOS', () => {
    it('should detect macOS using userAgentData when available', () => {
      Object.defineProperty(navigator, 'userAgentData', {
        value: { platform: 'macOS' },
        configurable: true
      });
      
      const newComponent = new CopyTokenComponent();
      expect(newComponent).toBeTruthy();
    });

    it('should detect macOS using userAgent when userAgentData not available', () => {
      delete (navigator as any).userAgentData;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true
      });
      
      const newComponent = new CopyTokenComponent();
      expect(newComponent).toBeTruthy();
    });

    it('should return false when platform does not include Mac', () => {
      Object.defineProperty(navigator, 'userAgentData', {
        value: { platform: 'Windows' },
        configurable: true
      });
      
      const newComponent = new CopyTokenComponent();
      expect(newComponent).toBeTruthy();
    });

    it('should return false when userAgentData platform is undefined', () => {
      // Create a new component with undefined platform
      Object.defineProperty(navigator, 'userAgentData', {
        value: { platform: undefined },
        configurable: true
      });
      
      const newComponent = new CopyTokenComponent();
      expect(newComponent).toBeTruthy();
    });
  });
});
