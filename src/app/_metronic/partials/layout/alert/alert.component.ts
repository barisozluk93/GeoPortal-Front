import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertPayload, AlertService } from './alert.service';

interface AlertViewModel extends AlertPayload {
  isClosing?: boolean;
}

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
})
export class AlertComponent implements OnInit, OnDestroy {
  alerts: AlertViewModel[] = [];

  private sub?: Subscription;
  private timeoutMap = new Map<number, any>();
  private closingTimeoutMap = new Map<number, any>();

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.sub = this.alertService.alerts$.subscribe((data) => {
      this.syncAlerts(data || []);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();

    this.timeoutMap.forEach((timeoutRef) => clearTimeout(timeoutRef));
    this.closingTimeoutMap.forEach((timeoutRef) => clearTimeout(timeoutRef));

    this.timeoutMap.clear();
    this.closingTimeoutMap.clear();
  }

  get alertCount(): number {
    return this.alerts.length;
  }

  getAlertTitleKey(type: string): string {
    switch (type) {
      case 'success':
        return 'ALERT.SUCCESS';
      case 'danger':
      case 'error':
        return 'ALERT.ERROR';
      case 'warning':
        return 'ALERT.WARNING';
      case 'info':
        return 'ALERT.INFO';
      default:
        return 'ALERT.NOTIFICATION';
    }
  }

  trackByAlertId(index: number, item: AlertViewModel): number {
    return item.id;
  }

  close(id: number): void {
    const alert = this.alerts.find((x) => x.id === id);
    if (!alert || alert.isClosing) {
      return;
    }

    alert.isClosing = true;

    const activeTimeout = this.timeoutMap.get(id);
    if (activeTimeout) {
      clearTimeout(activeTimeout);
      this.timeoutMap.delete(id);
    }

    const closeAnimationTimeout = setTimeout(() => {
      this.alertService.removeAlert(id);
      this.closingTimeoutMap.delete(id);
    }, 250);

    this.closingTimeoutMap.set(id, closeAnimationTimeout);
  }

  private syncAlerts(incomingAlerts: AlertPayload[]): void {
    const incomingIds = new Set(incomingAlerts.map((x) => x.id));

    this.alerts = this.alerts.filter((x) => incomingIds.has(x.id));

    incomingAlerts.forEach((incoming) => {
      const existing = this.alerts.find((x) => x.id === incoming.id);

      if (!existing) {
        const newAlert: AlertViewModel = {
          ...incoming,
          isClosing: false,
        };

        this.alerts.push(newAlert);
        this.startAutoClose(newAlert);
      } else {
        existing.type = incoming.type;
        existing.message = incoming.message;
        existing.messageIsTranslateKey = incoming.messageIsTranslateKey;
        existing.messageTranslateParams = incoming.messageTranslateParams;
        existing.duration = incoming.duration;
      }
    });

    this.alerts.sort((a, b) => a.id - b.id);
  }

  private startAutoClose(alert: AlertViewModel): void {
    const duration = alert.duration ?? 3000;

    const timeoutRef = setTimeout(() => {
      this.close(alert.id);
    }, duration);

    this.timeoutMap.set(alert.id, timeoutRef);
  }
}