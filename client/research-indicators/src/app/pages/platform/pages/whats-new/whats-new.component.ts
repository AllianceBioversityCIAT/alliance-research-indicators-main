import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WhatsNewService } from './services/whats-new.service';

@Component({
  selector: 'app-whats-new',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class WhatsNewComponent implements OnInit {
  private readonly whatsNewService = inject(WhatsNewService);

  ngOnInit(): void {
    this.whatsNewService.markWhatsNewAsSeen();
  }
}
