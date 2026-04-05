import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent, ModalConfig } from 'src/app/_metronic/partials';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { forkJoin } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { MapManagementService } from '../../map-management.service';
import { LayerGroupModel } from '../../models/layergroup.model';

@Component({
  selector: 'app-layergroup-editsave',
  templateUrl: './edit-save.component.html',
  styleUrls: ['./edit-save.component.scss'],
})
export class LayerGroupEditSaveComponent implements OnInit {

  isModalOpen = false;
  modalTitle: string;

  @Output() isSuccess = new EventEmitter<boolean>();

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private mapManagementService: MapManagementService,
    private alertService: AlertService,
    private translate: TranslateService
  ) {}

  get f() {
    return this.form.controls;
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      orderNo: [null, [Validators.required, Validators.min(1)]],
      isDeleted: false,
    });
  }

  openModal(layerGroupId?: number) {

    forkJoin([
      this.translate.get(['NEW_RECORD', 'EDIT'])
    ]).subscribe(([translations]) => {

      this.modalTitle = layerGroupId
        ? translations['EDIT']
        : translations['NEW_RECORD'];

      if (layerGroupId) {
        this.mapManagementService.getLayerGroupById(layerGroupId).subscribe(result => {
          if (result.isSuccess) {
            this.form.patchValue(result.data);
            this.isModalOpen = true;
          }
        });
      } else {
        this.form.reset({
          id: 0,
          name: '',
          orderNo: null,
          isDeleted: false
        });

        this.isModalOpen = true;
      }
    });
  }

  submit() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = this.form.getRawValue() as LayerGroupModel;

    const request = data.id === 0
      ? this.mapManagementService.layerGroupSave(data)
      : this.mapManagementService.layerGroupEdit(data);

    request.subscribe(result => {
      if (result.isSuccess) {
        this.closeModal();
        this.alertService.createAlert('success', this.translate.instant('MESSAGES.SUCCESS'));
        this.isSuccess.emit(true);
      } else {
        this.alertService.createAlert('danger', this.translate.instant('MESSAGES.ERROR'));
      }
    });
  }

  closeModal() {
    this.isModalOpen = false;
  }
}
