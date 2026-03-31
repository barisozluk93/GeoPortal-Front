import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationSignalrService {

  private hubConnection!: signalR.HubConnection;

  private notificationSource = new BehaviorSubject<any>(null);
  notification$ = this.notificationSource.asObservable();

  private unreadCountSource = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSource.asObservable();

  startConnection(token: string) {

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalRUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log("SignalR connected"))
      .catch(err => console.log(err));

    this.registerEvents();
  }

  private registerEvents() {

    this.hubConnection.on("notificationReceived", (notification) => {
      this.notificationSource.next(notification);
    });

    this.hubConnection.on("unreadCountChanged", (count) => {
      this.unreadCountSource.next(count);
    });

  }

  stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log("SignalR disconnected"))
        .catch(err => console.log(err));
    }
  }
}