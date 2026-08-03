import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Socket } from 'ngx-socket-io';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { ValidateCacheService } from '@shared/services/validate-cache.service';
import AuthComponent from './auth.component';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuthComponent, // Ensure this is imported as a standalone component
        HttpClientTestingModule // Import HttpClientTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map() },
            params: of({}) // Mock route parameters if needed
          }
        },
        {
          provide: Socket,
          useValue: {
            emit: jest.fn(),
            fromEvent: jest.fn().mockReturnValue(of({})),
            on: jest.fn()
          }
        },
        { provide: ValidateCacheService, useValue: { validateVersions: jest.fn().mockResolvedValue(undefined) } },
        { provide: DateFormatConfigService, useValue: { loadConfig: jest.fn().mockResolvedValue(null) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should redirect to home if user is logged in', () => {
      jest.spyOn(router, 'navigate');
      jest.spyOn(component.cache, 'isLoggedIn').mockReturnValue(true);
      component.ngOnInit();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
