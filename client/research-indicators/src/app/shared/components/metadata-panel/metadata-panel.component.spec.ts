import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetadataPanelComponent } from './metadata-panel.component';
import { WebsocketService } from '../../sockets/websocket.service';
import { DialogModule } from 'primeng/dialog';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Create a mock WebsocketService
class MockWebsocketService {
  userList = signal([]);
  currentRoom = signal({ id: '', userList: [] });

  getConnectedUsers() {
    return signal([]);
  }
  getAlerts() {
    return signal([]);
  }
  getNotifications() {
    return signal([]);
  }
}

describe('MetadataPanelComponent', () => {
  let component: MetadataPanelComponent;
  let fixture: ComponentFixture<MetadataPanelComponent>;
  let mockWebsocketService: MockWebsocketService;

  beforeEach(async () => {
    mockWebsocketService = new MockWebsocketService();

    await TestBed.configureTestingModule({
      imports: [MetadataPanelComponent, DialogModule, NoopAnimationsModule],
      providers: [{ provide: WebsocketService, useValue: mockWebsocketService }]
    }).compileComponents();

    fixture = TestBed.createComponent(MetadataPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sets websocket to null when the service has no listen() method', () => {
    expect(component.websocket).toBeNull();
  });

  describe('websocket injection', () => {
    const create = (provider: unknown) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [MetadataPanelComponent, NoopAnimationsModule],
        providers: [provider as never]
      });
      return TestBed.createComponent(MetadataPanelComponent).componentInstance;
    };

    it('keeps the websocket service when it exposes listen()', () => {
      const service = { listen: jest.fn() };
      const cmp = create({ provide: WebsocketService, useValue: service });
      expect(cmp.websocket).toBe(service);
    });

    it('sets websocket to null when injection throws', () => {
      const cmp = create({
        provide: WebsocketService,
        useFactory: () => {
          throw new Error('no socket');
        }
      });
      expect(cmp.websocket).toBeNull();
    });
  });
});
