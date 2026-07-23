import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { NavigationButtonsComponent } from './navigation-buttons.component';

/** Mirrors RESULT_SIDEBAR_WIDTH_PX in navigation-buttons.component.ts */
const RESULT_SIDEBAR_WIDTH_PX = 308;
/** Mirrors CONTENT_RIGHT_OFFSET_PX in navigation-buttons.component.ts */
const CONTENT_RIGHT_OFFSET_PX = 0;

describe('NavigationButtonsComponent', () => {
  let component: NavigationButtonsComponent;
  let fixture: ComponentFixture<NavigationButtonsComponent>;
  let hasSmallScreenSignal: ReturnType<typeof signal<boolean>>;
  let isSidebarCollapsedSignal: ReturnType<typeof signal<boolean>>;
  let isEditableStatus: jest.Mock;

  beforeEach(async () => {
    hasSmallScreenSignal = signal(false);
    isSidebarCollapsedSignal = signal(false);
    isEditableStatus = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [NavigationButtonsComponent],
      providers: [
        {
          provide: CacheService,
          useValue: {
            hasSmallScreen: hasSmallScreenSignal,
            isSidebarCollapsed: isSidebarCollapsedSignal
          }
        },
        { provide: SubmissionService, useValue: { isEditableStatus } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('navLeft', () => {
    it('returns padding 75 + sidebar width when large screen and sidebar collapsed', () => {
      hasSmallScreenSignal.set(false);
      isSidebarCollapsedSignal.set(true);
      fixture.detectChanges();
      expect(component.navLeft()).toBe(75 + RESULT_SIDEBAR_WIDTH_PX);
    });

    it('returns padding 260 + sidebar width when large screen and sidebar expanded', () => {
      hasSmallScreenSignal.set(false);
      isSidebarCollapsedSignal.set(false);
      fixture.detectChanges();
      expect(component.navLeft()).toBe(260 + RESULT_SIDEBAR_WIDTH_PX);
    });

    it('returns padding 64 + sidebar width when small screen and sidebar collapsed', () => {
      hasSmallScreenSignal.set(true);
      isSidebarCollapsedSignal.set(true);
      fixture.detectChanges();
      expect(component.navLeft()).toBe(64 + RESULT_SIDEBAR_WIDTH_PX);
    });

    it('returns padding 250 + sidebar width when small screen and sidebar expanded', () => {
      hasSmallScreenSignal.set(true);
      isSidebarCollapsedSignal.set(false);
      fixture.detectChanges();
      expect(component.navLeft()).toBe(250 + RESULT_SIDEBAR_WIDTH_PX);
    });
  });

  describe('navRight', () => {
    it('returns content right offset', () => {
      expect(component.navRight()).toBe(CONTENT_RIGHT_OFFSET_PX);
    });
  });

  describe('template', () => {
    const buttons = (root: HTMLElement) => Array.from(root.querySelectorAll('button'));

    it('emits back when Back is clicked', () => {
      const spy = jest.spyOn(component.back, 'emit');
      const backBtn = buttons(fixture.nativeElement).find(b => b.textContent?.includes('Back'));
      expect(backBtn).toBeTruthy();
      backBtn!.click();
      expect(spy).toHaveBeenCalled();
    });

    it('emits next when Next is clicked', () => {
      const spy = jest.spyOn(component.next, 'emit');
      const nextBtn = buttons(fixture.nativeElement).find(b => b.textContent?.includes('Next'));
      expect(nextBtn).toBeTruthy();
      nextBtn!.click();
      expect(spy).toHaveBeenCalled();
    });

    it('does not render Back when showBack is false', () => {
      fixture.componentRef.setInput('showBack', false);
      fixture.detectChanges();
      expect(buttons(fixture.nativeElement).some(b => b.textContent?.includes('Back'))).toBe(false);
    });

    it('does not render Next when showNext is false', () => {
      fixture.componentRef.setInput('showNext', false);
      fixture.detectChanges();
      expect(buttons(fixture.nativeElement).some(b => b.textContent?.includes('Next'))).toBe(false);
    });

    it('renders Save and emits save when isEditableStatus is true', () => {
      isEditableStatus.mockReturnValue(true);
      fixture.detectChanges();
      const spy = jest.spyOn(component.save, 'emit');
      const saveBtn = buttons(fixture.nativeElement).find(b => b.textContent?.includes('Save'));
      expect(saveBtn).toBeTruthy();
      saveBtn!.click();
      expect(spy).toHaveBeenCalled();
    });

    it('does not render Save when isEditableStatus is false', () => {
      isEditableStatus.mockReturnValue(false);
      fixture.detectChanges();
      expect(buttons(fixture.nativeElement).some(b => b.textContent?.includes('Save'))).toBe(false);
    });

    it('disables Next when disableNext is true', () => {
      fixture.componentRef.setInput('disableNext', true);
      fixture.detectChanges();
      const nextBtn = buttons(fixture.nativeElement).find(b => b.textContent?.includes('Next'));
      expect(nextBtn?.disabled).toBe(true);
    });

    it('disables Save when disableSave is true', () => {
      isEditableStatus.mockReturnValue(true);
      fixture.componentRef.setInput('disableSave', true);
      fixture.detectChanges();
      const saveBtn = buttons(fixture.nativeElement).find(b => b.textContent?.includes('Save'));
      expect(saveBtn?.disabled).toBe(true);
    });
  });
});
