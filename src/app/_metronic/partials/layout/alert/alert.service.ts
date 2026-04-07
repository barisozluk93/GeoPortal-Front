import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AlertPayload {
  id: number;
  type: string;
  message: string;
  messageIsTranslateKey?: boolean;
  messageTranslateParams?: any;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private _alerts$ = new BehaviorSubject<AlertPayload[]>([]);
  public alerts$ = this._alerts$.asObservable();

  private idCounter = 0;
  private readonly maxVisibleAlerts = 4;
  private readonly duplicateBlockMs = 2000;

  private recentMessages = new Map<string, number>();

  constructor() {}

  createAlert(
    type: string,
    message: string,
    messageIsTranslateKey: boolean = false,
    messageTranslateParams: any = {},
    duration: number = 3000
  ) {
    if (!message?.trim()) {
      return;
    }

    const duplicateKey = this.buildDuplicateKey(
      type,
      message,
      messageIsTranslateKey,
      messageTranslateParams
    );

    const now = Date.now();
    const lastShownAt = this.recentMessages.get(duplicateKey);

    if (lastShownAt && now - lastShownAt < this.duplicateBlockMs) {
      return;
    }

    this.recentMessages.set(duplicateKey, now);
    this.cleanupRecentMessages(now);

    const currentAlerts = this._alerts$.value;

    const newAlert: AlertPayload = {
      id: ++this.idCounter,
      type,
      message,
      messageIsTranslateKey,
      messageTranslateParams,
      duration,
    };

    let nextAlerts = [...currentAlerts, newAlert];

    if (nextAlerts.length > this.maxVisibleAlerts) {
      nextAlerts = nextAlerts.slice(nextAlerts.length - this.maxVisibleAlerts);
    }

    this._alerts$.next(nextAlerts);
  }

  removeAlert(id: number) {
    const currentAlerts = this._alerts$.value;
    const nextAlerts = currentAlerts.filter((x) => x.id !== id);
    this._alerts$.next(nextAlerts);
  }

  clearAlerts() {
    this._alerts$.next([]);
  }

  getAlerts() {
    return this._alerts$.value;
  }

  private buildDuplicateKey(
    type: string,
    message: string,
    messageIsTranslateKey: boolean,
    messageTranslateParams: any
  ): string {
    return JSON.stringify({
      type,
      message,
      messageIsTranslateKey,
      messageTranslateParams: messageTranslateParams || {},
    });
  }

  private cleanupRecentMessages(now: number) {
    for (const [key, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > this.duplicateBlockMs) {
        this.recentMessages.delete(key);
      }
    }
  }
}