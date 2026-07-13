import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './modules/auth';
import { RoleEnum } from './enums/role.enum';

@Component({
  selector: 'app-redirect',
  template: '',
})
export class RedirectComponent implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const isLoggedIn = this.authService.currentUserValue?.id; // kendi methoduna göre değiştir

    if (isLoggedIn) {
      if(this.authService.currentUserValue?.roles.includes(RoleEnum.SuperAdmin)) {
        this.router.navigate(['/dashboard']);
      }
      else{
        this.router.navigate(['/landing/map']);
      }
    } else {
      this.router.navigate(['/landing/map']);
    }
  }
}