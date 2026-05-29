import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UserModelAuth } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BasketManagementService } from 'src/app/modules/basket-management/basket-management.service';
import { BasketModel } from 'src/app/modules/basket-management/models/basket.model';
import { NotificationSignalrService } from 'src/app/modules/common/signalR.service';
import { environment } from 'src/environments/environment';
import { RoleEnum } from 'src/app/enums/role.enum';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  // KeenThemes mock, change it to:
  loginForm: FormGroup;
  hasError: boolean;
  returnUrl: string;
  isLoading$: Observable<boolean>;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private basketManagementService: BasketManagementService,
    private notificationService: NotificationSignalrService,
  ) {
    this.isLoading$ = this.authService.isLoading$;
    // redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.initForm();
    // get return url from route parameters or default to '/'
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'.toString()] || '/';
  }
  
  onBrandClick() {
    this.router.navigate(['/landing/data'])
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  initForm() {
    this.loginForm = this.fb.group({
      email: [
        "",
        Validators.compose([
          Validators.required,
          Validators.email,
          Validators.minLength(3),
          Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
        ]),
      ],
      password: [
        "",
        Validators.compose([
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ]),
      ],
    });
  }

  submit() {
    this.hasError = false;
    const loginSubscr = this.authService
      .login(this.f.email.value, this.f.password.value)
      .pipe(first())
      .subscribe((user: UserModelAuth | undefined) => {
        if (user) {
          
          const authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;
          const lsValue = localStorage.getItem(authLocalStorageToken);
          const authData = JSON.parse(lsValue!);

          if(authData?.accessToken){
            this.notificationService.startConnection(authData?.accessToken);
          }

          if(user.roles.includes(RoleEnum.SuperAdmin)) {
            this.returnUrl = "/dashboard";
          }
          else{
            this.returnUrl = "/landing/data";
          }

          const data = JSON.parse(localStorage.getItem('basket') as string) as BasketModel[];
          if (data && data.length > 0) {
            data.forEach(item => {
              item.userId = Number(user.id);
            })

            this.basketManagementService.saveAll(data).subscribe(result => {
              if (result.isSuccess) {
                localStorage.removeItem('basket');
                this.router.navigate([this.returnUrl]);
              }
              else {
                this.hasError = true;
              }
            })
          }
          else {
            this.router.navigate([this.returnUrl]);
          }
        } else {
          this.hasError = true;
        }
      });
    this.unsubscribe.push(loginSubscr);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
