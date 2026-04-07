import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  DrawerComponent,
  MenuComponent,
  ScrollComponent,
  ScrollTopComponent,
  StickyComponent,
  ToggleComponent,
} from '../../_metronic/kt/components';
import { AuthService } from '../auth';

const BODY_CLASSES = ['bgi-size-cover', 'bgi-position-center', 'bgi-no-repeat'];

@Component({
  selector: 'app-errors',
  templateUrl: './errors.component.html',
  styleUrls: ['./errors.component.scss'],
})
export class ErrorsComponent implements OnInit, OnDestroy {
  @HostBinding('class') class = 'd-flex flex-column flex-root';
  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    BODY_CLASSES.forEach((c) => document.body.classList.add(c));
  }

  ngOnDestroy(): void {
    BODY_CLASSES.forEach((c) => document.body.classList.remove(c));
  }

  routeToDashboard() {

    if(this.auth.currentUserValue?.roles?.includes('1')) {
      this.router.navigate(['dashboard']);
    }
    else {
      this.router.navigate(['landing/marketplace']);
    }

    setTimeout(() => {
      ToggleComponent.bootstrap();
      ScrollTopComponent.bootstrap();
      DrawerComponent.bootstrap();
      StickyComponent.bootstrap();
      MenuComponent.bootstrap();
      ScrollComponent.bootstrap();
    }, 200);
  }
}
