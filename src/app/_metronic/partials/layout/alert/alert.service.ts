import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AlertPayload {
  type: string;
  message: string;
  messageIsTranslateKey?: boolean;
  messageTranslateParams?: any;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private _alert$ = new BehaviorSubject<AlertPayload | undefined>(undefined);
  public alert$ = this._alert$.asObservable();

  constructor() {}

  clearAlert() {
    this._alert$.next(undefined);
  }

  createAlert(
    type: string,
    message: string,
    messageIsTranslateKey: boolean = false,
    messageTranslateParams: any = {}
  ) {
    console.log(message)
    this._alert$.next({
      type,
      message,
      messageIsTranslateKey,
      messageTranslateParams,
    });
  }

  getAlert() {
    return this._alert$.value;
  }
}