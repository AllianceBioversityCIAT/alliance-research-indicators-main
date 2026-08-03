import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IndicatorsTabFilterComponent } from './indicators-tab-filter.component';
import { ElementRef } from '@angular/core';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';

// Mock ResizeObserver
class ResizeObserverMock {
  static lastInstance: any;
  private callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
    ResizeObserverMock.lastInstance = this;
  }
  observe(_target: Element) {}
  unobserve(_target: Element) {}
  disconnect() {}
  trigger() { this.callback([] as any, this as any); }
}

describe('IndicatorsTabFilterComponent', () => {
  let component: IndicatorsTabFilterComponent;
  let fixture: ComponentFixture<IndicatorsTabFilterComponent>;

  beforeEach(async () => {
    // Add ResizeObserver to the global object
    (global as any).ResizeObserver = ResizeObserverMock as any;

    await TestBed.configureTestingModule({
      imports: [IndicatorsTabFilterComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorsTabFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngAfterViewInit should wire ResizeObserver and call updateArrowVisibility on trigger', () => {
    const container = document.createElement('div');
    container.className = 'filters-content';
    (component as any).filtersContainer = new ElementRef(container);
    const spy = jest.spyOn(component, 'updateArrowVisibility');
    component.ngAfterViewInit();
    expect(ResizeObserverMock.lastInstance).toBeDefined();
    (ResizeObserverMock.lastInstance as any).trigger();
    expect(spy).toHaveBeenCalled();
  });

  it('should observe #section-sidebar and set tableFiltersSidebarHeight', () => {
    const section = document.createElement('div');
    jest.spyOn(section, 'getBoundingClientRect').mockReturnValue({ height: 123 } as any);
    (component as any).elementRef = { nativeElement: { querySelector: jest.fn().mockReturnValue(section) } } as any;
    const cacheMock = TestBed.inject(CacheService) as any;
    cacheMock.tableFiltersSidebarHeight = { set: jest.fn() };

    component.ngAfterViewInit();
    (ResizeObserverMock.lastInstance as any).trigger();
    expect(cacheMock.tableFiltersSidebarHeight.set).toHaveBeenCalledWith(123);
  });

  it('ngAfterViewInit should wire both filtersContainer and section-sidebar when both exist', () => {
    const container = document.createElement('div');
    (component as any).filtersContainer = new ElementRef(container);
    const section = document.createElement('div');
    jest.spyOn(section, 'getBoundingClientRect').mockReturnValue({ height: 200 } as any);
    (component as any).elementRef = { nativeElement: { querySelector: jest.fn().mockReturnValue(section) } } as any;
    const cacheMock = TestBed.inject(CacheService) as any;
    cacheMock.tableFiltersSidebarHeight = { set: jest.fn() };

    component.ngAfterViewInit();
    (ResizeObserverMock.lastInstance as any).trigger();
    expect(cacheMock.tableFiltersSidebarHeight.set).toHaveBeenCalledWith(200);
  });

  it('fallback path without ResizeObserver should add/remove resize listener and call updateArrowVisibility', () => {
    // simulate absence of ResizeObserver
    (global as any).ResizeObserver = undefined;
    const container = document.createElement('div');
    (component as any).filtersContainer = new ElementRef(container);
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const updateSpy = jest.spyOn(component, 'updateArrowVisibility');

    component.ngAfterViewInit();
    const resizeAdd = addSpy.mock.calls.find(c => c[0] === 'resize');
    expect(resizeAdd).toBeDefined();
    const resizeHandler = resizeAdd![1];

    window.dispatchEvent(new Event('resize'));
    expect(updateSpy).toHaveBeenCalled();

    component.ngOnDestroy();
    expect(removeSpy).toHaveBeenCalledWith('resize', resizeHandler);

    // restore
    (global as any).ResizeObserver = ResizeObserverMock as any;
  });

  it('updateArrowVisibility should hide arrows when no horizontal scroll', () => {
    const container = document.createElement('div');
    Object.defineProperties(container, {
      scrollWidth: { value: 100, configurable: true },
      clientWidth: { value: 100, configurable: true },
      scrollLeft: { value: 0, writable: true }
    });
    (component as any).filtersContainer = new ElementRef(container);
    component.updateArrowVisibility();
    expect(component.showLeftArrow()).toBe(false);
    expect(component.showRightArrow()).toBe(false);
  });

  it('updateArrowVisibility should toggle left/right based on scrollLeft', () => {
    const container = document.createElement('div');
    let _scrollLeft = 0;
    Object.defineProperties(container, {
      scrollWidth: { value: 300, configurable: true },
      clientWidth: { value: 100, configurable: true },
      scrollLeft: { get: () => _scrollLeft, set: (v: number) => { _scrollLeft = v; }, configurable: true }
    });
    (component as any).filtersContainer = new ElementRef(container);

    component.updateArrowVisibility();
    expect(component.showLeftArrow()).toBe(false);
    expect(component.showRightArrow()).toBe(true);

    _scrollLeft = 50;
    component.updateArrowVisibility();
    expect(component.showLeftArrow()).toBe(true);
    expect(component.showRightArrow()).toBe(true);

    _scrollLeft = 200;
    component.updateArrowVisibility();
    expect(component.showLeftArrow()).toBe(true);
    expect(component.showRightArrow()).toBe(false);
  });

  it('scrollLeft and scrollRight should adjust container scrollLeft', () => {
    const container: any = document.createElement('div');
    container.scrollLeft = 200;
    (component as any).filtersContainer = new ElementRef(container);
    component.scrollLeft();
    expect(container.scrollLeft).toBe(0);
    component.scrollRight();
    expect(container.scrollLeft).toBe(200);
  });

  it('ngAfterViewInit should skip scroll/ResizeObserver when filtersContainer is null', () => {
    (component as any).filtersContainer = null;
    (component as any).elementRef = { nativeElement: { querySelector: jest.fn().mockReturnValue(null) } };
    expect(() => component.ngAfterViewInit()).not.toThrow();
  });

  it('scrollLeft and scrollRight should no-op when filtersContainer is null', () => {
    (component as any).filtersContainer = null;
    expect(() => component.scrollLeft()).not.toThrow();
    expect(() => component.scrollRight()).not.toThrow();
  });

  it('ngOnDestroy should disconnect ResizeObserver when it was set', () => {
    const container = document.createElement('div');
    (component as any).filtersContainer = new ElementRef(container);
    component.ngAfterViewInit();
    const disconnectSpy = jest.spyOn(ResizeObserverMock.lastInstance as any, 'disconnect');
    component.ngOnDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('scroll event on container should call updateArrowVisibility', () => {
    const container = document.createElement('div');
    (component as any).filtersContainer = new ElementRef(container);
    const updateSpy = jest.spyOn(component, 'updateArrowVisibility');
    component.ngAfterViewInit();
    updateSpy.mockClear();
    container.dispatchEvent(new Event('scroll'));
    expect(updateSpy).toHaveBeenCalled();
  });
