import { Component, OnInit } from '@angular/core';
import { AuthService, UserType } from '../auth';
import { UserManagementService } from '../user-management/user-management.service';
import { UserModel } from '../user-management/models/user.model';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {

  user: UserType;
  userData: UserModel;

  constructor(private auth: AuthService,
    private userManagementService: UserManagementService,
    private alertService: AlertService,
    private translate: TranslateService) { }

  ngOnInit(): void {
    this.auth.currentUserSubject.subscribe(result => {
      this.user = result;

      this.userManagementService.updateUser(this.user?.id!);

      this.userManagementService.user$.subscribe(result => {
        this.userData = result!;
      });
    });
  }

  onFileChange(event: any) {

    if (event.target.files.length > 0) {
      let file: File = event.target.files[0];
      var src = URL.createObjectURL(file);
      var img = new Image;
      img.src = src;

      let width = 0;
      let height = 0;

      img.onload = () => {
        width = img.naturalWidth;
        height = img.naturalHeight;

        if (width == 300 && height == 300) {
          let formData = new FormData();
          formData.append("file", file);

          this.userManagementService.upload(formData).subscribe(result => {
            if (result.isSuccess) {
              this.userManagementService.userAvatarEdit(this.user?.id!, result.data.id).subscribe(result => {
                if (result.isSuccess) {
                  this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
                  this.userManagementService.updateUser(this.user?.id!);
                }
                else {
                  this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
                }
              })
            }
            else {
              this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
            }
          })
        }
        else {
          this.alertService.createAlert("warning", this.translate.instant('MESSAGES.AVATAR_SIZE'));
        }
      };
    }
  }
}
