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

  getConnectedUsers() {}
  getAlerts() {}
  getNotifications() {}
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
});
