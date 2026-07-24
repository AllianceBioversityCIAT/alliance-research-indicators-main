import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SectionSidebarComponent } from './section-sidebar.component';
import { Router, NavigationStart } from '@angular/router';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';

describe('SectionSidebarComponent', () => {
  let component: SectionSidebarComponent;
  let fixture: ComponentFixture<SectionSidebarComponent>;
  let mockRouter: jest.Mocked<Router>;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();
    mockRouter = {
      events: routerEventsSubject.asObservable(),
      navigate: jest.fn(),
      navigateByUrl: jest.fn(),
      createUrlTree: jest.fn(),
      serializeUrl: jest.fn(),
      parseUrl: jest.fn(),
      isActive: jest.fn(),
      url: '',
      routerState: {} as any,
      config: [],
      onSameUrlNavigation: 'ignore',
      urlUpdateStrategy: 'deferred',
      routeReuseStrategy: {} as any,
      errorHandler: {} as any,
      malformedUriErrorHandler: {} as any,
      navigated: false,
      events: routerEventsSubject.asObservable()
    } as any;

    await TestBed.configureTestingModule({
      imports: [SectionSidebarComponent, HttpClientTestingModule],
      providers: [{ provide: Router, useValue: mockRouter }]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionSidebarComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.title = 'Test Title';
    component.description = 'Test Description';
    component.showSignal = signal(true);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should subscribe to router events and hide sidebar on NavigationStart', () => {
      const hideSidebarSpy = jest.spyOn(component, 'hideSidebar');

      // Trigger NavigationStart event (lines 28-29)
      routerEventsSubject.next(new NavigationStart(1, '/test'));

      expect(hideSidebarSpy).toHaveBeenCalled();
    });

    it('should not hide sidebar on non-NavigationStart events', () => {
      const hideSidebarSpy = jest.spyOn(component, 'hideSidebar');

      // Trigger a different event
      routerEventsSubject.next({ type: 'other' });

      expect(hideSidebarSpy).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from router subscription when it exists', () => {
      // First trigger ngOnInit to create subscription
      component.ngOnInit();

      // Mock the unsubscribe method
      const unsubscribeSpy = jest.fn();
      (component as any).routerSub = { unsubscribe: unsubscribeSpy };

      // Call ngOnDestroy (lines 43-44)
      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should handle ngOnDestroy when routerSub does not exist', () => {
      // Ensure routerSub is undefined
      (component as any).routerSub = undefined;

      // Should not throw when routerSub is undefined
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('hideSidebar', () => {
    it('should set showSignal to false', () => {
      component.showSignal = signal(true);

      component.hideSidebar();

      expect(component.showSignal()).toBe(false);
    });
  });

  describe('confirmSidebar', () => {
    it('should hide sidebar and emit confirm event', () => {
      const hideSidebarSpy = jest.spyOn(component, 'hideSidebar');
      const confirmSpy = jest.spyOn(component.confirm, 'emit');

      component.confirmSidebar();

      expect(hideSidebarSpy).toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('Input properties', () => {
    it('should have default values', () => {
      expect(component.confirmText).toBe('Confirm');
      expect(component.hideActions).toBe(false);
    });

    it('should accept custom input values', () => {
      component.title = 'Custom Title';
      component.description = 'Custom Description';
      component.confirmText = 'Save';
      component.hideActions = true;

      expect(component.title).toBe('Custom Title');
      expect(component.description).toBe('Custom Description');
      expect(component.confirmText).toBe('Save');
      expect(component.hideActions).toBe(true);
    });
  });

  describe('showSignal input', () => {
    it('should accept custom showSignal', () => {
      const customSignal = signal(false);
      component.showSignal = customSignal;

      expect(component.showSignal).toBe(customSignal);
    });
  });
});
