import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import LoginComponent from './login.component';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { ValidateCacheService } from '@shared/services/validate-cache.service';

/** CognitoService depends on these; avoid constructing real ValidateCacheService (needs SwUpdate) in tests */
const cognitoHelperServiceStubs = [
  { provide: ValidateCacheService, useValue: { validateVersions: jest.fn().mockResolvedValue(undefined) } },
  { provide: DateFormatConfigService, useValue: { loadConfig: jest.fn().mockResolvedValue(null) } }
];

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [...cognitoHelperServiceStubs]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should not navigate when user is not logged in', () => {
      const navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl');
      jest.spyOn(component.cache, 'isLoggedIn').mockReturnValue(false);
      component.ngOnInit();
      expect(navigateByUrlSpy).not.toHaveBeenCalled();
    });

    it('should redirect to home when user is logged in and no returnUrl', () => {
      jest.spyOn(router, 'navigateByUrl');
      jest.spyOn(component.cache, 'isLoggedIn').mockReturnValue(true);
      component.ngOnInit();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should redirect to returnUrl when user is logged in and returnUrl starts with /', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
        providers: [
          { provide: ActivatedRoute, useValue: { snapshot: { queryParams: { returnUrl: '/projects' } } } },
          ...cognitoHelperServiceStubs
        ]
      }).compileComponents();
      const f = TestBed.createComponent(LoginComponent);
      const comp = f.componentInstance;
      const r = TestBed.inject(Router);
      jest.spyOn(r, 'navigateByUrl');
      jest.spyOn(comp.cache, 'isLoggedIn').mockReturnValue(true);
      comp.ngOnInit();
      expect(r.navigateByUrl).toHaveBeenCalledWith('/projects');
    });

    it('should redirect to home when user is logged in and returnUrl does not start with /', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
        providers: [
          { provide: ActivatedRoute, useValue: { snapshot: { queryParams: { returnUrl: 'http://other.com' } } } },
          ...cognitoHelperServiceStubs
        ]
      }).compileComponents();
      const f = TestBed.createComponent(LoginComponent);
      const comp = f.componentInstance;
      const r = TestBed.inject(Router);
      jest.spyOn(r, 'navigateByUrl');
      jest.spyOn(comp.cache, 'isLoggedIn').mockReturnValue(true);
      comp.ngOnInit();
      expect(r.navigateByUrl).toHaveBeenCalledWith('/');
    });
  });

  describe('redirectToCognito', () => {
    it('should call cognito.redirectToCognito with undefined when no returnUrl', () => {
      const redirectSpy = jest.spyOn(component.cognito, 'redirectToCognito').mockImplementation(() => {});
      component.redirectToCognito();
      expect(redirectSpy).toHaveBeenCalledWith(undefined);
    });

    it('should call cognito.redirectToCognito with returnUrl when present in queryParams', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
        providers: [
          { provide: ActivatedRoute, useValue: { snapshot: { queryParams: { returnUrl: '/results-center' } } } },
          ...cognitoHelperServiceStubs
        ]
      }).compileComponents();
      const f = TestBed.createComponent(LoginComponent);
      const comp = f.componentInstance;
      const redirectSpy = jest.spyOn(comp.cognito, 'redirectToCognito').mockImplementation(() => {});
      comp.redirectToCognito();
      expect(redirectSpy).toHaveBeenCalledWith('/results-center');
    });
  });
});
