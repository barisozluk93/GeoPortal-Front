import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { environment } from './../../../../../../environments/environment';

import { Tab, tabs } from '../tabs';
import { NavigationCancel, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  MenuComponent,
  DrawerComponent,
  ToggleComponent,
  ScrollComponent,
} from '../../../../kt/components';

@Component({
  selector: 'app-tabs-aside-inner',
  templateUrl: './tabs-aside-inner.component.html',
  styleUrls: ['./tabs-aside-inner.component.scss'],
})
export class TabsAsideInnerComponent implements OnInit, OnDestroy {
  @Input() isAdmin!: boolean;
  @Input() activeTab: Tab = tabs[0];

  appDocsUrl: string = environment.appPreviewDocsUrl;

  @ViewChild('ktTabsAsideScroll', { static: true })
  ktTabsAsideScroll!: ElementRef<HTMLDivElement>;

  private unsubscribe: Subscription[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.routingChanges();
  }

  routingChanges(): void {
    const routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd || event instanceof NavigationCancel) {
        this.menuReinitialization();
      }
    });

    this.unsubscribe.push(routerSubscription);
  }

  menuReinitialization(): void {
    setTimeout(() => {
      MenuComponent.reinitialization();
      DrawerComponent.reinitialization();
      ToggleComponent.reinitialization();
      ScrollComponent.reinitialization();

      if (this.ktTabsAsideScroll?.nativeElement) {
        this.ktTabsAsideScroll.nativeElement.scrollTop = 0;
      }
    }, 50);
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}