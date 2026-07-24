import { Component, EventEmitter, Input, Output, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CacheService } from '../../services/cache/cache.service';
import { ButtonModule } from 'primeng/button';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-section-sidebar',
    imports: [ButtonModule],
    templateUrl: './section-sidebar.component.html',
    styleUrl: './section-sidebar.component.scss'
})
export class SectionSidebarComponent implements OnInit, OnDestroy {
  private routerSub!: Subscription;
  cache = inject(CacheService);
  router = inject(Router);

  @Input() title!: string;
  @Input() description!: string;
  @Input() showSignal = signal(false);
  @Input() confirmText = 'Confirm';
  @Output() confirm = new EventEmitter<void>();
  @Input() hideActions = false;
  @Input() subtractExtraOffset = false;
  @Input() customHeight?: string;
  @Input() customTopOffset?: string;
  @Input() customBottomOffset?: string;

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.hideSidebar();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  hideSidebar = () => this.showSignal.set(false);

  confirmSidebar(): void {
    this.hideSidebar();
    this.confirm.emit();
  }
}