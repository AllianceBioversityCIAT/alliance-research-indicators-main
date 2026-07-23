/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { WhatsNewService } from '../../services/whats-new.service';
import { DynamicNotionBlockComponent } from '@shared/components/dynamic-notion-block/dynamic-notion-block.component';

@Component({
  selector: 'app-whats-new-details',
  imports: [SkeletonModule, TooltipModule, DatePipe, DynamicNotionBlockComponent],
  templateUrl: './whats-new-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class WhatsNewDetailsComponent implements OnInit, OnDestroy {
  whatsNewService = inject(WhatsNewService);

  private paramsSubscription?: Subscription;
  private readonly route = inject(ActivatedRoute);

  notionPageId = signal('');

  ngOnInit(): void {
    this.paramsSubscription = this.route.params.subscribe(params => {
      const newId = params['id'];
      this.notionPageId.set(newId);
      if (newId) {
        this.whatsNewService.getNotionBlockChildren(newId);
      }
    });
  }

  ngOnDestroy(): void {
    this.paramsSubscription?.unsubscribe();
  }

  getAuthorDisplayNames(headerInfo: any): string {
    const developers = headerInfo?.properties?.['Developers']?.people ?? [];
    if (developers.length) {
      return developers
        .map((person: { name?: string }) => person.name)
        .filter(Boolean)
        .join(' · ');
    }
    return headerInfo?.properties?.['Added by']?.created_by?.name ?? '';
  }

  getConsecutiveNumberedItems(startIndex: number): any[] {
    const blocks = this.whatsNewService.activeNotionPageData()?.blocks || [];
    const consecutiveItems = [];
    let currentIndex = startIndex;

    while (currentIndex < blocks.length && blocks[currentIndex].type === 'numbered_list_item') {
      consecutiveItems.push(blocks[currentIndex]);
      currentIndex++;
    }

    return consecutiveItems;
  }
}
