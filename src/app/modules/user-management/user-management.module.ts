import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TranslationModule } from '../i18n/translation.module';
import { UserManagementComponent } from './user-management.component';
import { UserManagementRoutingModule } from './user-management-routing.module';
import { PermissionComponent } from './permission/permission.component';
import { RoleComponent } from './role/role.component';
import { UserComponent } from './user/user.component';
import { PermissionEditSaveComponent } from './permission/edit-save/edit-save.component';
import { RoleEditSaveComponent } from './role/edit-save/edit-save.component';
import { UserEditSaveComponent } from './user/edit-save/edit-save.component';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { DataTableModule } from '../common/datatable/datatable.module';
import { CustomModalModule } from '../common/custom-modal/custom-modal.module';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { CustomSelectModule } from '../common/select/custom-select.module';

@NgModule({
  declarations: [
    UserManagementComponent,
    PermissionComponent,
    PermissionEditSaveComponent,
    RoleComponent,
    RoleEditSaveComponent,
    UserComponent,
    UserEditSaveComponent
  ],
  imports: [
    DataTableModule,
    ConfirmationModule,
    CommonModule,
    TranslationModule,
    UserManagementRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    CustomModalModule,
    CustomSelectModule,
    NgxMaskDirective,
    NgxMaskPipe
  ],
  providers: [
    provideNgxMask()
  ],
})
export class UserManagementModule {}
