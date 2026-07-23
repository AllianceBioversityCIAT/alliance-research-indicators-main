import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationEnd, RouterOutlet, ActivatedRoute } from '@angular/router';
import { ScrollToTopService } from '@shared/services/scroll-top.service';
import { Subscription, Subject, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { AllianceNavbarComponent } from '@components/alliance-navbar/alliance-navbar.component';
import { AllianceSidebarComponent } from '@components/alliance-sidebar/alliance-sidebar.component';
import { SectionHeaderComponent } from '@components/section-header/section-header.component';
import { AllModalsComponent } from '../../shared/components/all-modals/all-modals.component';
import PlatformComponent from './platform.component';
import * as mockServices from 'src/app/testing/mock-services.mock';
import { SubmissionService } from '@shared/services/submission.service';
import { WhatsNewService } from '@platform/pages/whats-new/services/whats-new.service';

describe('PlatformComponent', () => {
  let component: PlatformComponent;
  let fixture: ComponentFixture<PlatformComponent>;
  let scrollToTopServiceMock: { scrollContentToTop: jest.Mock };
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    routerEventsSubject = new Subject<any>();
    mockServices.routerMock.events = routerEventsSubject.asObservable();
    scrollToTopServiceMock = {
      scrollContentToTop: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RouterOutlet, AllianceNavbarComponent, AllianceSidebarComponent, SectionHeaderComponent, AllModalsComponent, PlatformComponent],
      providers: [
        { provide: Router, useValue: mockServices.routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: ScrollToTopService, useValue: scrollToTopServiceMock },
        { provide: HttpClient, useValue: mockServices.httpClientMock },
        { provide: ActionsService, useValue: mockServices.actionsServiceMock },
        { provide: ApiService, useValue: mockServices.apiServiceMock },
        { provide: CacheService, useValue: mockServices.cacheServiceMock },
        { provide: SubmissionService, useValue: mockServices.submissionServiceMock },
        { provide: WhatsNewService, useValue: mockServices.whatsNewServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if (component['routerSubscription'] && !component['routerSubscription'].closed) {
      component['routerSubscription'].unsubscribe();
    }
    routerEventsSubject.complete();
    fixture.destroy();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize router subscription on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component['routerSubscription']).toBeTruthy();
  }));

  it('should call scrollContentToTop on NavigationEnd event', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    tick();
    expect(scrollToTopServiceMock.scrollContentToTop).toHaveBeenCalledWith('content');
  }));

  it('should not call scrollContentToTop on other event types', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    routerEventsSubject.next({ type: 'other' });
    tick();
    expect(scrollToTopServiceMock.scrollContentToTop).not.toHaveBeenCalled();
  }));

  it('should unsubscribe from router on component destroy', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const unsubscribeSpy = jest.spyOn(component['routerSubscription'], 'unsubscribe');
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  }));

  it('should handle case when no subscription exists on destroy', () => {
    component['routerSubscription'] = null as unknown as Subscription;
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should handle multiple NavigationEnd events', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    routerEventsSubject.next(new NavigationEnd(1, '/test1', '/test1'));
    routerEventsSubject.next(new NavigationEnd(2, '/test2', '/test2'));
    tick();
    expect(scrollToTopServiceMock.scrollContentToTop).toHaveBeenCalledTimes(2);
  }));

  it('should handle navigation events in order', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const scrollSpy = jest.spyOn(scrollToTopServiceMock, 'scrollContentToTop');

    routerEventsSubject.next(new NavigationEnd(1, '/test1', '/test1'));
    tick();
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    routerEventsSubject.next(new NavigationEnd(2, '/test2', '/test2'));
    tick();
    expect(scrollSpy).toHaveBeenCalledTimes(2);
  }));

  it('should handle error in router subscription and update errorState', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('Test error');

    // Simulate an error in the observable
    mockServices.routerMock.events = throwError(() => testError);
    fixture = TestBed.createComponent(PlatformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(consoleSpy).toHaveBeenCalledWith('Error in the router subscription:', testError);
    expect(component.errorState()).toBe(testError);
    consoleSpy.mockRestore();
  }));

  it('should reset errorState on successful navigation', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // First simulate an error
    const testError = new Error('Test error');
    mockServices.routerMock.events = throwError(() => testError);
    fixture = TestBed.createComponent(PlatformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    expect(component.errorState()).toBe(testError);

    mockServices.routerMock.events = routerEventsSubject.asObservable();
    fixture = TestBed.createComponent(PlatformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
    tick();
    expect(component.errorState()).toBeNull();
  }));

  it('should handle complete in router subscription', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    routerEventsSubject.complete();
    tick();
    expect(component['routerSubscription'].closed).toBeTruthy();
  }));

  it('should handle multiple destroy calls', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.ngOnDestroy();
    expect(() => component.ngOnDestroy()).not.toThrow();
    expect(component['routerSubscription'].closed).toBe(true);
  }));

  it('should handle navigation with different URLs', fakeAsync(() => {
    jest.clearAllMocks();
    fixture.detectChanges();
    tick();
    expect(() => {
      routerEventsSubject.next(new NavigationEnd(1, '/test1', '/test1'));
      routerEventsSubject.next(new NavigationEnd(2, '/test2', '/test2'));
      tick();
    }).not.toThrow();
  }));

  it('should handle navigation with same URL', fakeAsync(() => {
    jest.clearAllMocks();
    fixture.detectChanges();
    tick();
    expect(() => {
      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
      routerEventsSubject.next(new NavigationEnd(2, '/test', '/test'));
      tick();
    }).not.toThrow();
  }));
});
