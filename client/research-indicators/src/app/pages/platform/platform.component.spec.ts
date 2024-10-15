import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import PlatformComponent from './platform.component';
import { CacheService } from '../../shared/services/cache.service';
import { WebsocketService } from '../../shared/sockets/websocket.service';
import { DarkModeService } from '../../shared/services/dark-mode.service';

import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PlatformComponent', () => {
  let component: PlatformComponent;
  let fixture: ComponentFixture<PlatformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, PlatformComponent],
      schemas: [NO_ERRORS_SCHEMA], // This will ignore unknown elements and attributes
      providers: [
        { provide: CacheService, useValue: { userInfo: () => ({ first_name: 'Test', id: 1 }) } },
        { provide: WebsocketService, useValue: {} },
        {
          provide: DarkModeService,
          useValue: {
            isDarkModeEnabled: () => false,
            toggleDarkMode: () => {}
          }
        }
      ]
    }).compileComponents();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });

    fixture = TestBed.createComponent(PlatformComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
