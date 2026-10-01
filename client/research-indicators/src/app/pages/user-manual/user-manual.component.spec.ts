import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import UserManualComponent from './user-manual.component';
import { MANUAL_MODULES } from './data/manual-modules';

describe('UserManualComponent', () => {
  let component: UserManualComponent;
  let fixture: ComponentFixture<UserManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManualComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists one sidebar entry per registered module', () => {
    const items = fixture.nativeElement.querySelectorAll('.um-sidebar__item');
    expect(items.length).toBe(MANUAL_MODULES.length);
  });

  it('links every module to its own route under /user-manual', () => {
    const hrefs: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.um-sidebar__item'),
      (a: Element) => a.getAttribute('href') ?? ''
    );
    for (const module of MANUAL_MODULES) {
      expect(hrefs).toContain(`/user-manual/${module.slug}`);
    }
  });

  it('marks unfinished modules so a reader is not sent to an empty page unwarned', () => {
    const badges = fixture.nativeElement.querySelectorAll('.um-sidebar__badge');
    const drafts = MANUAL_MODULES.filter(m => m.status === 'draft');
    expect(badges.length).toBe(drafts.length);
  });

  it('opens and closes the narrow-screen menu', () => {
    expect(component.menuOpen()).toBe(false);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);
    component.closeMenu();
    expect(component.menuOpen()).toBe(false);
  });
});
