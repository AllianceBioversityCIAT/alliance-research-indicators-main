import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';

import RoomComponent from './room.component';
import { ActivatedRoute } from '@angular/router';
import { WebsocketService } from '../../shared/sockets/websocket.service';
import { environment } from '../../../environments/environment';
import { SocketIoConfig, SocketIoModule, Socket } from 'ngx-socket-io';
import { Subject } from 'rxjs';

const config: SocketIoConfig = { url: environment.webSocketServerUrl, options: {} };

describe('RoomComponent', () => {
  let component: RoomComponent;
  let fixture: ComponentFixture<RoomComponent>;
  let websocketServiceMock: any;
  let socketMock: any;
  let routeMock: any;
  let subscriptionSubject: Subject<any>;

  beforeEach(async () => {
    subscriptionSubject = new Subject();
    
    websocketServiceMock = {
      listen: jest.fn().mockReturnValue(subscriptionSubject.asObservable()),
      platform: 'test-platform',
      currentRoom: {
        set: jest.fn()
      }
    };

    socketMock = {
      emit: jest.fn()
    };

    routeMock = {
      snapshot: {
        paramMap: new Map([['id', 'test-room-123']])
      }
    };

    await TestBed.configureTestingModule({
      imports: [RoomComponent, SocketIoModule.forRoot(config)],
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: WebsocketService, useValue: websocketServiceMock },
        { provide: Socket, useValue: socketMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoomComponent);
    component = fixture.componentInstance;
    
    (component as any).subscriptions = [];
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize roomId from route params and emit join-room', () => {
      component.ngOnInit();

      expect(component.roomId).toBe('test-room-123');
      expect(socketMock.emit).toHaveBeenCalledWith('join-room', 'test-room-123');
    });

    it('should handle null roomId from route params', () => {
      routeMock.snapshot.paramMap = new Map();
      
      component.ngOnInit();

      expect(component.roomId).toBe('');
      expect(socketMock.emit).toHaveBeenCalledWith('join-room', '');
    });

    it('should subscribe to room users and update currentRoom when data received', () => {
      const mockUserList = [
        { id: 'user1', name: 'User 1' },
        { id: 'user2', name: 'User 2' }
      ];

      component.ngOnInit();

      // Simulate receiving user list data
      subscriptionSubject.next(mockUserList);

      expect(websocketServiceMock.listen).toHaveBeenCalledWith('room-users-test-platform');
      expect(websocketServiceMock.currentRoom.set).toHaveBeenCalledWith({
        id: 'test-room-123',
        userList: mockUserList
      });
    });

    it('should handle multiple user list updates', () => {
      const mockUserList1 = [{ id: 'user1', name: 'User 1' }];
      const mockUserList2 = [
        { id: 'user1', name: 'User 1' },
        { id: 'user2', name: 'User 2' }
      ];

      component.ngOnInit();

      subscriptionSubject.next(mockUserList1);
      subscriptionSubject.next(mockUserList2);

      expect(websocketServiceMock.currentRoom.set).toHaveBeenCalledTimes(2);
      expect(websocketServiceMock.currentRoom.set).toHaveBeenNthCalledWith(1, {
        id: 'test-room-123',
        userList: mockUserList1
      });
      expect(websocketServiceMock.currentRoom.set).toHaveBeenNthCalledWith(2, {
        id: 'test-room-123',
        userList: mockUserList2
      });
    });
  });

  describe('cancel', () => {
    it('should emit leave-room and unsubscribe from all subscriptions', () => {
      const mockSubscription1 = { unsubscribe: jest.fn() };
      const mockSubscription2 = { unsubscribe: jest.fn() };
      
      // Initialize component first to set roomId
      component.ngOnInit();
      
      // Add mock subscriptions to the component
      (component as any).subscriptions = [mockSubscription1, mockSubscription2];

      component.cancel();

      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', 'test-room-123');
      expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
      expect(mockSubscription2.unsubscribe).toHaveBeenCalled();
    });

    it('should handle empty subscriptions array', () => {
      component.ngOnInit();
      (component as any).subscriptions = [];

      component.cancel();

      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', 'test-room-123');
    });

    it('should handle subscriptions with undefined unsubscribe method', () => {
      component.ngOnInit();
      const mockSubscription = { unsubscribe: undefined };
      (component as any).subscriptions = [mockSubscription];

      expect(() => component.cancel()).toThrow();
      
      (component as any).subscriptions = [];
    });
  });

  describe('ngOnDestroy', () => {
    it('should emit leave-room and unsubscribe from all subscriptions', () => {
      const mockSubscription1 = { unsubscribe: jest.fn() };
      const mockSubscription2 = { unsubscribe: jest.fn() };
      
      component.ngOnInit();
      (component as any).subscriptions = [mockSubscription1, mockSubscription2];

      component.ngOnDestroy();

      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', 'test-room-123');
      expect(mockSubscription1.unsubscribe).toHaveBeenCalled();
      expect(mockSubscription2.unsubscribe).toHaveBeenCalled();
    });

    it('should handle empty subscriptions array in ngOnDestroy', () => {
      component.ngOnInit();
      (component as any).subscriptions = [];

      component.ngOnDestroy();

      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', 'test-room-123');
    });

    it('should work when roomId is empty', () => {
      component.roomId = '';
      (component as any).subscriptions = [];

      component.ngOnDestroy();

      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', '');
    });
  });

  describe('component lifecycle', () => {
    it('should handle complete lifecycle with subscriptions', () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      (component as any).subscriptions = [mockSubscription];

      component.ngOnInit();
      expect(socketMock.emit).toHaveBeenCalledWith('join-room', 'test-room-123');

      component.cancel();
      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', 'test-room-123');
      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);

      component.ngOnDestroy();
      expect(socketMock.emit).toHaveBeenCalledWith('leave-room', 'test-room-123');
      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });
});
