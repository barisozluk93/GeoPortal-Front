import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { UserType } from 'src/app/modules/auth';
import { UserModel } from 'src/app/modules/user-management/models/user.model';
import { UserManagementService } from 'src/app/modules/user-management/user-management.service';

@Component({
  selector: 'app-profile-details',
  templateUrl: './profile-details.component.html',
  styleUrls: ['./profile-details.component.scss']
})
export class ProfileDetailsComponent implements OnInit, OnDestroy, OnChanges {
  private unsubscribe: Subscription[] = [];
  form: FormGroup;

  @Input() user: UserModel;
  constructor(private fb: FormBuilder, private userManagementService: UserManagementService,
    private alertService: AlertService, private translate: TranslateService
  ) {

  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if(changes.user) {
      if(!this.form) {
        this.initForm();
      }
      
      this.setUserForm();
    }
  }

  initForm() {
    this.form = this.fb.group({
      id: 0,
      name: [
        "",
        Validators.compose([
          Validators.required,
        ]),
      ],
      surname: [
        "",
        Validators.compose([
          Validators.required,
        ]),
      ],
      email: [
        "",
        Validators.compose([
          Validators.required,
          Validators.email,
          Validators.minLength(3),
          Validators.maxLength(320),
        ]),
      ],
      phone: [
        "",
        Validators.compose([
          Validators.required,
          Validators.pattern(/^\(\d{3}\)\s\d{3}\s\d{2}\s\d{2}$/)
        ]),
      ],
      roles: [
        null
      ],
      organizations: [
        null
      ],
      username: [
        "",
        Validators.compose([
          Validators.required,
        ]),
      ],
      password: [
        '',
      ],
      fileId: [
        '',
      ],
    });
  }

  setUserForm() {
    
    if (this.user) {
      this.form.patchValue(this.user);

      this.form.get("password")?.setValue("•••");
      this.form.get("cPassword")?.setValue("•••");
      this.form.get("roles")?.setValue(this.user.roles[0])

      if (this.user.organizations.length > 0) {
        this.form.get("organizations")?.setValue(this.user.organizations[0])
      }
      else {
        this.form.get("organizations")?.setValue(null)
      }
    }
}

ngOnInit(): void {
  this.initForm();
}

saveSettings() {
  if (this.form.valid) {
    var temp = this.form.getRawValue();
    var data = this.form.getRawValue() as UserModel;

    if (temp.roles || temp.roles > 0) {
      data.roles = [temp.roles];
    }
    else {
      data.roles = [];
    }

    if (temp.organizations || temp.organizations > 0) {
      data.organizations = [temp.organizations];
    }
    else {
      data.organizations = [];
    }

    this.userManagementService.userProfileEdit(data).subscribe(result => {
      if (result.isSuccess) {
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.userManagementService.updateUser(data.id);
      }
      else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));      }
    })
  }
}

ngOnDestroy() {
  this.unsubscribe.forEach((sb) => sb.unsubscribe());
}

}
