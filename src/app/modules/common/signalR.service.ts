import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/modules/auth';

@Injectable({
  providedIn: 'root'
})
export class NotificationSignalrService {
  private hubConnection?: signalR.HubConnection;
  private isStarting = false;
  private eventsRegistered = false;

  private notificationSource = new Subject<any>();
  public notification$ = this.notificationSource.asObservable();

  private unreadCountSource = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSource.asObservable();

  constructor() {}

  async startConnection(token: string): Promise<void> {

    if (!token) {
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (
      this.hubConnection?.state === signalR.HubConnectionState.Connecting ||
      this.hubConnection?.state === signalR.HubConnectionState.Reconnecting ||
      this.isStarting
    ) {
      return;
    }

    if (!this.hubConnection) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(environment.signalRUrl, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

      this.registerEvents();
    }

    try {
      this.isStarting = true;
      await this.hubConnection.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('SignalR connection error:', err);
    } finally {
      this.isStarting = false;
    }
  }

  private registerEvents(): void {
    if (!this.hubConnection || this.eventsRegistered) {
      return;
    }

    this.hubConnection.on('notificationReceived', (notification) => {
      console.log('notificationReceived', notification);
      this.notificationSource.next(notification);
    });

    this.hubConnection.on('unreadCountChanged', (count) => {
      this.unreadCountSource.next(count);
    });

    this.hubConnection.onclose((error) => {
      console.warn('SignalR closed:', error);
    });

    this.eventsRegistered = true;
  }

  async stopConnection(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
      return;
    }

    await this.hubConnection.stop();
    console.log('SignalR disconnected');
  }

  clearState(): void {
    this.unreadCountSource.next(0);
  }
}