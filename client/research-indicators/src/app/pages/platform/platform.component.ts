import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AllianceNavbarComponent } from '@components/alliance-navbar/alliance-navbar.component';
import { AllianceSidebarComponent } from '@components/alliance-sidebar/alliance-sidebar.component';
import { SectionHeaderComponent } from '@components/section-header/section-header.component';
import { AllModalsComponent } from '../../shared/components/all-modals/all-modals.component';
import { ScrollToTopService } from '@shared/services/scroll-top.service';
import { filter, Subscription } from 'rxjs';
import { CacheService } from '@shared/services/cache/cache.service';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-platform',
  imports: [RouterOutlet, NgStyle, AllianceNavbarComponent, AllianceSidebarComponent, SectionHeaderComponent, AllModalsComponent],
  templateUrl: './platform.component.html',
  styleUrl: './platform.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PlatformComponent implements OnInit, OnDestroy {
  private routerSubscription!: Subscription;
  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollToTopService);
  cache = inject(CacheService);
  public readonly errorState = signal<Error | null>(null);

  ngOnInit(): void {
    this.routerSubscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe({
      next: () => {
        this.scrollService.scrollContentToTop('content');
        this.errorState.set(null); // Reset the error state on successful navigation
      },
      error: (err: Error) => {
        this.errorState.set(err);
        console.error('Error in the router subscription:', err);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription && !this.routerSubscription.closed) {
      this.routerSubscription.unsubscribe();
    }
  }
}
