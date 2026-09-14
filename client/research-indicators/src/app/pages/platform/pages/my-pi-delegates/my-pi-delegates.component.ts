// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-04)
//
// Page shell for My PI Delegates.
// Covers: R-UI-002 AC.1 (By-project default), R-UI-004 (summary counters),
//         NFR-UI-001 (STAR tokens), NFR-UI-002 (non-colour cues), NFR-UI-003 (states).
//
// User-source: sec_user_id from CacheService.dataCache().user — the same source used by
// isMyResult and the assign modal (pattern confirmed in assign-pi-delegate.component.ts).
// On init we call service.loadByUser(uid) which fetches both by-project and by-person
// data in parallel.  If uid is not yet available (unauthenticated edge), we do nothing
// and rely on the loading/empty/error states.

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';
import { PiDelegatesClientService } from './services/pi-delegates.client.service';
import { ByProjectComponent } from './tabs/by-project/by-project.component';
import { ByPersonComponent } from './tabs/by-person/by-person.component';
import { AllModalsService } from '@services/cache/all-modals.service';
import { CacheService } from '@services/cache/cache.service';

@Component({
  selector: 'app-my-pi-delegates',
  standalone: true,
  imports: [CommonModule, TabViewModule, ByProjectComponent, ByPersonComponent],
  templateUrl: './my-pi-delegates.component.html',
  styleUrl: './my-pi-delegates.component.scss'
})
export default class MyPiDelegatesComponent implements OnInit {
  readonly service = inject(PiDelegatesClientService);
  private readonly allModalsService = inject(AllModalsService);
  readonly cache = inject(CacheService);

  // ─── Tab state (R-UI-003 AC.1) ───────────────────────────────────────────────
  // 0 = By-project (default, R-UI-002 AC.1), 1 = By-person
  readonly activeTabIndex = signal<number>(0);

  onTabChange(event: { index: number }): void {
    this.activeTabIndex.set(event.index);
  }

  // ─── Summary counters (R-UI-004) — all derived from the single cache ─────────
  // DO NOT read from a second copy; bind directly to service computed signals.
  readonly totalProjects = computed(() => this.service.totalProjects());
  readonly totalDistinctDelegates = computed(() => this.service.totalDistinctDelegates());
  readonly projectsWithoutDelegateCount = computed(() => this.service.projectsWithoutDelegate().length);

  // ─── State accessors ─────────────────────────────────────────────────────────
  readonly loading = computed(() => this.service.loading());
  readonly error = computed(() => this.service.error());

  // ─── Init ─────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const uid = this.cache.dataCache().user?.sec_user_id;
    if (uid != null) {
      void this.service.loadByUser(Number(uid));
    }
  }

  // ─── Assign/Edit modal wiring (T-UI-07) ──────────────────────────────────────

  /**
   * Opened from By-project tab: pre-select that project + its current delegates.
   * Sets the open-context then opens the modal.
   */
  onAssignFromProject(event: { projectCode: string }): void {
    this.allModalsService.assignPiDelegateContext.set({
      source: 'byProject',
      projectCode: event.projectCode
    });
    this.allModalsService.openModal('assignPiDelegate');
  }

  /**
   * Opened from By-person tab: pre-select that person + their current projects.
   * Sets the open-context then opens the modal.
   */
  onAssignFromPerson(event: { delegateUserId: number }): void {
    this.allModalsService.assignPiDelegateContext.set({
      source: 'byPerson',
      delegateUserId: event.delegateUserId
    });
    this.allModalsService.openModal('assignPiDelegate');
  }
}
