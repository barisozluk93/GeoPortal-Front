import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { ConfirmationComponent } from 'src/app/modules/confirmation/confirmation.component';
import { UserAddressModel } from 'src/app/modules/user-management/models/user-address.model';
import { UserModel } from 'src/app/modules/user-management/models/user.model';
import { UserManagementService } from 'src/app/modules/user-management/user-management.service';
import { AddressEditSaveComponent } from './edit-save/edit-save.component';

@Component({
  selector: 'app-address-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class AddressListComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('confirmationComponent') private confirmationComponent: ConfirmationComponent;
  @ViewChild('editSaveComponent') private editSaveComponent: AddressEditSaveComponent;

  @Input() user: UserModel;
  addresses: UserAddressModel[] = [];

  constructor(
    private userManagementService: UserManagementService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.user && this.user) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {}

  loadData(): void {
    this.userManagementService.userAddressList(this.user.id).subscribe((result) => {
      if (result.isSuccess) {
        this.addresses = result.data;
      } else {
        this.addresses = [];
      }
    });
  }

  delete(event: number): void {
    this.userManagementService.userAddressDelete(event).subscribe((result) => {
      if (result.isSuccess) {
          this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.loadData();
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  isSuccess(event: boolean): void {
    if (event) {
      this.loadData();
    }
  }

  openDeleteModal(id: number): void {
    this.translate.get('DELETE').subscribe((translation) => {
      this.confirmationComponent.openModal(translation, id);
    });
  }

  openEditModal(id: number): void {
    this.editSaveComponent.openModal(this.user.id, id);
  }

  openSaveModal(): void {
    this.editSaveComponent.openModal(this.user.id, undefined);
  }
}