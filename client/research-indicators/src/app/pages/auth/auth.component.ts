import { Component, inject, OnInit } from '@angular/core';
import { CognitoService } from '../../shared/services/cognito.service';
import { CacheService } from '../../shared/services/cache/cache.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.component.html'
})
export default class AuthComponent implements OnInit {
  cognito = inject(CognitoService);
  cache = inject(CacheService);
  router = inject(Router);

  ngOnInit(): void {
    if (this.cache.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }

    this.cognito.validateCognitoCode();
  }
}
