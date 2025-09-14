import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class CustomPropertiesService {
  private propertiesSubject = new BehaviorSubject<Map<string, ElementProperties>>(new Map());
  private selectedElementId: string | null = null;

  // Public observables
  public properties$ = this.propertiesSubject.asObservable();

  constructor() {}

  /**
   * Gets properties for a specific element
   */
  getElementProperties(elementId: string): ElementProperties | null {
    const propertiesMap = this.propertiesSubject.value;
    return propertiesMap.get(elementId) || null;
  }

  /**
   * Gets properties for the currently selected element
   */
  getSelectedElementProperties(): ElementProperties | null {
    if (!this.selectedElementId) {
      return null;
    }
    return this.getElementProperties(this.selectedElementId);
  }

  /**
   * Sets properties for an element
   */
  setElementProperties(elementId: string, elementType: string, properties: CustomProperty[]): void {
    const propertiesMap = new Map(this.propertiesSubject.value);
    
    const elementProperties: ElementProperties = {
      elementId,
      elementType,
      properties,
      lastModified: new Date()
    };

    propertiesMap.set(elementId, elementProperties);
    this.propertiesSubject.next(propertiesMap);
  }

  /**
   * Updates a specific property for an element
   */
  updateElementProperty(elementId: string, propertyId: string, value: any): void {
    const elementProperties = this.getElementProperties(elementId);
    if (!elementProperties) {
      return;
    }

    const updatedProperties = elementProperties.properties.map(prop => 
      prop.id === propertyId ? { ...prop, value } : prop
    );

    this.setElementProperties(elementId, elementProperties.elementType, updatedProperties);
  }

  /**
   * Adds a new property to an element
   */
  addElementProperty(elementId: string, property: CustomProperty): void {
    const elementProperties = this.getElementProperties(elementId);
    if (!elementProperties) {
      // Create new element properties if none exist
      this.setElementProperties(elementId, 'unknown', [property]);
      return;
    }

    const updatedProperties = [...elementProperties.properties, property];
    this.setElementProperties(elementId, elementProperties.elementType, updatedProperties);
  }

  /**
   * Removes a property from an element
   */
  removeElementProperty(elementId: string, propertyId: string): void {
    const elementProperties = this.getElementProperties(elementId);
    if (!elementProperties) {
      return;
    }

    const updatedProperties = elementProperties.properties.filter(prop => prop.id !== propertyId);
    this.setElementProperties(elementId, elementProperties.elementType, updatedProperties);
  }

  /**
   * Sets the currently selected element
   */
  setSelectedElement(elementId: string | null): void {
    this.selectedElementId = elementId;
  }

  /**
   * Gets default properties for different element types
   */
  getDefaultPropertiesForElementType(elementType: string): CustomProperty[] {
    const defaultProperties: { [key: string]: CustomProperty[] } = {
      'bpmn:StartEvent': [
        {
          id: 'custom',
          name: 'Custom Property',
          value: '',
          type: 'string',
          description: 'Custom property for start event',
          required: false
        }
      ],
      'bpmn:Task': [
        {
          id: 'assignee',
          name: 'Assignee',
          value: '',
          type: 'string',
          description: 'Person assigned to this task',
          required: false
        },
        {
          id: 'priority',
          name: 'Priority',
          value: 'medium',
          type: 'string',
          description: 'Task priority level',
          required: false
        }
      ],
      'bpmn:EndEvent': [
        {
          id: 'result',
          name: 'Result',
          value: '',
          type: 'string',
          description: 'End event result',
          required: false
        }
      ]
    };

    return defaultProperties[elementType] || [];
  }

  /**
   * Initializes default properties for an element if none exist
   */
  initializeElementProperties(elementId: string, elementType: string): void {
    const existingProperties = this.getElementProperties(elementId);
    if (existingProperties) {
      return; // Properties already exist
    }

    const defaultProperties = this.getDefaultPropertiesForElementType(elementType);
    this.setElementProperties(elementId, elementType, defaultProperties);
  }

  /**
   * Validates a property value
   */
  validateProperty(property: CustomProperty): boolean {
    if (property.required && (!property.value || property.value === '')) {
      return false;
    }

    if (property.validation) {
      return property.validation(property.value);
    }

    // Basic type validation
    switch (property.type) {
      case 'number':
        return !isNaN(Number(property.value));
      case 'boolean':
        return typeof property.value === 'boolean' || 
               property.value === 'true' || 
               property.value === 'false';
      case 'date':
        return !isNaN(Date.parse(property.value));
      default:
        return true;
    }
  }

  /**
   * Validates all properties for an element
   */
  validateElementProperties(elementId: string): { isValid: boolean; errors: string[] } {
    const elementProperties = this.getElementProperties(elementId);
    if (!elementProperties) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];
    
    elementProperties.properties.forEach(property => {
      if (!this.validateProperty(property)) {
        errors.push(`Invalid value for property "${property.name}"`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Exports all properties as JSON
   */
  exportProperties(): any {
    const propertiesMap = this.propertiesSubject.value;
    const exported: { [key: string]: ElementProperties } = {};
    
    propertiesMap.forEach((value, key) => {
      exported[key] = value;
    });

    return exported;
  }

  /**
   * Imports properties from JSON
   */
  importProperties(data: any): void {
    const propertiesMap = new Map<string, ElementProperties>();
    
    Object.keys(data).forEach(key => {
      propertiesMap.set(key, data[key]);
    });

    this.propertiesSubject.next(propertiesMap);
  }

  /**
   * Clears all properties
   */
  clearAllProperties(): void {
    this.propertiesSubject.next(new Map());
    this.selectedElementId = null;
  }

  /**
   * Gets an observable for a specific element's properties
   */
  getElementPropertiesObservable(elementId: string): Observable<ElementProperties | null> {
    return new Observable(subscriber => {
      this.properties$.subscribe(propertiesMap => {
        subscriber.next(propertiesMap.get(elementId) || null);
      });
    });
  }
}
