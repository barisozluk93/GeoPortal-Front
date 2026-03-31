import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { LayoutService } from './core/layout.service';
import { LayoutInitService } from './core/layout-init.service';
import { NavigationCancel, NavigationEnd, Router } from '@angular/router';
import { fromEvent, Subscription } from 'rxjs';
import { AuthService } from 'src/app/modules/auth';
import { environment } from 'src/environments/environment.prod';
import { NotificationSignalrService } from 'src/app/modules/common/signalR.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  // Public variables
  selfLayout = 'default';
  asideSelfDisplay: true;
  asideMenuStatic: true;
  contentClasses = '';
  contentContainerClasses = '';
  toolbarDisplay = true;
  contentExtended: false;
  asideCSSClasses: string;
  asideHTMLAttributes: any = {};
  headerMobileClasses = '';
  headerMobileAttributes = {};
  footerDisplay: boolean;
  footerCSSClasses: string;
  headerCSSClasses: string;
  headerHTMLAttributes: any = {};
  // offcanvases
  extrasSearchOffcanvasDisplay = false;
  extrasNotificationsOffcanvasDisplay = false;
  extrasQuickActionsOffcanvasDisplay = false;
  extrasCartOffcanvasDisplay = false;
  extrasUserOffcanvasDisplay = false;
  extrasQuickPanelDisplay = false;
  extrasScrollTopDisplay = false;
  asideDisplay: boolean = true;
  @ViewChild('ktAside', { static: true }) ktAside: ElementRef;
  @ViewChild('ktHeaderMobile', { static: true }) ktHeaderMobile: ElementRef;
  @ViewChild('ktHeader', { static: true }) ktHeader: ElementRef;

  isMobile: boolean = true;

  private unsubscribe: Subscription[] = [];

  constructor(
    private initService: LayoutInitService,
    private layout: LayoutService,
    private router: Router,
    private notificationService: NotificationSignalrService,
    private authService: AuthService
  ) {
    this.initService.init();

  }

  setMobility(width: number) {
    if(width >= 992) {
      this.asideDisplay = false;
      this.isMobile = false;

      this.asideCSSClasses = "";
    }
    else{
      this.asideDisplay = true;
      this.isMobile = true;

      this.asideCSSClasses = "aside aside-extended drawer-start drawer";
    }
  }

  ngOnInit(): void {

    let resizeObservable$ = fromEvent(window, 'resize')
    let resizeSubscription$ = resizeObservable$.subscribe( evt => {
      this.setMobility((evt.target as typeof window).innerWidth);
    })

    this.setMobility(window.innerWidth);

    // build view by layout config settings
    this.toolbarDisplay = this.layout.getProp('toolbar.display') as boolean;
    this.contentContainerClasses = this.layout.getStringCSSClasses('contentContainer');
    this.headerCSSClasses = this.layout.getStringCSSClasses('header');
    this.headerHTMLAttributes = this.layout.getHTMLAttributes('headerMenu');
    this.footerCSSClasses = this.layout.getStringCSSClasses('footer')

    if(this.authService.currentUserValue) {
      const authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
      const lsValue = localStorage.getItem(authLocalStorageToken);
      const authData = JSON.parse(lsValue!);

      if(authData?.accessToken){
        this.notificationService.startConnection(authData?.accessToken);
      }
    }
    // window.addEventListener("resize", this.onresize(this));
  }

  ngAfterViewInit(): void {
    if (this.ktHeader) {
      for (const key in this.headerHTMLAttributes) {
        if (this.headerHTMLAttributes.hasOwnProperty(key)) {
          this.ktHeader.nativeElement.attributes[key] =
            this.headerHTMLAttributes[key];
        }
      }
    }

    this.routingChanges();
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }

  routingChanges() {
    const routerSubscription = this.router.events.subscribe((event) => {

      this.setMobility(window.innerWidth);
    });

    this.unsubscribe.push(routerSubscription);
  }
}
