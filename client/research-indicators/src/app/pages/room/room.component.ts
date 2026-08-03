import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../shared/sockets/websocket.service';
import { SocketUser } from '../../shared/interfaces/sockets.interface';

@Component({
  selector: 'app-room',
  imports: [],
  templateUrl: './room.component.html'
})
export default class RoomComponent implements OnInit, OnDestroy {
  websocket = inject(WebsocketService);

  roomId = '';
  users: string[] = [];
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly socket: Socket
  ) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id') ?? '';
    this.socket.emit('join-room', this.roomId);

    this.websocket.listen(`room-users-${this.websocket.platform}`).subscribe(userList => {
      this.websocket.currentRoom.set({ id: this.roomId, userList: userList as SocketUser[] });
    });
  }

  cancel() {
    this.socket.emit('leave-room', this.roomId);
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnDestroy() {
    this.socket.emit('leave-room', this.roomId);
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
