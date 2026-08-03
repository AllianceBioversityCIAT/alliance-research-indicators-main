import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotionReleaseNotePage } from '@shared/interfaces/notion-release-note.interface';
import { TooltipModule } from 'primeng/tooltip';
import { WhatsNewService } from '../../../../services/whats-new.service';

@Component({
  selector: 'app-release-note-card',
  imports: [DatePipe, RouterLink, TooltipModule],
  templateUrl: './release-note-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReleaseNoteCardComponent {
  @Input({ required: true }) item!: NotionReleaseNotePage;

  whatsNewService = inject(WhatsNewService);
}
