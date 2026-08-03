import { Component, inject, OnInit, signal } from '@angular/core';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { ApiService } from '@shared/services/api.service';
import { GetAnnouncementSettingAvailable } from '../../../../../../shared/interfaces/get-announcement-setting-available.interface';

@Component({
  selector: 'app-header',
  imports: [S3ImageUrlPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  api = inject(ApiService);
  message = signal<GetAnnouncementSettingAvailable | null>(null);

  ngOnInit() {
    void this.main();
  }

  async main() {
    try {
      const response = await this.api.GET_AnnouncementSettingAvailable();
      const [message] = response.data;
      this.message.set(message);
    } catch (error) {
      console.error(error);
    }
  }
}
