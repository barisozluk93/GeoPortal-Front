import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuModel } from 'src/app/models/menu.model';
import { AuthService } from 'src/app/modules/auth';

const menuList = [
  {
    "id": 1,
    "name": "Dashboard",
    "nameEn": "Dashboard",
    "url": "/dashboard",
    "icon": undefined,
    "permissionId": 17,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "childMenus": [],
    "isForbid": undefined,
  },
  {
    "id": 2,
    "name": "Kullanıcı Yönetimi",
    "nameEn": "User Management",
    "url": undefined,
    "icon": undefined,
    "permissionId": undefined,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "isForbid": undefined,
    "childMenus": [
      {
        "id": 3,
        "name": "Yetkiler",
        "nameEn": "Permissions",
        "url": "/usermanagement/permissions",
        "icon": undefined,
        "permissionId": 1,
        "isDeleted": false,
        "isSystemData": true,
        "parentId": 2,
        "parent": undefined,
        "childMenus": [],
        "isForbid": undefined,
      },
      {
        "id": 4,
        "name": "Roller",
        "nameEn": "Roles",
        "url": "/usermanagement/roles",
        "icon": undefined,
        "permissionId": 5,
        "isDeleted": false,
        "isSystemData": true,
        "parentId": 2,
        "parent": undefined,
        "childMenus": [],
        "isForbid": undefined,
      },
      {
        "id": 5,
        "name": "Kullanıcılar",
        "nameEn": "Users",
        "url": "/usermanagement/users",
        "icon": undefined,
        "permissionId": 13,
        "isDeleted": false,
        "isSystemData": true,
        "parentId": 2,
        "parent": undefined,
        "childMenus": [],
        "isForbid": undefined,
      }
    ]
  },
  {
    "id": 6,
    "name": "Gelen Sipariş Yönetimi",
    "nameEn": "Incoming Order Management",
    "url": "/incomingordermanagement",
    "icon": undefined,
    "permissionId": 20,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "childMenus": [],
    "isForbid": undefined,
  },
  {
    "id": 8,
    "name": "Veri",
    "nameEn": "Data",
    "url": "/landing/data",
    "icon": undefined,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "childMenus": [],
    "isForbid": false,
  },
  {
    "id": 9,
    "name": "API",
    "nameEn": "API",
    "url": "/landing/api",
    "icon": undefined,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "childMenus": [],
    "isForbid": false,
  },
  {
    "id": 7,
    "name": "Harita",
    "nameEn": "Map",
    "url": "/landing/map",
    "icon": undefined,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "childMenus": [],
    "isForbid": false,
  },
  {
    "id": 10,
    "name": "İletişim",
    "nameEn": "Contact",
    "url": "/landing/contact",
    "icon": undefined,
    "isDeleted": false,
    "isSystemData": true,
    "parentId": undefined,
    "parent": undefined,
    "childMenus": [],
    "isForbid": false,
  },
]


@Component({
  selector: 'app-header-menu',
  templateUrl: './header-menu.component.html',
  styleUrls: ['./header-menu.component.scss'],
})
export class HeaderMenuComponent implements OnInit {

  menuList: MenuModel[] = menuList;
  permissionList: number[] | undefined;

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
      this.authService.currentUserSubject.asObservable().subscribe(result => {
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
              if(menu.childMenus?.length! > 0) {
                menu.childMenus?.forEach(childMenu => {
                  if(childMenu.permissionId) {
                    if (this.permissionList?.includes(childMenu.permissionId!)) {
                      childMenu.isForbid = false;
                      menu.isForbid = false;
                    }
                    else {
                      childMenu.isForbid = true;
                    }

                    if(!childMenu.isForbid) {
                      menu.isForbid = false;
                    }
                    else {
                      menu.isForbid = true;
                    }
                  }
                  else{
                    if(result.roles.includes("1")) {
                      menu.isForbid = true;
                      childMenu.isForbid = true;
                    }
                    else{
                      menu.isForbid = false;
                      childMenu.isForbid = false;
                    }
                  }
                })
              }
              else{
                if(result.roles.includes("1")) {
                  menu.isForbid = true;
                }
                else{
                  menu.isForbid = false;
                }
              }
            }
          });
          
        }
        else{
          this.menuList.forEach(menu => {
            if (menu.permissionId) {
              menu.isForbid = true;
            }
            else{
              if(menu.childMenus?.length! > 0) {
                menu.childMenus?.forEach(childMenu => {
                  if (childMenu.permissionId) {
                    menu.isForbid = true;
                    childMenu.isForbid = true;
                  }
                  else{
                    menu.isForbid = false;
                    childMenu.isForbid = false;
                  }
                });
              }
              else{
                menu.isForbid = false;
              }
            }
          });
        }
      })
  }

  calculateMenuItemCssClass(url: string): string {
    return checkIsActive(this.router.url, url) ? 'active' : '';
  }
}

const getCurrentUrl = (pathname: string): string => {
  return pathname.split(/[?#]/)[0];
};

const checkIsActive = (pathname: string, url: string) => {
  const current = getCurrentUrl(pathname);
  if (!current || !url) {
    return false;
  }

  if (current === url) {
    return true;
  }

  if (current.indexOf(url) > -1) {
    return true;
  }

  return false;
};
