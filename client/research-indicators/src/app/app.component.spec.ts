import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { WebsocketService } from './shared/sockets/websocket.service';
import { CacheService } from '@services/cache/cache.service';
import { ImpersonationService } from '@services/impersonation.service';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { of } from 'rxjs';
import { ActionsService } from './shared/services/actions.service';
import { Router, NavigationStart } from '@angular/router';

describe('AppComponent', () => {
  let mockActionsService: Partial<ActionsService>;
  let mockImpersonationService: { restore: jest.Mock };
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

    mockImpersonationService = {
      restore: jest.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: WebsocketService, useValue: mockWebsocketService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: Socket, useValue: mockSocket },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: ImpersonationService, useValue: mockImpersonationService }
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

  // Design §5 "Client restore" — bootstrap calls `impersonation.restore()` when the stored
  // key exists, without blocking rendering.
  describe('impersonation restore at bootstrap (design §5 "Client restore")', () => {
    afterEach(() => {
      localStorage.removeItem('impersonation');
    });

    it('calls impersonation.restore() when localStorage["impersonation"] exists', () => {
      localStorage.setItem('impersonation', JSON.stringify({ session: { session_id: 's1' }, actor: {} }));

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      expect(app).toBeTruthy();
      expect(mockImpersonationService.restore).toHaveBeenCalledTimes(1);
    });

    it('does NOT call impersonation.restore() when no stored key exists', () => {
      localStorage.removeItem('impersonation');

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;

      expect(app).toBeTruthy();
      expect(mockImpersonationService.restore).not.toHaveBeenCalled();
    });

    // Leader-adopted item 3: a rejected restore() must not surface as an unhandled
    // promise rejection — it is caught and logged.
    it('logs (does not throw) when impersonation.restore() rejects', async () => {
      localStorage.setItem('impersonation', JSON.stringify({ session: { session_id: 's1' }, actor: {} }));
      mockImpersonationService.restore.mockRejectedValueOnce(new Error('restore failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();

      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restore impersonation session'),
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
