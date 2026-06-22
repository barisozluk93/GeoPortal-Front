import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { AlertService } from 'src/app/_metronic/partials/layout/alert/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { MapManagementService } from '../../map-management.service';
import { LayerModel } from '../../models/layer.model';
import { LayerType } from '../../models/layertype.model';

@Component({
  selector: 'app-layer-editsave',
  templateUrl: './edit-save.component.html',
  styleUrls: ['./edit-save.component.scss'],
})
export class LayerEditSaveComponent implements OnInit, OnDestroy {
  isModalOpen = false;
  modalTitle: string;

  @Output() isSuccess: EventEmitter<boolean> = new EventEmitter<boolean>();

  form: FormGroup;
  typeChangeSubscription: Subscription;

  layerTypes = [
    { value: LayerType.BaseMap, label: 'Base Map' },
    { value: LayerType.Wms, label: 'WMS' },
    { value: LayerType.Wfs, label: 'WFS' },
    { value: LayerType.Wmts, label: 'WMTS' }
  ];

  constructor(
    private fb: FormBuilder,
    private mapManagementService: MapManagementService,
    private alertService: AlertService,
    private translate: TranslateService
  ) { }

  get f() {
    return this.form.controls;
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  ngOnInit(): void {
    this.initForm();
    this.subscribeTypeChanges();
    this.applyTypeBasedValidators(this.f['type'].value);
  }

  ngOnDestroy(): void {
    this.typeChangeSubscription?.unsubscribe();
  }

  initForm() {
    this.form = this.fb.group({
      id: [0],
      name: ['', Validators.required],
      type: [null, Validators.required],
      url: ['', Validators.required],
      layerName: [''],
      format: [''],
      version: [''],
      isVisible: [true],
      isBaseMap: [true],
      opacity: [1, [Validators.required, Validators.min(0), Validators.max(1)]],
      orderNo: [null, [Validators.required, Validators.min(1)]],
      isDeleted: [false],
    });
  }

  subscribeTypeChanges() {
    this.typeChangeSubscription = this.f['type'].valueChanges.subscribe((selectedType: LayerType) => {
      this.applyTypeBasedValidators(selectedType);
    });
  }

  applyTypeBasedValidators(selectedType: LayerType) {
    const layerNameControl = this.f['layerName'];

    layerNameControl.clearValidators();

    if (selectedType === LayerType.Wms ||
      selectedType === LayerType.Wfs ||
      selectedType === LayerType.Wmts
    ) {
      layerNameControl.setValidators([Validators.required]);
    }

    layerNameControl.updateValueAndValidity({ emitEvent: false });
  }

  openModal(layerId?: number) {
    forkJoin([
      this.translate.get(['NEW_RECORD', 'EDIT'])
    ]).subscribe(([translations]) => {
      this.modalTitle = layerId ? translations['EDIT'] : translations['NEW_RECORD'];

      if (layerId) {
        this.mapManagementService.getLayerById(layerId).subscribe(result => {
          if (result.isSuccess) {
            this.form.patchValue(result.data);
            this.applyTypeBasedValidators(this.f['type'].value);
            this.isModalOpen = true;
          }
        });
      } else {
        this.form.reset({
          id: 0,
          name: '',
          type: null,
          url: '',
          layerName: '',
          format: '',
          version: '',
          isVisible: true,
          isBaseMap: true,
          opacity: 1,
          orderNo: null,
          isDeleted: false,
        });

        this.applyTypeBasedValidators(this.f['type'].value);
        this.isModalOpen = true;
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();
      return;
    }

    const data = this.form.getRawValue() as LayerModel;

    const request = data.id === 0
      ? this.mapManagementService.layerSave(data)
      : this.mapManagementService.layerEdit(data);

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