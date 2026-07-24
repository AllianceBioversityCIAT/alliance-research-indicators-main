import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  Renderer2,
  signal
} from '@angular/core';
import { CacheService } from '@services/cache/cache.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { RolesService } from '@services/cache/roles.service';
import { ActionsService } from '@services/actions.service';
import { AccountSidebarOption, AdministrationNavChild, AdministrationNavGroup } from '@interfaces/administration-nav.interface';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'alliance-sidebar',
  imports: [RouterModule, CommonModule, TooltipModule, S3ImageUrlPipe],
  templateUrl: './alliance-sidebar.component.html',
  styleUrl: './alliance-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllianceSidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  cache = inject(CacheService);
  allModalsService = inject(AllModalsService);
  rolesService = inject(RolesService);
  actions = inject(ActionsService);
  private readonly router = inject(Router);
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);
  private documentClickUnlisten?: () => void;
  private routerEventsSub?: Subscription;

  resourceOptions = [
    { icon: 'pi-file', label: 'About Indicators', link: '/about-indicators', disabled: false },
    { icon: 'pi-exclamation-circle transform scale-y-[-1]', label: 'About the Tool', link: '1', underConstruction: true, hide: true },
    { icon: 'pi-external-link', label: 'Other Reporting Tools', link: '45', underConstruction: true, hide: true }
  ];

  administrationGroups(): AdministrationNavGroup[] {
    const groups: AdministrationNavGroup[] = [];
    if (this.rolesService.canAccessCenterAdmin()) {
      groups.push({
        id: 'center-admin',
        label: 'Center admin',
        icon: 'pi-id-card',
        children: [
          { label: 'Bulk upload', link: '/administration/center-admin/bulk-upload', s3Image: 'images/brain.png' },
          {
            label: 'SDG Management',
            link: '/administration/center-admin/sdg-management',
            icon: 'pi-bullseye',
            iconSize: '13px'
          },
          {
            label: 'Bilateral Mapping',
            link: '/administration/center-admin/bilateral-mapping',
            icon: 'pi-sitemap',
            iconSize: '13px'
          },
          {
            label: 'Portfolio Management',
            link: '/administration/center-admin/portfolio-management',
            icon: 'pi-briefcase',
            iconSize: '13px'
          }
        ]
      });
    }
    if (this.rolesService.canAccessAppConfiguration()) {
      groups.push({
        id: 'system-admin',
        label: 'System admin',
        s3Image: 'icons/graph.svg',
        iconSize: '15.5px',
        children: [
          {
            label: 'Environment variables',
            link: '/administration/configuration/variables',
            icon: 'pi-database',
            iconSize: '13px'
          }
        ]
      });
    }
    return groups;
  }

  administrationGroupExpanded = signal<Record<string, boolean>>({});
  administrationFlyoutGroupId = signal<string | null>(null);

  accountOptions: AccountSidebarOption[] = [
    {
      icon: 'pi-comments',
      label: 'Ask for Help',
      underConstruction: false,
      hide: false,
      action: () => this.allModalsService.openModal('askForHelp')
    },
    {
      icon: 'pi-sign-out',
      label: 'Log out',
      hide: false,
      action: () => void this.actions.logOut(),
      logout: true
    }
  ];

  innerWidth = 0;

  ngOnInit() {
    this.innerWidth = globalThis.innerWidth;

    if ((this.innerWidth <= 1200 || this.cache.hasSmallScreen()) && !this.cache.isSidebarCollapsed()) {
      this.cache.toggleSidebar();
    }

    this.routerEventsSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.cdr.markForCheck());
  }

  toggleSidebarAndResize(): void {
    this.closeAdministrationFlyout();
    this.cache.toggleSidebar();

    setTimeout(() => {
      globalThis.dispatchEvent(new Event('resize'));
    }, 150);
  }

  ngAfterViewInit(): void {
    this.documentClickUnlisten = this.renderer.listen('document', 'click', (event: Event) => {
      const openId = this.administrationFlyoutGroupId();
      if (!openId || !this.cache.isSidebarCollapsed()) return;
      const root = this.hostEl.nativeElement;
      const target = event.target as Node | null;
      if (!target) return;
      const panel = root.querySelector('.admin-center-admin-flyout');
      const insidePanel = panel?.contains(target) ?? false;
      let insideTrigger = false;
      for (const btn of root.querySelectorAll('button.admin-parent--collapsed')) {
        if (btn.contains(target)) insideTrigger = true;
      }
      if (!insidePanel && !insideTrigger) {
        this.administrationFlyoutGroupId.set(null);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.documentClickUnlisten?.();
    this.routerEventsSub?.unsubscribe();
  }

  toggleAdministrationFlyout(groupId: string, event: Event): void {
    if (!this.cache.isSidebarCollapsed()) return;
    event.stopPropagation();
    const cur = this.administrationFlyoutGroupId();
    this.administrationFlyoutGroupId.set(cur === groupId ? null : groupId);
  }

  closeAdministrationFlyout(): void {
    this.administrationFlyoutGroupId.set(null);
    this.cdr.markForCheck();
  }

  private effectiveAdministrationGroupExpanded(groupId: string): boolean {
    const v = this.administrationGroupExpanded()[groupId];
    if (v !== undefined) return v;
    return !this.cache.isSidebarCollapsed();
  }

  toggleAdministrationGroup(groupId: string): void {
    const next = !this.effectiveAdministrationGroupExpanded(groupId);
    this.administrationGroupExpanded.update(prev => ({
      ...prev,
      [groupId]: next
    }));
  }

  isAdministrationGroupExpanded(groupId: string): boolean {
    return this.effectiveAdministrationGroupExpanded(groupId);
  }

  visibleAdministrationChildren(group: AdministrationNavGroup): AdministrationNavChild[] {
    return group.children.filter(c => !c.hide);
  }
}
