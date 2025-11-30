/**
 * Dynamic Property Input Component
 * Renders different input types based on property definition
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { PropertyDefinition, PropertyType, PropertyOption, ValidationRule } from '../../models/bpmn-elements.model';

@Component({
  selector: 'app-property-input',
  templateUrl: './property-input.component.html',
  styleUrls: ['./property-input.component.css'],
  standalone: false
})
export class PropertyInputComponent implements OnInit, OnChanges {
  @Input() property!: PropertyDefinition;
  @Input() value: any;
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() elementData: any = {}; // For conditional properties
  
  @Output() valueChange = new EventEmitter<any>();
  @Output() validationChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();

  // Expose PropertyType enum to template
  PropertyType = PropertyType;
  
  // Internal state
  currentValue: any;
  isValid: boolean = true;
  validationErrors: string[] = [];
  isVisible: boolean = true;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // Computed property for select value (to ensure proper change detection)
  get selectValue(): string {
    if (this.currentValue === null || this.currentValue === undefined) {
      return '';
    }
    return String(this.currentValue);
  }

  ngOnInit(): void {
    this.initializeValue();
    this.checkVisibility();
    this.validateValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      // Use string comparison to handle type mismatches (e.g., string vs number)
      const newValueStr = String(this.value ?? '');
      const currentValueStr = String(this.currentValue ?? '');
      
      if (newValueStr !== currentValueStr) {
        const oldValue = this.currentValue;
        this.currentValue = this.value;
        console.log(`Property ${this.property?.name} value changed:`, {
          old: oldValue,
          new: this.value,
          oldStr: currentValueStr,
          newStr: newValueStr,
          type: typeof this.value
        });
        // Force change detection for select elements
        this.cdr.detectChanges();
      } else {
        // Even if strings match, update if the value reference changed (for object/array types)
        if (this.value !== this.currentValue) {
          this.currentValue = this.value;
          this.cdr.detectChanges();
        }
      }
    }
    if (changes['elementData'] || changes['property']) {
      this.checkVisibility();
    }
    if (changes['value'] || changes['property']) {
      this.validateValue();
    }
  }

  private initializeValue(): void {
    if (this.value !== undefined && this.value !== null) {
      this.currentValue = this.value;
    } else if (this.property.defaultValue !== undefined) {
      this.currentValue = this.property.defaultValue;
      this.emitValueChange();
    } else {
      this.currentValue = this.getDefaultValueForType();
    }
  }

  private getDefaultValueForType(): any {
    switch (this.property.type) {
      case PropertyType.BOOLEAN:
        return false;
      case PropertyType.NUMBER:
        return 0;
      case PropertyType.MULTI_SELECT:
        return [];
      case PropertyType.JSON:
        return {};
      default:
        return '';
    }
  }

  private checkVisibility(): void {
    if (!this.property.conditional) {
      this.isVisible = this.property.visible !== false;
      return;
    }

    const dependentValue = this.elementData[this.property.conditional.dependsOn];
    this.isVisible = this.property.conditional.values.includes(dependentValue);
  }

  onValueChange(newValue: any): void {
    this.currentValue = newValue;
    this.validateValue();
    this.emitValueChange();
  }

  onSelectChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newValue = selectElement.value;
    console.log(`Select change for ${this.property?.name}:`, newValue);
    this.onValueChange(newValue);
  }

  onSelectValueChange(newValue: string): void {
    console.log(`Select value change for ${this.property?.name}:`, newValue);
    this.onValueChange(newValue);
  }


  private emitValueChange(): void {
    this.valueChange.emit(this.currentValue);
  }

  private validateValue(): void {
    this.validationErrors = [];
    this.isValid = true;

    if (!this.property.validation || this.property.validation.length === 0) {
      this.emitValidationChange();
      return;
    }

    for (const rule of this.property.validation) {
      const error = this.validateRule(rule, this.currentValue);
      if (error) {
        this.validationErrors.push(error);
        this.isValid = false;
      }
    }

    this.emitValidationChange();
  }

  private validateRule(rule: ValidationRule, value: any): string | null {
    switch (rule.type) {
      case 'required':
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          return rule.message;
        }
        break;
        
      case 'minLength':
        if (typeof value === 'string' && value.length < rule.value) {
          return rule.message;
        }
        break;
        
      case 'maxLength':
        if (typeof value === 'string' && value.length > rule.value) {
          return rule.message;
        }
        break;
        
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return rule.message;
        }
        break;
        
      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return rule.message;
        }
        break;
        
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return rule.message;
        }
        break;
        
      case 'email':
        if (typeof value === 'string' && value && !this.isValidEmail(value)) {
          return rule.message;
        }
        break;
        
      case 'url':
        if (typeof value === 'string' && value && !this.isValidUrl(value)) {
          return rule.message;
        }
        break;
        
      case 'custom':
        if (rule.customValidator && !rule.customValidator(value)) {
          return rule.message;
        }
        break;
    }
    
    return null;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private emitValidationChange(): void {
    this.validationChange.emit({
      isValid: this.isValid,
      errors: this.validationErrors
    });
  }

  // Helper methods for template
  getSelectOptions(): PropertyOption[] {
    return this.property.options || [];
  }

  isMultiSelectValue(option: PropertyOption): boolean {
    if (!Array.isArray(this.currentValue)) return false;
    return this.currentValue.includes(option.value);
  }

  toggleMultiSelectValue(option: PropertyOption): void {
    if (!Array.isArray(this.currentValue)) {
      this.currentValue = [];
    }
    
    const index = this.currentValue.indexOf(option.value);
    if (index > -1) {
      this.currentValue = this.currentValue.filter((v: any) => v !== option.value);
    } else {
      this.currentValue = [...this.currentValue, option.value];
    }
    
    this.onValueChange(this.currentValue);
  }

  // JSON handling
  formatJsonValue(): string {
    if (this.property.type === PropertyType.JSON) {
      try {
        return JSON.stringify(this.currentValue, null, 2);
      } catch {
        return '';
      }
    }
    return '';
  }

  onJsonChange(jsonString: string): void {
    try {
      const parsed = JSON.parse(jsonString);
      this.onValueChange(parsed);
    } catch (error) {
      // Keep the string value for now, validation will catch invalid JSON
      this.currentValue = jsonString;
      this.validateValue();
    }
  }

  // Date/Time formatting
  formatDateTimeValue(): string {
    if (!this.currentValue) return '';
    
    if (this.currentValue instanceof Date) {
      return this.currentValue.toISOString().slice(0, -1); // Remove 'Z' for datetime-local input
    }
    
    return this.currentValue;
  }

  onDateTimeChange(dateTimeString: string): void {
    if (!dateTimeString) {
      this.onValueChange(null);
      return;
    }
    
    const date = new Date(dateTimeString);
    this.onValueChange(date);
  }

  // File handling
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // For now, just store file name. In a real implementation,
      // you might want to upload the file and store a reference
      this.onValueChange(file.name);
    }
  }

  // Helper to get CSS classes
  getInputClasses(): string {
    const baseClass = 'property-input';
    const validationClass = this.isValid ? 'valid' : 'invalid';
    const disabledClass = this.disabled ? 'disabled' : '';
    const readonlyClass = this.readonly ? 'readonly' : '';
    
    return `${baseClass} ${validationClass} ${disabledClass} ${readonlyClass}`.trim();
  }

  // Helper to check if property is required
  get isRequired(): boolean {
    return !!(this.property.validation?.some(rule => rule.type === 'required'));
  }
}
