import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoleEnum } from 'src/app/enums/role.enum';
import { MenuModel } from 'src/app/models/menu.model';
import { AuthService } from 'src/app/modules/auth';

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
      },
    ],
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
    childMenus: [],
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
  selector: 'app-header-menu',
  templateUrl: './header-menu.component.html',
  styleUrls: ['./header-menu.component.scss'],
})
export class HeaderMenuComponent implements OnInit, OnDestroy {
  menuList: HeaderMenuModel[] = [];
  permissionList: number[] | undefined;
  isAdmin = false;

  private userSub?: Subscription;

  private documentClickHandler = (): void => {
    this.closeAll();
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin =
      this.authService.currentUserValue?.roles?.includes(RoleEnum.SuperAdmin) ??
      false;

    this.menuList = this.cloneMenuList(menuList);

    document.addEventListener('click', this.documentClickHandler);

    this.controlMenuVisibility();
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.documentClickHandler);
    this.userSub?.unsubscribe();
  }

  controlMenuVisibility(): void {
    this.userSub = this.authService.currentUserSubject
      .asObservable()
      .subscribe((result) => {
        const cloned = this.cloneMenuList(menuList);

        if (result?.permissions) {
          this.permissionList = JSON.parse(result.permissions) as number[];

          cloned.forEach((menu) => {
            if (menu.permissionId) {
              menu.isForbid = !this.permissionList?.includes(menu.permissionId);
            } else if (menu.childMenus?.length) {
              let hasVisibleChild = false;

              menu.childMenus.forEach((childMenu) => {
                if (childMenu.permissionId) {
                  childMenu.isForbid = !this.permissionList?.includes(
                    childMenu.permissionId
                  );
                } else {
                  childMenu.isForbid = !!this.isAdmin;
                }

                if (!childMenu.isForbid) {
                  hasVisibleChild = true;
                }
              });

              menu.isForbid = !hasVisibleChild;
            } else {
              menu.isForbid = !!this.isAdmin;
            }
          });
        } else {
          cloned.forEach((menu) => {
            if (menu.permissionId) {
              menu.isForbid = true;
            } else if (menu.childMenus?.length) {
              let hasVisibleChild = false;

              menu.childMenus.forEach((childMenu) => {
                if (childMenu.permissionId) {
                  childMenu.isForbid = true;
                } else {
                  childMenu.isForbid = false;
                  hasVisibleChild = true;
                }

                if (!childMenu.isForbid) {
                  hasVisibleChild = true;
                }
              });

              menu.isForbid = !hasVisibleChild;
            } else {
              menu.isForbid = false;
            }
          });
        }

        this.menuList = cloned;
      });
  }

  toggleMenu(index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.menuList = this.menuList.map((menu, i) => ({
      ...menu,
      open: i === index ? !menu.open : false,
    }));
  }

  closeAll(): void {
    this.menuList = this.menuList.map((menu) => ({
      ...menu,
      open: false,
    }));
  }

  isMenuActive(menu: HeaderMenuModel): boolean {
    return checkIsActive(this.router.url, menu.url);
  }

  isChildActive(menu: HeaderMenuModel): boolean {
    return checkIsActive(this.router.url, menu.url);
  }

  hasActiveChild(menu: HeaderMenuModel): boolean {
    return !!menu.childMenus?.some((child) =>
      checkIsActive(this.router.url, child.url)
    );
  }

  private cloneMenuList(source: HeaderMenuModel[]): HeaderMenuModel[] {
    return source.map((menu) => ({
      ...menu,
      open: false,
      childMenus: menu.childMenus
        ? menu.childMenus.map((child) => ({
            ...child,
            open: false,
          }))
        : [],
    }));
  }
}

const getCurrentUrl = (pathname: string): string => {
  return pathname.split(/[?#]/)[0];
};

const checkIsActive = (pathname: string, url?: string): boolean => {
  const current = getCurrentUrl(pathname);

  if (!current || !url) {
    return false;
  }

  if (current === url) {
    return true;
  }

  return current.startsWith(url);
};