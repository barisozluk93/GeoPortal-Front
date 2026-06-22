import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  DrawerComponent,
  MenuComponent,
  ScrollComponent,
  ToggleComponent,
} from 'src/app/_metronic/kt/components';
import { environment } from '../../../../../../../environments/environment';
import { AuthService } from 'src/app/modules/auth';
import { MenuModel } from 'src/app/models/menu.model';
import { RoleEnum } from 'src/app/enums/role.enum';

type HeaderMenuModel = MenuModel & {
  open?: boolean;
  childMenus?: HeaderMenuModel[];
};


const menuList: HeaderMenuModel[] = [
  {
    id: 1,
    name: 'Dashboard',
    nameEn: 'Dashboard',
    url: '/dashboard',
    icon: undefined,
    permissionId: 41,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: undefined,
    open: false,
  },
  {
    id: 2,
    name: 'Kullanıcı Yönetimi',
    nameEn: 'User Management',
    url: undefined,
    icon: undefined,
    permissionId: undefined,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    isForbid: undefined,
    open: false,
    childMenus: [
      {
        id: 3,
        name: 'Yetkiler',
        nameEn: 'Permissions',
        url: '/usermanagement/permissions',
        icon: undefined,
        permissionId: 1,
        isDeleted: false,
        isSystemData: true,
        parentId: 2,
        parent: undefined,
        childMenus: [],
        isForbid: undefined,
        open: false,
      },
      {
        id: 4,
        name: 'Roller',
        nameEn: 'Roles',
        url: '/usermanagement/roles',
        icon: undefined,
        permissionId: 7,
        isDeleted: false,
        isSystemData: true,
        parentId: 2,
        parent: undefined,
        childMenus: [],
        isForbid: undefined,
        open: false,
      },
      {
        id: 5,
        name: 'Kullanıcılar',
        nameEn: 'Users',
        url: '/usermanagement/users',
        icon: undefined,
        permissionId: 13,
        isDeleted: false,
        isSystemData: true,
        parentId: 2,
        parent: undefined,
        childMenus: [],
        isForbid: undefined,
        open: false,
      }
    ]
  },
  {
    id: 16,
    name: 'Organizasyon Yönetimi',
    nameEn: 'Organization Management',
    url: '/organizationmanagement',
    icon: undefined,
    permissionId: 61,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    isForbid: undefined,
    open: false,
  },
  {
    id: 6,
    name: 'Sipariş Yönetimi',
    nameEn: 'Order Management',
    url: '/incomingordermanagement',
    icon: undefined,
    permissionId: 32,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: undefined,
    open: false,
  },
  // {
  //   id: 11,
  //   name: 'Market',
  //   nameEn: 'Marketplace',
  //   url: '/landing/marketplace',
  //   icon: undefined,
  //   isDeleted: false,
  //   isSystemData: true,
  //   parentId: undefined,
  //   parent: undefined,
  //   childMenus: [],
  //   isForbid: false,
  //   open: false,
  // },
  {
    id: 8,
    name: 'Veri',
    nameEn: 'Data',
    url: '/landing/data',
    icon: undefined,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: false,
    open: false,
  },
  {
    id: 9,
    name: 'API',
    nameEn: 'API',
    url: '/landing/api',
    icon: undefined,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: false,
    open: false,
  },
  {
    id: 7,
    name: 'Keşfet',
    nameEn: 'Explore',
    url: '/landing/map',
    icon: undefined,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: false,
    open: false,
  },
  {
    id: 10,
    name: 'İletişim',
    nameEn: 'Contact',
    url: '/landing/contact',
    icon: undefined,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: false,
    open: false,
  },
  {
    id: 12,
    name: 'Harita Yönetimi',
    nameEn: 'Map Management',
    url: "/mapmanagement",
    icon: undefined,
    permissionId: 44,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    isForbid: undefined,
    open: false,
  },
  {
    id: 15,
    name: 'Destek',
    nameEn: 'Support',
    url: '/supportmanagement',
    icon: undefined,
    permissionId: 56,
    isDeleted: false,
    isSystemData: true,
    parentId: undefined,
    parent: undefined,
    childMenus: [],
    isForbid: false,
    open: false,
  },
];

@Component({
  selector: 'app-menu-tab',
  templateUrl: './menu-tab.component.html',
  styleUrls: ['./menu-tab.component.scss'],
})
export class MenuTabComponent implements OnInit, AfterViewInit, OnDestroy {
  appAngularVersion: string = environment.appVersion;
  appPreviewChangelogUrl: string = environment.appPreviewChangelogUrl;
  @ViewChild('ktAsideScroll', { static: true }) ktAsideScroll: ElementRef;
  private unsubscribe: Subscription[] = [];
  isAdmin: boolean = false;

  menuList: MenuModel[] = menuList;
  permissionList: number[] | undefined;

  constructor(private router: Router, private authService: AuthService) {}

  ngAfterViewInit(): void {
    
  }

  ngOnInit(): void {
    this.routingChanges();

    this.authService.currentUserSubject.asObservable().subscribe(result => {
      if(result) {
        if(result?.roles.includes(RoleEnum.SuperAdmin)) {
          this.isAdmin = true;
        }
        else{
          this.isAdmin = false;
        }
      }
      else{
        this.isAdmin = false;
      }

      if (result?.permissions) {
        this.permissionList = (JSON.parse(result?.permissions) as number[]);

        this.menuList.forEach(menu => {
          if (menu.permissionId) {
            if (this.permissionList?.includes(menu.permissionId)) {
              menu.isForbid = false;
            }
            else {
              menu.isForbid = true;
            }
          }
          else {
            if (menu.childMenus?.length! > 0) {
              menu.childMenus?.forEach(childMenu => {
                if (childMenu.permissionId) {
                  if (this.permissionList?.includes(childMenu.permissionId!)) {
                    childMenu.isForbid = false;
                    menu.isForbid = false;
                  }
                  else {
                    childMenu.isForbid = true;
                  }

                  if (!childMenu.isForbid) {
                    menu.isForbid = false;
                  }
                  else {
                    menu.isForbid = true;
                  }
                }
                else {
                  if (this.isAdmin) {
                    menu.isForbid = true;
                    childMenu.isForbid = true;
                  }
                  else {
                    menu.isForbid = false;
                    childMenu.isForbid = false;
                  }
                }
              });
            }
            else {
              if (this.isAdmin) {
                menu.isForbid = true;
              }
              else {
                menu.isForbid = false;
              }
            }
          }
        });

      }
      else {
        this.menuList.forEach(menu => {
          if (menu.permissionId) {
            menu.isForbid = true;
          }
          else {
            if (menu.childMenus?.length! > 0) {
              menu.childMenus?.forEach(childMenu => {
                if (childMenu.permissionId) {
                  menu.isForbid = true;
                  childMenu.isForbid = true;
                }
                else {
                  menu.isForbid = false;
                  childMenu.isForbid = false;
                }
              });
            }
            else {
              menu.isForbid = false;
            }
          }
        });
      }
    });
  }

  routingChanges() {
    const routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd || event instanceof NavigationCancel) {
        this.menuReinitialization();
      }
    });
    this.unsubscribe.push(routerSubscription);
  }

  menuReinitialization() {
    setTimeout(() => {
      MenuComponent.reinitialization();
      DrawerComponent.reinitialization();
      ToggleComponent.reinitialization();
      ScrollComponent.reinitialization();
      if (this.ktAsideScroll && this.ktAsideScroll.nativeElement) {
        this.ktAsideScroll.nativeElement.scrollTop = 0;
      }
    }, 50);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
