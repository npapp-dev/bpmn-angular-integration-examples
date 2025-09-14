import { 
  Component, 
  ElementRef, 
  EventEmitter, 
  Input, 
  OnDestroy, 
  OnInit, 
  Output, 
  ViewChild 
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BpmnService } from '../../services/bpmn.service';
import { DiagramStateService, DiagramState } from '../../services/diagram-state.service';
import { CustomPropertiesService, ElementProperties, CustomProperty } from '../../services/custom-properties.service';

export interface PropertyChangeEvent {
  elementId: string;
  propertyId: string;
  oldValue: any;
  newValue: any;
}

@Component({
  selector: 'app-properties-panel',
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.css'],
  standalone: false
})
export class PropertiesPanelComponent implements OnInit, OnDestroy {
  @ViewChild('propertiesContainer', { static: true }) propertiesContainer!: ElementRef;
  
  @Input() visible: boolean = true;
  @Input() width: number = 300;
  
  @Output() propertyChange = new EventEmitter<PropertyChangeEvent>();
  @Output() validationChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();

  selectedElement: any = null;
  elementProperties: ElementProperties | null = null;
  diagramState: DiagramState | null = null;
  validationResult: { isValid: boolean; errors: string[] } = { isValid: true, errors: [] };
  showAddPropertyForm = false;
  newProperty: Partial<CustomProperty> = {
    name: '',
    type: 'string',
    description: '',
    value: '',
    required: false
  };

  private subscriptions: Subscription[] = [];
  private isPanelAttached = false;

  constructor(
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService,
    private customPropertiesService: CustomPropertiesService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.attachPropertiesPanel();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Sets up component subscriptions
   */
  private setupSubscriptions(): void {
    // Subscribe to diagram state changes
    const stateSubscription = this.diagramStateService.state$.subscribe(state => {
      this.diagramState = state;
      this.selectedElement = state.selectedElement;
      this.updateElementProperties();
    });

    // Subscribe to custom properties changes
    const propertiesSubscription = this.customPropertiesService.properties$.subscribe(() => {
      this.updateElementProperties();
    });

    this.subscriptions.push(stateSubscription, propertiesSubscription);
  }

  /**
   * Attaches the BPMN properties panel to the container
   */
  private attachPropertiesPanel(): void {
    if (this.isPanelAttached) return;

    const modeler = this.bpmnService.getModeler();
    if (modeler && this.propertiesContainer) {
      try {
        const propertiesPanel = modeler.get('propertiesPanel');
        if (propertiesPanel) {
          (propertiesPanel as any).attachTo(this.propertiesContainer.nativeElement);
          this.isPanelAttached = true;
        }
      } catch (error) {
        console.error('Failed to attach properties panel:', error);
        // Retry after a short delay
        setTimeout(() => {
          this.isPanelAttached = false;
          this.attachPropertiesPanel();
        }, 500);
      }
    } else {
      // Retry if modeler is not ready yet
      setTimeout(() => {
        this.attachPropertiesPanel();
      }, 100);
    }
  }

  /**
   * Updates the element properties based on the selected element
   */
  private updateElementProperties(): void {
    if (this.selectedElement && this.selectedElement.id) {
      this.elementProperties = this.customPropertiesService.getElementProperties(this.selectedElement.id);
      this.validateCurrentElement();
    } else {
      this.elementProperties = null;
      this.validationResult = { isValid: true, errors: [] };
    }
  }

  /**
   * Validates the current element's properties
   */
  private validateCurrentElement(): void {
    if (this.selectedElement && this.selectedElement.id) {
      this.validationResult = this.customPropertiesService.validateElementProperties(this.selectedElement.id);
      this.validationChange.emit(this.validationResult);
    }
  }

  /**
   * Updates a custom property value
   */
  updateProperty(propertyId: string, newValue: any): void {
    if (!this.selectedElement || !this.selectedElement.id) return;

    const oldProperty = this.elementProperties?.properties.find(p => p.id === propertyId);
    const oldValue = oldProperty?.value;

    this.customPropertiesService.updateElementProperty(this.selectedElement.id, propertyId, newValue);

    this.propertyChange.emit({
      elementId: this.selectedElement.id,
      propertyId,
      oldValue,
      newValue
    });

    // Re-validate after update
    this.validateCurrentElement();
  }

  /**
   * Adds a new custom property
   */
  addProperty(property: CustomProperty): void {
    if (!this.selectedElement || !this.selectedElement.id) return;

    this.customPropertiesService.addElementProperty(this.selectedElement.id, property);
    this.validateCurrentElement();
  }

  /**
   * Removes a custom property
   */
  removeProperty(propertyId: string): void {
    if (!this.selectedElement || !this.selectedElement.id) return;

    this.customPropertiesService.removeElementProperty(this.selectedElement.id, propertyId);
    this.validateCurrentElement();
  }

  /**
   * Gets the display name for an element type
   */
  getElementTypeDisplay(elementType: string): string {
    const typeMap: { [key: string]: string } = {
      'bpmn:StartEvent': 'Start Event',
      'bpmn:EndEvent': 'End Event',
      'bpmn:Task': 'Task',
      'bpmn:UserTask': 'User Task',
      'bpmn:ServiceTask': 'Service Task',
      'bpmn:Gateway': 'Gateway',
      'bpmn:ExclusiveGateway': 'Exclusive Gateway',
      'bpmn:ParallelGateway': 'Parallel Gateway',
      'bpmn:SequenceFlow': 'Sequence Flow',
      'bpmn:Process': 'Process'
    };

    return typeMap[elementType] || elementType;
  }

  /**
   * Gets validation class for property input
   */
  getPropertyValidationClass(property: CustomProperty): string {
    const isValid = this.customPropertiesService.validateProperty(property);
    return isValid ? 'valid' : 'invalid';
  }

  /**
   * Handles property input changes
   */
  onPropertyInputChange(property: CustomProperty, event: any): void {
    const newValue = event.target.value;
    this.updateProperty(property.id, newValue);
  }

  /**
   * Handles boolean property changes
   */
  onBooleanPropertyChange(property: CustomProperty, event: any): void {
    const newValue = event.target.checked;
    this.updateProperty(property.id, newValue);
  }

  /**
   * Checks if the panel should be visible
   */
  shouldShowPanel(): boolean {
    return this.visible && (this.diagramState?.isLoaded ?? false);
  }

  /**
   * Checks if there is a selected element
   */
  hasSelectedElement(): boolean {
    return this.selectedElement !== null;
  }

  /**
   * Gets the custom properties for the current element
   */
  getCustomProperties(): CustomProperty[] {
    return this.elementProperties?.properties || [];
  }

  /**
   * Reattaches the properties panel (useful for refresh)
   */
  reattachPanel(): void {
    this.isPanelAttached = false;
    setTimeout(() => {
      this.attachPropertiesPanel();
    }, 100);
  }

  /**
   * Exports custom properties as JSON
   */
  exportCustomProperties(): any {
    if (!this.selectedElement || !this.elementProperties) return null;

    return {
      elementId: this.selectedElement.id,
      elementType: this.selectedElement.type,
      properties: this.elementProperties.properties
    };
  }

  /**
   * Imports custom properties from JSON
   */
  importCustomProperties(data: any): void {
    if (!this.selectedElement || !data.properties) return;

    this.customPropertiesService.setElementProperties(
      this.selectedElement.id,
      this.selectedElement.type,
      data.properties
    );
  }

  /**
   * Track by function for property list
   */
  trackByPropertyId(index: number, property: CustomProperty): string {
    return property.id;
  }

  /**
   * Adds a new property to the current element
   */
  addNewProperty(): void {
    if (!this.newProperty.name || !this.selectedElement) return;

    const property: CustomProperty = {
      id: this.generatePropertyId(this.newProperty.name),
      name: this.newProperty.name,
      type: this.newProperty.type as any,
      description: this.newProperty.description,
      value: this.getDefaultValueForType(this.newProperty.type as any),
      required: this.newProperty.required ?? false
    };

    this.addProperty(property);
    this.cancelAddProperty();
  }

  /**
   * Cancels adding a new property
   */
  cancelAddProperty(): void {
    this.showAddPropertyForm = false;
    this.newProperty = {
      name: '',
      type: 'string',
      description: '',
      value: '',
      required: false
    };
  }

  /**
   * Generates a unique property ID
   */
  private generatePropertyId(name: string): string {
    const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existingIds = this.getCustomProperties().map(p => p.id);
    
    let id = baseId;
    let counter = 1;
    
    while (existingIds.includes(id)) {
      id = `${baseId}_${counter}`;
      counter++;
    }
    
    return id;
  }

  /**
   * Gets the default value for a property type
   */
  private getDefaultValueForType(type: 'string' | 'number' | 'boolean' | 'date'): any {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'date':
        return new Date().toISOString().split('T')[0];
      default:
        return '';
    }
  }
}
