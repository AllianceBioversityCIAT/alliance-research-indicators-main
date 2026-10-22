// @akili-spec changes/profile-simulation
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SimulationBannerComponent } from './simulation-banner.component';
import { CacheService } from '@services/cache/cache.service';
import { ImpersonationService } from '@services/impersonation.service';
import { ActionsService } from '@services/actions.service';
import { WebsocketService } from '@sockets/websocket.service';
import { UserCache } from '@shared/interfaces/cache.interface';

describe('SimulationBannerComponent', () => {
  let component: SimulationBannerComponent;
  let fixture: ComponentFixture<SimulationBannerComponent>;
  let callLog: string[];

  const targetUser: UserCache = {
    sec_user_id: 55,
    is_active: true,
    first_name: 'Mariana',
    last_name: 'Rojas',
    roleName: 'Contributor',
    email: 'm.rojas@cgiar.org',
    status_id: 1,
    user_role_list: []
  };

  const adminUser: UserCache = {
    sec_user_id: 1,
    is_active: true,
    first_name: 'Ana',
    last_name: 'Sandoval',
    roleName: 'System Admin',
    email: 'a.sandoval@cgiar.org',
    status_id: 1,
    user_role_list: []
  };

  let mockCacheService: {
    dataCache: ReturnType<typeof signal>;
    hasSmallScreen: jest.Mock;
    bumpContentReload: jest.Mock;
  };
  let mockImpersonationService: {
    active: ReturnType<typeof signal>;
    session: ReturnType<typeof signal>;
    actor: ReturnType<typeof signal>;
    end: jest.Mock;
  };
  let mockActionsService: { showToast: jest.Mock };
  let mockWebsocketService: { configUser: jest.Mock };

  beforeEach(async () => {
    callLog = [];

    mockCacheService = {
      dataCache: signal({ user: targetUser }),
      hasSmallScreen: jest.fn(() => false),
      bumpContentReload: jest.fn().mockImplementation(() => callLog.push('bumpContentReload'))
    };

    mockImpersonationService = {
      active: signal(true),
      session: signal({ session_id: 'sess-1', started_at: '2026-08-25T14:32:00.000Z', expires_at: '2026-08-25T18:32:00.000Z' }),
      actor: signal(adminUser),
      end: jest.fn().mockImplementation(async () => {
        callLog.push('end');
        return { actor: adminUser };
      })
    };

    mockActionsService = {
      showToast: jest.fn().mockImplementation(() => callLog.push('toast'))
    };

    mockWebsocketService = {
      configUser: jest.fn().mockImplementation(async () => {
        callLog.push('configUser');
      })
    };

    await TestBed.configureTestingModule({
      imports: [SimulationBannerComponent],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: ImpersonationService, useValue: mockImpersonationService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: WebsocketService, useValue: mockWebsocketService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimulationBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders nothing when no simulation is active', () => {
    // KZ-015: construct in the product's actual initial state (inactive), then assert the negative.
    mockImpersonationService.active.set(false);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.simulation-banner');
    expect(banner).toBeNull();
  });

  it('renders the target identity with role="status" once a simulation becomes active', () => {
    mockImpersonationService.active.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.simulation-banner')).toBeNull();

    mockImpersonationService.active.set(true);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.simulation-banner');
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
    expect(banner.textContent).toContain('Mariana Rojas');
    expect(banner.textContent).toContain('m.rojas@cgiar.org');
    expect(banner.textContent).toContain('Contributor');
    expect(banner.textContent).toContain('Ana Sandoval');
  });

  it('formats the started time as HH:mm from session().started_at', () => {
    fixture.detectChanges();
    expect(component.startedTime()).toMatch(/^\d{2}:32$/);
  });

  it('returns an empty started time when no session is present (no started_at to format)', () => {
    mockImpersonationService.session.set(null);
    fixture.detectChanges();
    expect(component.startedTime()).toBe('');
  });

  it('collapses to the compact "Simulating {name}" variant at windowHeight 700 (hasSmallScreen)', () => {
    mockCacheService.hasSmallScreen.mockReturnValue(true);
    fixture.detectChanges();

    const compact = fixture.nativeElement.querySelector('.simulation-banner__compact');
    expect(compact).not.toBeNull();
    expect(compact.textContent).toContain('Simulating Mariana Rojas');
    expect(fixture.nativeElement.textContent).not.toContain('SIMULATION ACTIVE');
  });

  it('the End simulation button is wired to endSimulation()', () => {
    fixture.detectChanges();
    TestBed.flushEffects();
    const endSpy = jest.spyOn(component, 'endSimulation').mockResolvedValue();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.simulation-banner__end-btn');
    button.click();

    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  it('End simulation runs end -> configUser -> bumpContentReload -> toast, in that order', async () => {
    fixture.detectChanges();
    TestBed.flushEffects();

    await component.endSimulation();

    expect(callLog).toEqual(['end', 'configUser', 'bumpContentReload', 'toast']);
    expect(mockImpersonationService.end).toHaveBeenCalledWith('manual');
    expect(mockWebsocketService.configUser).toHaveBeenCalledWith('Ana', 1);
    expect(mockCacheService.bumpContentReload).toHaveBeenCalledTimes(1);
    expect(mockActionsService.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Simulation ended',
      detail: 'Simulation ended — you are back as Ana'
    });
  });

  it('focuses "End simulation" as the first focusable element once the banner mounts (a11y)', () => {
    fixture.detectChanges();
    TestBed.flushEffects();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.simulation-banner__end-btn');
    expect(document.activeElement).toBe(button);
  });
});

describe('SimulationBannerComponent edge cases', () => {
  const build = (opts: { user?: unknown; actor?: unknown; session?: unknown; websocket?: 'missing-method' | 'throws' | 'ok'; endActor?: unknown }) => {
    const cache = {
      dataCache: signal({ user: opts.user }),
      hasSmallScreen: jest.fn(() => false),
      bumpContentReload: jest.fn()
    };
    const configUser = jest.fn().mockResolvedValue(undefined);
    const impersonation = {
      active: signal(false),
      session: signal(opts.session ?? null),
      actor: signal(opts.actor ?? null),
      end: jest.fn().mockResolvedValue({ actor: opts.endActor ?? null })
    };
    const actions = { showToast: jest.fn() };
    const websocketProvider =
      opts.websocket === 'throws'
        ? {
            provide: WebsocketService,
            useFactory: () => {
              throw new Error('no socket');
            }
          }
        : { provide: WebsocketService, useValue: opts.websocket === 'missing-method' ? {} : { configUser } };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SimulationBannerComponent],
      providers: [
        { provide: CacheService, useValue: cache },
        { provide: ImpersonationService, useValue: impersonation },
        { provide: ActionsService, useValue: actions },
        websocketProvider
      ]
    });
    const fixture = TestBed.createComponent(SimulationBannerComponent);
    return { fixture, component: fixture.componentInstance, cache, impersonation, actions, configUser };
  };

  it('falls back to empty strings when the cached user is missing', () => {
    const { component } = build({ user: undefined });
    expect(component.targetName()).toBe('');
    expect(component.targetEmail()).toBe('');
    expect(component.targetRole()).toBe('');
  });

  it('falls back to empty strings when user fields are missing', () => {
    const { component } = build({ user: {} });
    expect(component.targetName()).toBe('');
    expect(component.targetEmail()).toBe('');
    expect(component.targetRole()).toBe('');
  });

  it('computes the admin name, tolerating missing actor names and no actor', () => {
    const none = build({ user: {} });
    expect(none.component.adminName()).toBe('');
    const partial = build({ user: {}, actor: {} });
    expect(partial.component.adminName()).toBe('');
    const named = build({ user: {}, actor: { first_name: 'Ana', last_name: 'Sandoval' } });
    expect(named.component.adminName()).toBe('Ana Sandoval');
  });

  it('returns an empty started time for an unparseable date', () => {
    const { component } = build({ user: {}, session: { session_id: 's', started_at: 'garbage', expires_at: '' } });
    expect(component.startedTime()).toBe('');
  });

  it('skips configUser when the websocket service lacks it, and falls back to an empty name without an actor', async () => {
    const { component, cache, actions, configUser } = build({ user: {}, websocket: 'missing-method' });
    await component.endSimulation();
    expect(configUser).not.toHaveBeenCalled();
    expect(cache.bumpContentReload).toHaveBeenCalled();
    expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Simulation ended — you are back as ' }));
  });

  it('still ends the simulation when injecting the websocket service throws', async () => {
    const { component, impersonation, actions } = build({ user: {}, websocket: 'throws', endActor: { first_name: 'Ana', sec_user_id: 1 } });
    await component.endSimulation();
    expect(impersonation.end).toHaveBeenCalledWith('manual');
    expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Simulation ended — you are back as Ana' }));
  });

  it('skips configUser when end() returns no actor', async () => {
    const { component, configUser } = build({ user: {}, websocket: 'ok' });
    await component.endSimulation();
    expect(configUser).not.toHaveBeenCalled();
  });
});
