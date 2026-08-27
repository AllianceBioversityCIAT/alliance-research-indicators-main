// @akili-spec changes/profile-simulation
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
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

  let mockCacheService: { dataCache: ReturnType<typeof signal>; hasSmallScreen: jest.Mock };
  let mockImpersonationService: {
    active: ReturnType<typeof signal>;
    session: ReturnType<typeof signal>;
    actor: ReturnType<typeof signal>;
    end: jest.Mock;
  };
  let mockActionsService: { showToast: jest.Mock };
  let mockWebsocketService: { configUser: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    callLog = [];

    mockCacheService = {
      dataCache: signal({ user: targetUser }),
      hasSmallScreen: jest.fn(() => false)
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

    mockRouter = {
      navigate: jest.fn().mockImplementation(async () => {
        callLog.push('navigate');
        return true;
      })
    };

    await TestBed.configureTestingModule({
      imports: [SimulationBannerComponent],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: ImpersonationService, useValue: mockImpersonationService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: WebsocketService, useValue: mockWebsocketService },
        { provide: Router, useValue: mockRouter }
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

  it('End simulation runs end -> configUser -> navigate -> toast, in that order', async () => {
    fixture.detectChanges();
    TestBed.flushEffects();

    await component.endSimulation();

    expect(callLog).toEqual(['end', 'configUser', 'navigate', 'toast']);
    expect(mockImpersonationService.end).toHaveBeenCalledWith('manual');
    expect(mockWebsocketService.configUser).toHaveBeenCalledWith('Ana', 1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
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
