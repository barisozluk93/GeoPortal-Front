import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertService } from './alert.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
})
export class AlertComponent implements OnInit, OnDestroy {
  show: boolean = false;
  type: string = '';
  message: string = '';
  messageIsTranslateKey: boolean = false;
  messageTranslateParams: any = {};
  private sub?: Subscription;
  private timeoutRef?: any;

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.sub = this.alertService.alert$?.subscribe((data) => {
      if (data) {
        this.alert(
          data.type,
          data.message,
          data.messageIsTranslateKey,
          data.messageTranslateParams
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();

    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
  }

  get alertTitleKey(): string {
    switch (this.type) {
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

  alert(
    type: string,
    message: string,
    messageIsTranslateKey: boolean = false,
    messageTranslateParams: any = {}
  ) {
    console.log("girdim");
    
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }

    this.show = true;
    this.type = type;
    this.message = message;
    this.messageIsTranslateKey = messageIsTranslateKey;
    this.messageTranslateParams = messageTranslateParams || {};

    this.timeoutRef = setTimeout(() => {
      this.close();
    }, 3000);
  }

  close() {
    this.show = false;
    this.type = '';
    this.message = '';
    this.messageIsTranslateKey = false;
    this.messageTranslateParams = {};
    this.alertService.clearAlert();
  }
}