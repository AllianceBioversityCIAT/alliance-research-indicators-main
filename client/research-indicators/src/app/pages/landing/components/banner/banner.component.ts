import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-banner',
  imports: [ButtonModule, RouterLink, S3ImageUrlPipe],
  templateUrl: './banner.component.html',
  styleUrl: './banner.component.scss'
})
export class BannerComponent {}
