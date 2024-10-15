import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllianceNavbarComponent } from './alliance-navbar.component';
import { DynamicToastService } from '../../services/dynamic-toast.service';
import { CacheService } from '../../services/cache.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AllianceNavbarComponent', () => {
  let component: AllianceNavbarComponent;
  let fixture: ComponentFixture<AllianceNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllianceNavbarComponent, RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: DynamicToastService,
          useValue: {
            // Add any methods you use from DynamicToastService
          }
        },
        {
          provide: CacheService,
          useValue: {
            isLoggedIn: { set: jest.fn() }
          }
        },
        {
          provide: DarkModeService,
          useValue: {
            isDarkModeEnabled: () => false,
            toggleDarkMode: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllianceNavbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
