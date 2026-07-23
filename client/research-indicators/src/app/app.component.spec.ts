import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { WebsocketService } from './shared/sockets/websocket.service';
import { CacheService } from '@services/cache/cache.service';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { of } from 'rxjs';
import { ActionsService } from './shared/services/actions.service';
import { Router, NavigationStart } from '@angular/router';

describe('AppComponent', () => {
  let mockActionsService: Partial<ActionsService>;
  let router: Router;

  beforeEach(async () => {
    const mockSocket = {
      fromEvent: jest.fn().mockReturnValue(of({})),
      emit: jest.fn()
    };

    const mockWebsocketService = {
      runsockets: jest.fn(),
      listen: jest.fn().mockReturnValue(of({}))
    };

    const mockCacheService = {
      dataCache: signal({ access_token: 'mock-token' }),
      isLoggedIn: { set: jest.fn() }
    };

    mockActionsService = {
      isTokenExpired: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: WebsocketService, useValue: mockWebsocketService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: Socket, useValue: mockSocket },
        { provide: ActionsService, useValue: mockActionsService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'research-indicators' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('research-indicators');
  });

  it('should reload on popstate event', () => {
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true
    });
    TestBed.createComponent(AppComponent);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(reloadSpy).toHaveBeenCalled();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: undefined },
      writable: true
    });
  });

  it('should reload on NavigationStart with back_forward', () => {
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true
    });
    TestBed.createComponent(AppComponent);
    const navType = { type: 'back_forward' };
    if (!performance.getEntriesByType) {
      // @ts-ignore
      performance.getEntriesByType = () => [];
    }
    const spy = jest.spyOn(performance, 'getEntriesByType').mockReturnValue([navType as any]);
    (router.events as any).next(new NavigationStart(1, '/test'));
    expect(reloadSpy).toHaveBeenCalled();
    spy.mockRestore();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: undefined },
      writable: true
    });
  });

  it('should NOT reload on NavigationStart with other type', () => {
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true
    });
    TestBed.createComponent(AppComponent);
    const navType = { type: 'navigate' };
    if (!performance.getEntriesByType) {
      // @ts-ignore
      performance.getEntriesByType = () => [];
    }
    const spy = jest.spyOn(performance, 'getEntriesByType').mockReturnValue([navType as any]);
    (router.events as any).next(new NavigationStart(1, '/test'));
    expect(reloadSpy).not.toHaveBeenCalled();
    spy.mockRestore();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: undefined },
      writable: true
    });
  });
});
