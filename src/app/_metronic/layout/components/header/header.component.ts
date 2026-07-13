import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../core/layout.service';
import { MenuComponent } from '../../../kt/components';
import { AuthService } from 'src/app/modules/auth';
import { RoleEnum } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerContainerCssClasses: string = '';
  isScrolled: boolean = false;

  @ViewChild('ktPageTitle', { static: true }) ktPageTitle!: ElementRef;

  isAdmin: boolean = false;

  @Input() isUserLoggedIn: boolean = false;
  @Input() isMobile: boolean = false;

  private unsubscribe: Subscription[] = [];

  constructor(
    private layout: LayoutService,
    private router: Router,
    private auth: AuthService
  ) {
    this.routingChanges();
  }

  ngOnInit(): void {
    this.isAdmin = this.auth.currentUserValue?.roles.includes(
      RoleEnum.SuperAdmin
    )
      ? true
      : false;

    this.headerContainerCssClasses =
      this.layout.getStringCSSClasses('headerContainer');

    this.checkScrolled();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.checkScrolled();
  }

  private checkScrolled(): void {
    this.isScrolled = window.scrollY > 8;
  }

  routingChanges(): void {
    const routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd || event instanceof NavigationCancel) {
        MenuComponent.reinitialization();
      }
    });

    this.unsubscribe.push(routerSubscription);
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((subscription) => subscription.unsubscribe());
  }

  onBrandClick(): void {
    if (this.isAdmin) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.router.navigate(['/landing/map']);
  }
}