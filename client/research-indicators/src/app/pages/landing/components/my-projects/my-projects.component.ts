import { Component } from '@angular/core';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
    selector: 'app-my-projects',
    imports: [S3ImageUrlPipe],
    templateUrl: './my-projects.component.html',
    styleUrl: './my-projects.component.scss'
})
export class MyProjectsComponent {
}
