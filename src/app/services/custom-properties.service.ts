/**
 * Enhanced Custom Properties Service
 * Manages comprehensive BPMN element properties with validation and business rules
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { 
  BpmnElementType, 
  PropertyDefinition, 
  ElementPropertySchema,
  PropertyValidationResult,
  PropertyGroups 
} from '../models/bpmn-elements.model';
import { ElementSchemas, getElementSchema } from '../models/element-schemas';
import { ValidationService, ValidationContext } from './validation.service';

// Legacy interfaces for backward compatibility
export interface CustomProperty {
  id: string;
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date';
  description?: string;
  required?: boolean;
  validation?: (value: any) => boolean;
}

export interface ElementProperties {
  elementId: string;
  elementType: string;
  properties: CustomProperty[];
  lastModified: Date;
}

// Enhanced interfaces
export interface EnhancedElementProperties {
  elementId: string;
  elementType: BpmnElementType;
  properties: { [key: string]: any };
  schema?: ElementPropertySchema;
  validationResult?: PropertyValidationResult;
  lastModified: Date;
  isReadonly?: boolean;
}

export interface PropertyGroup {
  id: string;
  label: string;
  icon: string;
  order: number;
  properties: PropertyDefinition[];
  isExpanded?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CustomPropertiesService {
  private propertiesSubject = new BehaviorSubject<Map<string, EnhancedElementProperties>>(new Map());
  private selectedElementId: string | null = null;
  private selectedElementSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  public properties$ = this.propertiesSubject.asObservable();
  public selectedElement$ = this.selectedElementSubject.asObservable();

  constructor(private validationService: ValidationService) {}

  /**
   * Set the currently selected element
   */
  setSelectedElement(elementId: string | null, element?: any): void {
    this.selectedElementId = elementId;
    this.selectedElementSubject.next(elementId);

    if (elementId && element) {
      this.initializeElementProperties(elementId, element);
    }
  }

  /**
   * Initialize properties for a BPMN element based on its type
   */
  initializeElementProperties(elementId: string, element: any): void {
    const elementType = element.type || element.$type as BpmnElementType;
    const schema = getElementSchema(elementType);
    
    if (!schema) {
      console.warn(`No schema found for element type: ${elementType}`);
      return;
    }

    const existingProps = this.propertiesSubject.value.get(elementId);
    const existingProperties = existingProps?.properties || {};

    // Initialize properties with default values if not already set
    const properties: { [key: string]: any } = {};
    
    schema.properties.forEach(propDef => {
      if (existingProperties[propDef.name] !== undefined) {
        properties[propDef.name] = existingProperties[propDef.name];
      } else {
        // First check for custom properties in extension elements (for saved/imported diagrams)
        const customValue = this.getCustomPropertyFromBpmn(element, propDef.name);
        if (customValue !== null) {
          properties[propDef.name] = this.parseCustomPropertyValue(customValue, propDef.type);
        } else if (element.businessObject?.[propDef.name] !== undefined) {
          properties[propDef.name] = element.businessObject[propDef.name];
        } else if (propDef.defaultValue !== undefined) {
          properties[propDef.name] = propDef.defaultValue;
        } else {
          properties[propDef.name] = this.getDefaultValueForType(propDef);
        }
      }
    });

    // Set element ID and name from BPMN element
    if (element.businessObject?.id) {
      properties['id'] = element.businessObject.id;
    }
    if (element.businessObject?.name) {
      properties['name'] = element.businessObject.name;
    }

    const elementProperties: EnhancedElementProperties = {
      elementId,
      elementType,
      properties,
      schema,
      lastModified: new Date(),
      isReadonly: false
    };

    // Validate properties
    this.validateElementProperties(elementProperties);

    // Update the map
    const currentProperties = this.propertiesSubject.value;
    currentProperties.set(elementId, elementProperties);
    this.propertiesSubject.next(currentProperties);
  }

  /**
   * Get properties for a specific element
   */
  getElementProperties(elementId: string): EnhancedElementProperties | undefined {
    return this.propertiesSubject.value.get(elementId);
  }

  /**
   * Get properties for currently selected element
   */
  getSelectedElementProperties(): Observable<EnhancedElementProperties | undefined> {
    return combineLatest([this.properties$, this.selectedElement$]).pipe(
      map(([propertiesMap, selectedId]) => 
        selectedId ? propertiesMap.get(selectedId) : undefined
      ),
      distinctUntilChanged()
    );
  }

  /**
   * Update a single property value
   */
  setProperty(elementId: string, propertyName: string, value: any): void {
    const elementProps = this.propertiesSubject.value.get(elementId);
    if (!elementProps) {
      console.warn(`No properties found for element: ${elementId}`);
      return;
    }

    // Update the property
    elementProps.properties[propertyName] = value;
    elementProps.lastModified = new Date();

    // Re-validate
    this.validateElementProperties(elementProps);

    // Update the map
    const currentProperties = this.propertiesSubject.value;
    currentProperties.set(elementId, elementProps);
    this.propertiesSubject.next(currentProperties);
  }

  /**
   * Update multiple properties at once
   */
  setProperties(elementId: string, properties: { [key: string]: any }): void {
    const elementProps = this.propertiesSubject.value.get(elementId);
    if (!elementProps) {
      console.warn(`No properties found for element: ${elementId}`);
      return;
    }

    // Update properties
    Object.assign(elementProps.properties, properties);
    elementProps.lastModified = new Date();

    // Re-validate
    this.validateElementProperties(elementProps);

    // Update the map
    const currentProperties = this.propertiesSubject.value;
    currentProperties.set(elementId, elementProps);
    this.propertiesSubject.next(currentProperties);
  }

  /**
   * Get property groups for an element (organized by group)
   */
  getPropertyGroups(elementId: string): PropertyGroup[] {
    const elementProps = this.getElementProperties(elementId);
    if (!elementProps?.schema) {
      return [];
    }

    // Group properties by their group property
    const groupedProps = new Map<string, PropertyDefinition[]>();
    
    elementProps.schema.properties.forEach(prop => {
      const groupId = prop.group || 'general';
      if (!groupedProps.has(groupId)) {
        groupedProps.set(groupId, []);
      }
      groupedProps.get(groupId)!.push(prop);
    });

    // Convert to PropertyGroup array with metadata
    const groups: PropertyGroup[] = [];
    groupedProps.forEach((properties, groupId) => {
      const groupInfo = PropertyGroups[groupId as keyof typeof PropertyGroups] || {
        label: groupId.charAt(0).toUpperCase() + groupId.slice(1),
        order: 999,
        icon: '📋'
      };

      groups.push({
        id: groupId,
        label: groupInfo.label,
        icon: groupInfo.icon,
        order: groupInfo.order,
        properties: properties.sort((a, b) => (a.order || 0) - (b.order || 0)),
        isExpanded: true // Expand all groups by default so custom properties are visible
      });
    });

    return groups.sort((a, b) => a.order - b.order);
  }

  /**
   * Get all supported element types
   */
  getSupportedElementTypes(): BpmnElementType[] {
    return ElementSchemas.map(schema => schema.elementType);
  }

  /**
   * Get schema for element type
   */
  getElementSchema(elementType: BpmnElementType): ElementPropertySchema | undefined {
    return getElementSchema(elementType);
  }

  /**
   * Export properties for an element
   */
  exportElementProperties(elementId: string): any {
    const elementProps = this.getElementProperties(elementId);
    if (!elementProps) {
      return null;
    }

    return {
      elementId: elementProps.elementId,
      elementType: elementProps.elementType,
      properties: { ...elementProps.properties },
      lastModified: elementProps.lastModified.toISOString(),
      validation: elementProps.validationResult
    };
  }

  /**
   * Import properties for an element
   */
  importElementProperties(data: any): void {
    if (!data.elementId || !data.elementType || !data.properties) {
      console.error('Invalid properties data for import');
      return;
    }

    const elementProps: EnhancedElementProperties = {
      elementId: data.elementId,
      elementType: data.elementType as BpmnElementType,
      properties: data.properties,
      schema: getElementSchema(data.elementType),
      lastModified: data.lastModified ? new Date(data.lastModified) : new Date()
    };

    // Validate imported properties
    this.validateElementProperties(elementProps);

    // Update the map
    const currentProperties = this.propertiesSubject.value;
    currentProperties.set(data.elementId, elementProps);
    this.propertiesSubject.next(currentProperties);
  }

  /**
   * Remove properties for an element
   */
  removeElementProperties(elementId: string): void {
    const currentProperties = this.propertiesSubject.value;
    currentProperties.delete(elementId);
    this.propertiesSubject.next(currentProperties);

    // Clear validation results
    this.validationService.clearValidationResults(elementId);
  }

  /**
   * Clear all properties
   */
  clearAllProperties(): void {
    this.propertiesSubject.next(new Map());
    this.selectedElementId = null;
    this.selectedElementSubject.next(null);
  }

  /**
   * Get validation summary across all elements
   */
  getValidationSummary(): Observable<{
    totalElements: number;
    validElements: number;
    invalidElements: number;
    totalErrors: number;
    totalWarnings: number;
  }> {
    return this.validationService.getValidationResults$().pipe(
      map(() => this.validationService.getValidationSummary())
    );
  }

  /**
   * Apply business rules to an element
   */
  applyBusinessRules(elementId: string): void {
    const elementProps = this.getElementProperties(elementId);
    if (!elementProps?.schema?.businessRules) {
      return;
    }

    const context: ValidationContext = {
      elementId,
      elementType: elementProps.elementType,
      elementData: elementProps.properties,
      allElementsData: Array.from(this.propertiesSubject.value.values()).map(ep => ep.properties)
    };

    this.validationService.executeBusinessRules(
      elementProps.schema.businessRules,
      elementProps.properties,
      context
    ).subscribe(results => {
      // Handle business rule results
      results.forEach(result => {
        if (result.action === 'default' && result.target) {
          // Set default value
          this.setProperty(elementId, result.target, result.value);
        } else if (result.action === 'hide' && result.target) {
          // Handle hide/show logic (could be implemented in UI)
          console.log(`Property ${result.target} should be hidden`);
        }
        // Add more business rule actions as needed
      });
    });
  }

  // Private methods

  private validateElementProperties(elementProps: EnhancedElementProperties): void {
    if (!elementProps.schema) {
      return;
    }

    const context: ValidationContext = {
      elementId: elementProps.elementId,
      elementType: elementProps.elementType,
      elementData: elementProps.properties,
      allElementsData: Array.from(this.propertiesSubject.value.values()).map(ep => ep.properties)
    };

    this.validationService.validateElement(
      elementProps.schema,
      elementProps.properties,
      context
    ).subscribe(result => {
      elementProps.validationResult = result;
    });
  }

  private getDefaultValueForType(propDef: PropertyDefinition): any {
    switch (propDef.type) {
      case 'boolean':
        return false;
      case 'number':
        return 0;
      case 'multiSelect':
        return [];
      case 'json':
        return {};
      default:
        return '';
    }
  }

  /**
   * Get custom property value from BPMN extension elements
   */
  private getCustomPropertyFromBpmn(element: any, propertyName: string): string | null {
    const extensionElements = element.businessObject?.extensionElements;
    if (!extensionElements) return null;
    
    const customProperties = extensionElements.values?.find((ext: any) => ext.$type === 'custom:Properties');
    if (!customProperties) return null;
    
    const property = customProperties.properties?.find((prop: any) => prop.name === propertyName);
    return property?.value || null;
  }

  /**
   * Parse custom property value based on its type
   */
  private parseCustomPropertyValue(value: string, propertyType: string): any {
    if (!value) return this.getDefaultValueForPropertyType(propertyType);
    
    switch (propertyType) {
      case 'boolean':
        return value === 'true';
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'multiSelect':
        return value.split(',').map(v => v.trim()).filter(v => v);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      default:
        return value;
    }
  }

  /**
   * Get default value for a property type
   */
  private getDefaultValueForPropertyType(propertyType: string): any {
    switch (propertyType) {
      case 'boolean':
        return false;
      case 'number':
        return 0;
      case 'multiSelect':
        return [];
      case 'json':
        return {};
      default:
        return '';
    }
  }
}
