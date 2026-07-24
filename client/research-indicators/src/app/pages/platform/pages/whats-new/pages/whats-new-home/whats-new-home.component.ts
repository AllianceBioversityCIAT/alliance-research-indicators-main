import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import {
  WHATS_NEW_ARCHIVE_FOUR_COLUMNS_MIN_WIDTH,
  WHATS_NEW_LATEST_COMPACT_COUNT,
  WHATS_NEW_LATEST_COUNT
} from '../../constants/whats-new.constants';
import { WhatsNewService } from '../../services/whats-new.service';
import { ReleaseNoteCardComponent } from './components/release-note-card/release-note-card.component';

@Component({
  selector: 'app-whats-new-home',
  imports: [ButtonModule, SkeletonModule, ReleaseNoteCardComponent],
  templateUrl: './whats-new-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class WhatsNewHomeComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  whatsNewService = inject(WhatsNewService);

  ngOnInit(): void {
    this.whatsNewService.ensureHomeReleaseNotesLoaded();
    this.bindLatestVisibleCount();
  }

  loadMoreArchive(): void {
    this.whatsNewService.loadMoreArchive();
  }

  private bindLatestVisibleCount(): void {
    const mediaQuery = globalThis.matchMedia(`(min-width: ${WHATS_NEW_ARCHIVE_FOUR_COLUMNS_MIN_WIDTH})`);
    const sync = () => {
      this.whatsNewService.setLatestVisibleCount(
        mediaQuery.matches ? WHATS_NEW_LATEST_COUNT : WHATS_NEW_LATEST_COMPACT_COUNT
      );
      this.cdr.markForCheck();
    };

    sync();
    mediaQuery.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', sync));
  }
}
