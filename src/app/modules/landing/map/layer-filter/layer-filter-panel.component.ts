import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { LayerModel } from '../../../map-management/models/layer.model';

type FilterOperator = '=' | '<>' | 'LIKE' | '>' | '<' | '>=' | '<=';
type FilterLogic = 'AND' | 'OR';

interface FilterField {
  name: string;
  type: string;
}

interface FilterRule {
  field: string;
  operator: FilterOperator;
  value: string;
  logic: FilterLogic;
}

@Component({
  selector: 'app-layer-filter-panel',
  templateUrl: './layer-filter-panel.component.html',
  styleUrls: ['./layer-filter-panel.component.scss'],
})
export class LayerFilterPanelComponent implements OnChanges {
  @Input() layer?: LayerModel;

  @Output() closed = new EventEmitter<void>();

  @Output() filterApplied = new EventEmitter<{
    layer: LayerModel;
    cqlFilter: string;
  }>();

  @Output() filterCleared = new EventEmitter<LayerModel>();

  fields: FilterField[] = [];

  fieldItems: { label: string; value: string }[] = [];
  operatorItems: { label: string; value: FilterOperator }[] = [
    { label: '=', value: '=' },
    { label: '<>', value: '<>' },
    { label: 'LIKE', value: 'LIKE' },
    { label: '>', value: '>' },
    { label: '<', value: '<' },
    { label: '>=', value: '>=' },
    { label: '<=', value: '<=' },
  ];

  logicItems: { label: string; value: FilterLogic }[] = [
    { label: 'AND', value: 'AND' },
    { label: 'OR', value: 'OR' },
  ];

  rules: FilterRule[] = [];

  isLoading = false;
  errorMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['layer'] && this.layer) {
      this.resetRules();
      this.loadAttributes();
    }
  }

  addRule(): void {
    this.rules.push({
      field: '',
      operator: '=',
      value: '',
      logic: 'AND',
    });
  }

  removeRule(index: number): void {
    this.rules.splice(index, 1);

    if (this.rules.length === 0) {
      this.addRule();
    }
  }

  applyFilter(): void {
    if (!this.layer) return;

    const validRules = this.rules.filter(
      (rule) => rule.field && rule.operator && rule.value?.toString().trim()
    );

    if (validRules.length === 0) return;

    const cqlFilter = validRules
      .map((rule, index) => {
        const expression = this.buildExpression(rule);
        return index === 0 ? expression : `${rule.logic} ${expression}`;
      })
      .join(' ');

    this.filterApplied.emit({
      layer: this.layer,
      cqlFilter,
    });
  }

  clearFilter(): void {
    if (!this.layer) return;

    this.resetRules();
    this.filterCleared.emit(this.layer);
  }

  private loadAttributes(): void {
    if (!this.layer?.url || !this.layer?.layerName) {
      this.errorMessage = 'Katman bilgisi eksik.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.fields = [];
    this.fieldItems = [];

    const separator = this.layer.url.includes('?') ? '&' : '?';

    const describeUrl =
      `${this.layer.url}${separator}` +
      `service=WFS` +
      `&version=${encodeURIComponent(this.layer.version || '1.1.0')}` +
      `&request=DescribeFeatureType` +
      `&typeName=${encodeURIComponent(this.layer.layerName)}`;

    fetch(describeUrl)
      .then((response) => response.text())
      .then((xmlText) => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');

        const elements = [
          ...Array.from(xml.getElementsByTagName('xsd:element')),
          ...Array.from(xml.getElementsByTagName('xs:element')),
        ];

        this.fields = elements
          .map((element) => ({
            name: element.getAttribute('name') || '',
            type: element.getAttribute('type') || '',
          }))
          .filter((field) => !!field.name)
          .filter((field) => !['geom', 'geometry', 'the_geom'].includes(field.name.toLowerCase()));

        this.fieldItems = this.fields.map((field) => ({
          label: field.name,
          value: field.name,
        }));

        if (this.fields.length === 0) {
          this.errorMessage = 'Öznitelik bulunamadı.';
        }
      })
      .catch(() => {
        this.errorMessage = 'Öznitelikler yüklenirken hata oluştu.';
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  private resetRules(): void {
    this.rules = [
      {
        field: '',
        operator: '=',
        value: '',
        logic: 'AND',
      },
    ];

    this.errorMessage = '';
  }

  private buildExpression(rule: FilterRule): string {
    const value = rule.value.toString().trim();

    if (rule.operator === 'LIKE') {
      return `${rule.field} LIKE '%${this.escapeValue(value)}%'`;
    }

    if (this.isNumericValue(value)) {
      return `${rule.field} ${rule.operator} ${value}`;
    }

    return `${rule.field} ${rule.operator} '${this.escapeValue(value)}'`;
  }

  private escapeValue(value: string): string {
    return value.replace(/'/g, "''");
  }

  private isNumericValue(value: string): boolean {
    return value.trim() !== '' && !Number.isNaN(Number(value));
  }
}