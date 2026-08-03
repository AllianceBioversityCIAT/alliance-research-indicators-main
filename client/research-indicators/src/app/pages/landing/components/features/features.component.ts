import { Component } from '@angular/core';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
    selector: 'app-features',
    imports: [S3ImageUrlPipe],
    templateUrl: './features.component.html',
    styleUrl: './features.component.scss'
})
export class FeaturesComponent {}
