import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Router } from '@angular/router';
import { CacheService } from '../services/cache.service';
import { User } from './classes/User';
import { environment } from '../../../environments/environment';
import { SocketUser } from '../interfaces/sockets.interface';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  cache = inject(CacheService);
  socket = inject(Socket);
  router = inject(Router);
  public socketStatus = false;
  public user: User | null = null;

  userList: WritableSignal<SocketUser[]> = signal([]);
  currentRoom: WritableSignal<{ id: string; userList: SocketUser[] }> = signal({ id: '', userList: [] });
  platform = environment.platform;
  constructor() {
    this.runsockets();
  }

  runsockets() {
    this.checkStatus();
    this.getNotifications();
    this.getConnectedUsers();
    this.getAlerts();

    const { first_name, id } = this.cache.userInfo();
    this.configUser(first_name, id);
  }

  checkStatus() {
    this.socket.on('connect', () => {
      this.socketStatus = true;
    });

    this.socket.on('disconnect', () => {
      this.socketStatus = false;
    });
  }

  emit<T>(event: string, payload?: T, callback?: () => void) {
    this.socket.emit(event, payload, callback);
  }

  listen(event: string) {
    return this.socket.fromEvent(event);
  }

  configUser(name: string, userId: number) {
    return new Promise(resolve => {
      this.emit('config-user', { name, userId, platform: this.platform }, () => {
        this.user = new User(name, userId);
        resolve(null);
      });
    });
  }

  logoutWS() {
    this.user = null;
    localStorage.removeItem('user');

    const payload = {
      name: 'nameless'
    };

    this.emit('config-user', payload);
    this.router.navigateByUrl('');
  }

  getUser() {
    return this.user;
  }

  getConnectedUsers() {
    this.listen(`all-connected-users-${this.platform}`).subscribe(resp => {
      this.userList.set(resp as SocketUser[]);
    });
  }

  getAlerts() {
    this.listen(`alert-${this.platform}`).subscribe(msg => {
      alert(msg);
    });
  }

  getNotifications() {
    this.listen('notifications').subscribe(msg => {
      alert(msg);
    });
  }
}
