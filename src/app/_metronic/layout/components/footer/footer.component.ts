import { Component, OnInit } from '@angular/core';
import { LayoutService } from '../../core/layout.service';
import { Router } from '@angular/router';
import { RoleEnum } from 'src/app/enums/role.enum';
import { AuthService } from 'src/app/modules/auth';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {
  footerContainerCssClasses: string = '';
  currentYear: string = new Date().getFullYear().toString();

  isAdmin: boolean = false;
  constructor(private layout: LayoutService, private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.currentUserValue?.roles.includes(RoleEnum.SuperAdmin) ? true : false;
    
    this.footerContainerCssClasses =
      this.layout.getStringCSSClasses('footerContainer');
  }

  onBrandClick() {
    if(this.isAdmin) {
      this.router.navigate(['/dashboard']);
    }
    else {
      this.router.navigate(['/landing/data'])
    }
  }
}
