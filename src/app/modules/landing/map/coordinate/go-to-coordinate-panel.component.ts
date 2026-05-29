import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-go-to-coordinate-panel',
  templateUrl: './go-to-coordinate-panel.component.html',
  styleUrls: ['./go-to-coordinate-panel.component.scss'],
})
export class GoToCoordinatePanelComponent {
  @Output() coordinateSelected = new EventEmitter<{
    lat: number;
    lon: number;
  }>();

  latitude = '';
  longitude = '';

  submitted = false;

  latitudeRequiredError = false;
  longitudeRequiredError = false;
  coordinateInvalidError = false;

  goToCoordinate(): void {
    this.submitted = true;

    const latitudeValue = String(this.latitude ?? '').trim();
    const longitudeValue = String(this.longitude ?? '').trim();

    this.latitudeRequiredError = !latitudeValue;
    this.longitudeRequiredError = !longitudeValue;
    this.coordinateInvalidError = false;

    if (this.latitudeRequiredError || this.longitudeRequiredError) {
      return;
    }

    const lat = Number(latitudeValue.replace(',', '.'));
    const lon = Number(longitudeValue.replace(',', '.'));

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      this.coordinateInvalidError = true;
      return;
    }

    this.clearErrors();

    this.coordinateSelected.emit({
      lat,
      lon,
    });
  }

  onLatitudeInput(): void {
    if (!this.submitted) return;

    this.latitudeRequiredError = !String(this.latitude ?? '').trim();
    this.coordinateInvalidError = false;
  }

  onLongitudeInput(): void {
    if (!this.submitted) return;

    this.longitudeRequiredError = !String(this.longitude ?? '').trim();
    this.coordinateInvalidError = false;
  }

  clear(): void {
    this.latitude = '';
    this.longitude = '';
    this.submitted = false;
    this.clearErrors();
  }

  private clearErrors(): void {
    this.latitudeRequiredError = false;
    this.longitudeRequiredError = false;
    this.coordinateInvalidError = false;
  }
}