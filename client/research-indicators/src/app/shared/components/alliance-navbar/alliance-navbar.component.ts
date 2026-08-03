/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  NgZone,
  Renderer2,
  ChangeDetectorRef
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';
import { DarkModeService } from '@services/dark-mode.service';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { AllianceNavOptions } from '@interfaces/nav.interface';
import { ActionsService } from '@services/actions.service';
import { AllModalsService } from '@services/cache/all-modals.service';
import { DropdownsCacheService } from '../../services/cache/dropdowns-cache.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { CreateResultManagementService } from '../all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { environment } from '../../../../environments/environment';
import { WhatsNewService } from '@platform/pages/whats-new/services/whats-new.service';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'alliance-navbar',
  imports: [ButtonModule, BadgeModule, ChipModule, RouterLink, RouterLinkActive, AvatarModule, AvatarGroupModule, S3ImageUrlPipe, TooltipModule],
  templateUrl: './alliance-navbar.component.html',
  styleUrl: './alliance-navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllianceNavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navbar') navbarElement!: ElementRef;
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  isProductionEnvironment = environment.production;
  private resizeObserver: ResizeObserver | null = null;
  private readonly zone = inject(NgZone);
  dropdownsCache = inject(DropdownsCacheService);
  allModalsService = inject(AllModalsService);
  cache = inject(CacheService);
  darkModeService = inject(DarkModeService);
  router = inject(Router);
  actions = inject(ActionsService);
  serviceLocator = inject(ServiceLocatorService);
  elementRef = inject(ElementRef);
  service: any;
  private searchDebounceTimeout: any;
  showDropdown = false;
  createResultManagementService = inject(CreateResultManagementService);
  whatsNewService = inject(WhatsNewService);
  private readonly cdr = inject(ChangeDetectorRef);
  private isProjectsOrDetailActiveFlag = false;

  options: AllianceNavOptions[] = [
    { label: 'Home', path: '/home', underConstruction: false },
    { label: 'Projects', path: '/projects', underConstruction: false },
    { label: 'Results Center', path: '/results-center', underConstruction: false, disabled: false },
    { label: 'Results Dashboard', path: '/dashboard', underConstruction: false }
  ];

  isProjectsOrDetailActive(): boolean {
    return this.isProjectsOrDetailActiveFlag;
  }

  constructor(private readonly renderer: Renderer2) {
    effect(() => {
      this.whatsNewService.hasUnreadReleaseNotes();
      this.whatsNewService.notionDataLoading();
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    this.whatsNewService.getWhatsNewPages();
    this.service = this.serviceLocator.getService('openSearchResult');
    const updateActiveFlag = (url: string) => {
      this.isProjectsOrDetailActiveFlag = url.startsWith('/projects') || url.startsWith('/project-detail/');
      this.cdr.markForCheck();
    };
    updateActiveFlag(this.router.url);
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        updateActiveFlag(evt.urlAfterRedirects);
      }
    });
  }

  ngAfterViewInit(): void {
    const navbar = this.elementRef.nativeElement.querySelector('#navbar');
    if (navbar) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          this.cache.navbarHeight.set(entry.contentRect.height);
        }
      });

      this.resizeObserver.observe(navbar);
    }

    this.renderer.listen('document', 'click', (event: Event) => {
      if (!this.showDropdown) return;
      const target = event.target as Node;
      const insideDropdown = this.dropdownRef?.nativeElement?.contains(target);
      const insideToggle = this.elementRef.nativeElement.querySelector('[dropdown-button]')?.contains(target);
      if (!insideDropdown && !insideToggle) {
        this.showDropdown = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onSearchTextChange(event: Event) {
    this.router.navigate(['/search-a-result']);
    this.cache.searchAResultValue.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchDebounceTimeout);
    this.searchDebounceTimeout = setTimeout(async () => {
      await this.service.update(this.cache.searchAResultValue(), 100);
    }, 500);
  }
}
