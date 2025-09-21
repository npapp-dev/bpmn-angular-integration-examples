/**
 * Enhanced Properties Panel Component
 * Displays and manages comprehensive BPMN element properties with validation
 */

import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  ChangeDetectorRef,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { Subscription } from 'rxjs';
import { 
  CustomPropertiesService, 
  EnhancedElementProperties, 
  PropertyGroup 
} from '../../services/custom-properties.service';
import { 
  PropertyDefinition, 
  PropertyValidationResult,
  BpmnElementType 
} from '../../models/bpmn-elements.model';
import { ValidationService } from '../../services/validation.service';
import { BpmnService } from '../../services/bpmn.service';
import { DiagramStateService } from '../../services/diagram-state.service';

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
  @Input() selectedElementId: string | null = null;
  @Output() propertyChanged = new EventEmitter<PropertyChangeEvent>();

  // Component state
  currentElement: EnhancedElementProperties | null = null;
  propertyGroups: PropertyGroup[] = [];
  validationResult: PropertyValidationResult | null = null;
  isLoading: boolean = false;
  searchTerm: string = '';
  activeTab: 'properties' | 'validation' | 'preview' = 'properties';
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private customPropertiesService: CustomPropertiesService,
    private validationService: ValidationService,
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.attachPropertiesPanel();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions(): void {
    // Listen to selected element changes
    const selectedElementSub = this.customPropertiesService.getSelectedElementProperties()
      .subscribe(elementProps => {
        this.currentElement = elementProps || null;
        this.updatePropertyGroups();
        this.updateValidationResult();
        this.cdr.detectChanges();
      });

    // Listen to validation results
    const validationSub = this.validationService.getValidationResults$()
      .subscribe(validationMap => {
        if (this.currentElement) {
          const result = validationMap.get(this.currentElement.elementId);
          if (result) {
            this.validationResult = result;
            this.cdr.detectChanges();
          }
        }
      });

    this.subscriptions.push(selectedElementSub, validationSub);
  }

  private updatePropertyGroups(): void {
    if (!this.currentElement) {
      this.propertyGroups = [];
      return;
    }

    this.propertyGroups = this.customPropertiesService.getPropertyGroups(this.currentElement.elementId);
    
    // Apply search filter if active
    if (this.searchTerm) {
      this.applySearchFilter();
    }
  }

  private updateValidationResult(): void {
    if (!this.currentElement) {
      this.validationResult = null;
      return;
    }

    this.validationResult = this.validationService.getValidationResults(this.currentElement.elementId) || null;
  }

  reattachPanel(): void {
    this.attachPropertiesPanel();
  }

  private attachPropertiesPanel(): void {
    const container = this.propertiesContainer?.nativeElement;
    if (!container) {
      console.warn('Properties container not available');
      return;
    }

    const modeler = this.bpmnService.getModeler();
    if (!modeler) {
      console.warn('Modeler not available for properties panel');
      return;
    }

    try {
      const propertiesPanel = (modeler as any).get('propertiesPanel');
      if (propertiesPanel && propertiesPanel.attachTo) {
        (propertiesPanel as any).attachTo(container);
        console.log('Properties panel attached successfully');
      }
    } catch (error) {
      console.error('Error attaching properties panel:', error);
    }
  }

  // Property value change handlers
  onPropertyValueChange(propertyId: string, newValue: any): void {
    if (!this.currentElement) return;

    const oldValue = this.currentElement.properties[propertyId];
    
    // Update the property
    this.customPropertiesService.setProperty(this.currentElement.elementId, propertyId, newValue);
    
    // Apply to BPMN element if it affects the model
    this.applyPropertyToBpmnElement(propertyId, newValue);
    
    // Emit change event
    this.propertyChanged.emit({
      elementId: this.currentElement.elementId,
      propertyId,
      oldValue,
      newValue
    });

    // Apply business rules
    this.customPropertiesService.applyBusinessRules(this.currentElement.elementId);
  }

  onPropertyValidationChange(propertyId: string, validation: { isValid: boolean; errors: string[] }): void {
    // Handle individual property validation updates
    console.log(`Property ${propertyId} validation:`, validation);
  }

  private applyPropertyToBpmnElement(propertyId: string, value: any): void {
    const modeler = this.bpmnService.getModeler();
    if (!modeler || !this.currentElement) return;

    try {
      const elementRegistry = (modeler as any).get('elementRegistry');
      const modeling = (modeler as any).get('modeling');
      
      const element = elementRegistry.get(this.currentElement.elementId);
      if (!element) return;

      // Apply specific properties to BPMN model
      switch (propertyId) {
        case 'id':
          modeling.updateProperties(element, { id: value });
          break;
        case 'name':
          modeling.updateProperties(element, { name: value });
          break;
        case 'documentation':
          // Handle documentation property
          const documentation = value ? [{ text: value }] : [];
          modeling.updateProperties(element, { documentation });
          break;
        default:
          // For custom properties, add to extension elements
          this.updateCustomProperty(element, propertyId, value);
          break;
      }
    } catch (error) {
      console.error('Error applying property to BPMN element:', error);
    }
  }

  private updateCustomProperty(element: any, propertyId: string, value: any): void {
    // Implementation for updating custom properties in BPMN extension elements
    // This would typically involve updating the extensionElements of the business object
    console.log(`Updating custom property ${propertyId} to ${value} for element ${element.id}`);
  }

  // UI interaction methods
  toggleGroup(group: PropertyGroup): void {
    group.isExpanded = !group.isExpanded;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.applySearchFilter();
  }

  private applySearchFilter(): void {
    if (!this.searchTerm.trim()) {
      this.updatePropertyGroups();
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.propertyGroups = this.propertyGroups.map(group => ({
      ...group,
      properties: group.properties.filter(prop => 
        prop.label.toLowerCase().includes(searchLower) ||
        prop.description?.toLowerCase().includes(searchLower) ||
        prop.name.toLowerCase().includes(searchLower)
      )
    })).filter(group => group.properties.length > 0);
  }

  setActiveTab(tab: 'properties' | 'validation' | 'preview'): void {
    this.activeTab = tab;
  }

  // Validation helpers
  getValidationErrorsForProperty(propertyId: string): string[] {
    if (!this.validationResult) return [];
    return this.validationResult.errors
      .filter(error => error.propertyId === propertyId)
      .map(error => error.message);
  }

  getValidationWarningsForProperty(propertyId: string): string[] {
    if (!this.validationResult) return [];
    return this.validationResult.warnings
      .filter(warning => warning.propertyId === propertyId)
      .map(warning => warning.message);
  }

  hasValidationIssues(): boolean {
    return !!(this.validationResult && 
      (this.validationResult.errors.length > 0 || this.validationResult.warnings.length > 0));
  }

  getValidationSummary(): string {
    if (!this.validationResult) return '';
    
    const errorCount = this.validationResult.errors.length;
    const warningCount = this.validationResult.warnings.length;
    
    if (errorCount === 0 && warningCount === 0) {
      return 'All properties are valid';
    }
    
    const parts: string[] = [];
    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  }

  // Element type helpers
  getElementTypeDisplayName(): string {
    return this.currentElement?.schema?.displayName || 'Unknown Element';
  }

  getElementTypeIcon(): string {
    return this.currentElement?.schema?.icon || '📋';
  }

  getElementTypeDescription(): string {
    return this.currentElement?.schema?.description || '';
  }

  // Utility methods
  isPropertyVisible(property: PropertyDefinition): boolean {
    if (!this.currentElement) return false;

    // Check conditional visibility
    if (property.conditional) {
      const dependentValue = this.currentElement.properties[property.conditional.dependsOn];
      return property.conditional.values.includes(dependentValue);
    }

    return property.visible !== false;
  }

  isPropertyReadonly(property: PropertyDefinition): boolean {
    return property.readonly || this.currentElement?.isReadonly || false;
  }

  exportProperties(): void {
    if (!this.currentElement) return;
    
    const exported = this.customPropertiesService.exportElementProperties(this.currentElement.elementId);
    if (exported) {
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentElement.elementId}_properties.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Debug helpers (can be removed in production)
  logCurrentState(): void {
    console.log('Current Element:', this.currentElement);
    console.log('Property Groups:', this.propertyGroups);
    console.log('Validation Result:', this.validationResult);
  }
}
