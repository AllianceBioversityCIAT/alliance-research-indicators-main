import { Component } from '@angular/core';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-footer',
  imports: [S3ImageUrlPipe],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  legalTermsUrl = 'https://cgiar-prms.notion.site/Legal-terms-1eef2712247880d7a703d082a65108af?pvs=4';
  licenseUrl = 'https://github.com/AllianceBioversityCIAT/alliance-research-indicators-main/blob/main/LICENSE';
  supportUrl = 'alliance-itsupport@cgiar.org';
}
