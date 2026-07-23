import { ComponentFixture, TestBed } from '@angular/core/testing';
import HomeComponent from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    });

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: class {
        observe() {
          /* noop */
        }
        disconnect() {
          /* noop */
        }
      }
    });

    await TestBed.configureTestingModule({
      imports: [HomeComponent]
    })
      .overrideComponent(HomeComponent, {
        set: {
          template: '<div #homeMain class="home-main"></div>'
        }
      })
      .compileComponents();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createComponent() {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    createComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('returns early when homeMain is not available', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HomeComponent]
    })
      .overrideComponent(HomeComponent, {
        set: {
          template: '<div class="home-main"></div>'
        }
      })
      .compileComponents();

    const matchMediaMock = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    });
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock
    });

    createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(matchMediaMock).not.toHaveBeenCalled();
  });

  it('updates and clears sidebar max height based on media query and teardown', async () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const mq = {
      matches: true,
      addEventListener,
      removeEventListener
    } as unknown as MediaQueryList;
    const matchMediaMock = jest.fn().mockReturnValue(mq);
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock
    });

    let resizeObserverCallback: (() => void) | undefined;
    const observe = jest.fn();
    const disconnect = jest.fn();
    class ResizeObserverMock {
      constructor(callback: () => void) {
        resizeObserverCallback = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    const originalResizeObserver = globalThis.ResizeObserver;
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverMock
    });

    const rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    let currentHeight = 220;
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => currentHeight);

    let changeHandler: (() => void) | undefined;
    addEventListener.mockImplementation((event: string, handler: () => void) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    createComponent();
    fixture.detectChanges();
    await fixture.whenStable();
    const mainEl = fixture.nativeElement.querySelector('.home-main') as HTMLElement;

    expect(matchMediaMock).toHaveBeenCalledWith('(min-width: 1251px)');
    expect(observe).toHaveBeenCalledWith(mainEl);
    expect(component.sidebarMaxHeightCss()).toBe('220px');
    expect(rafSpy).toHaveBeenCalledTimes(2);

    // Covers branch h < 1: do not overwrite current value.
    currentHeight = 0;
    mq.matches = true;
    changeHandler?.();
    resizeObserverCallback?.();
    expect(component.sidebarMaxHeightCss()).toBe('220px');

    // Covers branch !mq.matches: clear to null.
    mq.matches = false;
    changeHandler?.();
    expect(component.sidebarMaxHeightCss()).toBeNull();

    fixture.destroy();
    expect(disconnect).toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: originalResizeObserver
    });
  });
});
