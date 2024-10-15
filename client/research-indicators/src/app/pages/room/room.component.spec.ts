import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';

import RoomComponent from './room.component';
import { ActivatedRoute } from '@angular/router';
import { WebsocketService } from '../../shared/sockets/websocket.service';
import { environment } from '../../../environments/environment';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';

const config: SocketIoConfig = { url: environment.webSocketServerUrl, options: {} };

describe('RoomComponent', () => {
  let component: RoomComponent;
  let fixture: ComponentFixture<RoomComponent>;
  let websocketServiceMock: any;

  beforeEach(async () => {
    websocketServiceMock = {
      listen: jest.fn().mockReturnValue({
        subscribe: jest.fn()
      })
    };

    await TestBed.configureTestingModule({
      imports: [RoomComponent, SocketIoModule.forRoot(config)],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '123']]) } } },
        { provide: WebsocketService, useValue: websocketServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
