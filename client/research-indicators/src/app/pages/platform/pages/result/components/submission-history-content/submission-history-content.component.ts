import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { SubmissionHistoryItemComponent } from '../submission-history-item/submission-history-item.component';
import { SubmissionHistoryItem } from '@shared/interfaces/submission-history-item.interface';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-submission-history-content',
  standalone: true,
  imports: [SubmissionHistoryItemComponent, S3ImageUrlPipe],
  templateUrl: './submission-history-content.component.html',
  styleUrl: './submission-history-content.component.scss'
})
export class SubmissionHistoryContentComponent implements OnInit {
  api = inject(ApiService);
  cache = inject(CacheService);
  submissionService = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  historyList = signal<SubmissionHistoryItem[]>([]);

  ngOnInit(): void {
    this.getSubmitionHistory();
  }

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getSubmitionHistory();
    });
  }

  refreshHistoryEffect = effect(() => {
    this.submissionService.refreshSubmissionHistory();
    this.getSubmitionHistory();
  });

  async getSubmitionHistory() {
    const response = await this.api.GET_SubmitionHistory(this.cache.getCurrentNumericResultId());
    this.historyList.set(response.data ? [...response.data] : []);
  }
}
