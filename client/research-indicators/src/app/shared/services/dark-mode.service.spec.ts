import { TestBed } from '@angular/core/testing';
import { DarkModeService } from './dark-mode.service';
import { Renderer2, RendererFactory2 } from '@angular/core';

describe('DarkModeService', () => {
  let service: DarkModeService;
  let rendererMock: jest.Mocked<Renderer2>;
  let rendererFactoryMock: jest.Mocked<RendererFactory2>;

  beforeEach(() => {
    rendererMock = {
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      addClass: jest.fn(),
      removeClass: jest.fn(),
      setStyle: jest.fn(),
      removeStyle: jest.fn(),
      setProperty: jest.fn(),
      setValue: jest.fn(),
      listen: jest.fn(),
      createElement: jest.fn(),
      createText: jest.fn(),
      appendChild: jest.fn(),
      insertBefore: jest.fn(),
      removeChild: jest.fn(),
      selectRootElement: jest.fn(),
      parentNode: jest.fn(),
      nextSibling: jest.fn(),
      destroy: jest.fn(),
      createComment: jest.fn(),
      projectNodes: jest.fn(),
      animate: jest.fn(),
      setBindingDebugInfo: jest.fn(),
      setBindingDebugInfoEnabled: jest.fn(),
      setElementClass: jest.fn(),
      setElementStyle: jest.fn(),
      invokeElementMethod: jest.fn(),
      setText: jest.fn(),
      createTemplateAnchor: jest.fn()
    } as unknown as jest.Mocked<Renderer2>;

    rendererFactoryMock = {
      createRenderer: jest.fn().mockReturnValue(rendererMock)
    } as unknown as jest.Mocked<RendererFactory2>;

    TestBed.configureTestingModule({
      providers: [DarkModeService, { provide: RendererFactory2, useValue: rendererFactoryMock }]
    });
    service = TestBed.inject(DarkModeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create renderer on initialization', () => {
    expect(rendererFactoryMock.createRenderer).toHaveBeenCalledWith(null, null);
  });

  it('should load dark theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    service.loadThemePreference();
    expect(service.isDarkModeEnabled()).toBe(true);
    expect(rendererMock.setAttribute).toHaveBeenCalledWith(document.documentElement, 'data-theme', 'dark');
  });

  it('should load light theme from localStorage', () => {
    localStorage.setItem('theme', 'light');
    service.loadThemePreference();
    expect(service.isDarkModeEnabled()).toBe(false);
    expect(rendererMock.setAttribute).toHaveBeenCalledWith(document.documentElement, 'data-theme', 'light');
  });

  it('should use system dark preference when no localStorage value', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });

    service.loadThemePreference();
    expect(service.isDarkModeEnabled()).toBe(true);
    expect(rendererMock.setAttribute).toHaveBeenCalledWith(document.documentElement, 'data-theme', 'dark');
  });

  it('should use system light preference when no localStorage value', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });

    service.loadThemePreference();
    expect(service.isDarkModeEnabled()).toBe(false);
    expect(rendererMock.setAttribute).toHaveBeenCalledWith(document.documentElement, 'data-theme', 'light');
  });

  it('should toggle from light to dark mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
    service.loadThemePreference();
    service.toggleDarkMode();
    expect(service.isDarkModeEnabled()).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(rendererMock.setAttribute).toHaveBeenCalledWith(document.documentElement, 'data-theme', 'dark');
  });

  it('should toggle from dark to light mode', () => {
    localStorage.setItem('theme', 'dark');
    service.loadThemePreference();
    service.toggleDarkMode();
    expect(service.isDarkModeEnabled()).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(rendererMock.setAttribute).toHaveBeenCalledWith(document.documentElement, 'data-theme', 'light');
  });

  it('should return correct dark mode status', () => {
    expect(service.isDarkModeEnabled()).toBe(false);
    service.toggleDarkMode();
    expect(service.isDarkModeEnabled()).toBe(true);
  });

  it('should handle multiple toggles correctly', () => {
    service.toggleDarkMode();
    expect(service.isDarkModeEnabled()).toBe(true);
    service.toggleDarkMode();
    expect(service.isDarkModeEnabled()).toBe(false);
    service.toggleDarkMode();
    expect(service.isDarkModeEnabled()).toBe(true);
  });

  it('should save theme preference to localStorage on toggle', () => {
    service.toggleDarkMode();
    expect(localStorage.getItem('theme')).toBe('dark');
    service.toggleDarkMode();
    expect(localStorage.getItem('theme')).toBe('light');
  });

  describe('dark-mode signal (R-PD-006 / D-PD-5)', () => {
    // KZ-015: arrange transitions — initial state first, then mutate and re-assert.

    it('exposes a readonly signal starting at false (no loadThemePreference called yet)', () => {
      expect(service.darkMode()()).toBe(false);
    });

    it('transition: false → true on loadThemePreference() with dark localStorage', () => {
      expect(service.darkMode()()).toBe(false);
      localStorage.setItem('theme', 'dark');
      service.loadThemePreference();
      expect(service.darkMode()()).toBe(true);
    });

    it('transition: false → false on loadThemePreference() with light localStorage', () => {
      expect(service.darkMode()()).toBe(false);
      localStorage.setItem('theme', 'light');
      service.loadThemePreference();
      expect(service.darkMode()()).toBe(false);
    });

    it('transition: false → true on toggleDarkMode() from the initial state', () => {
      expect(service.darkMode()()).toBe(false);
      service.toggleDarkMode();
      expect(service.darkMode()()).toBe(true);
    });

    it('transition: true → false on toggleDarkMode() after enabling dark mode', () => {
      service.toggleDarkMode();
      expect(service.darkMode()()).toBe(true);
      service.toggleDarkMode();
      expect(service.darkMode()()).toBe(false);
    });

    it('isDarkModeEnabled() stays aligned with the signal across transitions', () => {
      expect(service.isDarkModeEnabled()).toBe(service.darkMode()());
      service.toggleDarkMode();
      expect(service.isDarkModeEnabled()).toBe(service.darkMode()());
      service.toggleDarkMode();
      expect(service.isDarkModeEnabled()).toBe(service.darkMode()());
    });

    it('the exposed signal is readonly (no .set on the returned value)', () => {
      const exposed = service.darkMode();
      expect(typeof (exposed as unknown as { set?: unknown }).set).toBe('undefined');
    });
  });
});
