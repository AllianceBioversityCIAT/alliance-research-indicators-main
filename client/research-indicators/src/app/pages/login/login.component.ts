import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CognitoService } from '../../shared/services/cognito.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CacheService } from '../../shared/services/cache/cache.service';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-login',
  imports: [RouterLink, S3ImageUrlPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export default class LoginComponent implements OnInit {
  cognito = inject(CognitoService);
  cache = inject(CacheService);
  router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  ngOnInit() {
    if (this.cache.isLoggedIn()) {
      const returnUrl = this.activatedRoute.snapshot.queryParams?.['returnUrl'] as string | undefined;
      this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/');
    }
  }

  redirectToCognito() {
    const returnUrl = this.activatedRoute.snapshot.queryParams?.['returnUrl'] as string | undefined;
    this.cognito.redirectToCognito(returnUrl);
  }
}
