import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DiagramStateService, DiagramState } from '../../services/diagram-state.service';

export interface StatusInfo {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp?: Date;
  details?: any;
}

export interface ValidationInfo {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

@Component({
  selector: 'app-diagram-status',
  templateUrl: './diagram-status.component.html',
  styleUrls: ['./diagram-status.component.css'],
  standalone: false
})
export class DiagramStatusComponent implements OnInit, OnDestroy {
  @Input() showDetails: boolean = true;
  @Input() showValidation: boolean = true;
  @Input() showZoom: boolean = true;
  @Input() showSelection: boolean = true;

  diagramState: DiagramState | null = null;
  currentStatus: StatusInfo = {
    message: 'Ready',
    type: 'info'
  };
  
  validationInfo: ValidationInfo = {
    isValid: true,
    errors: [],
    warnings: []
  };

  zoomLevel: number = 100;
  selectedElementCount: number = 0;
  selectedElementInfo: string = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private diagramStateService: DiagramStateService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
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
      this.updateStatus();
      this.updateSelectionInfo();
    });

    this.subscriptions.push(stateSubscription);
  }

  /**
   * Updates the status based on diagram state
   */
  private updateStatus(): void {
    if (!this.diagramState) {
      this.currentStatus = {
        message: 'Initializing...',
        type: 'info',
        timestamp: new Date()
      };
      return;
    }

    if (!this.diagramState.isLoaded) {
      this.currentStatus = {
        message: 'Loading diagram...',
        type: 'info',
        timestamp: new Date()
      };
    } else if (this.diagramState.isDirty) {
      this.currentStatus = {
        message: 'Diagram modified',
        type: 'warning',
        timestamp: new Date()
      };
    } else {
      this.currentStatus = {
        message: 'Ready',
        type: 'success',
        timestamp: new Date()
      };
    }
  }

  /**
   * Updates selection information
   */
  private updateSelectionInfo(): void {
    if (!this.diagramState?.selectedElement) {
      this.selectedElementCount = 0;
      this.selectedElementInfo = 'No selection';
      return;
    }

    this.selectedElementCount = 1;
    const element = this.diagramState.selectedElement;
    this.selectedElementInfo = `${this.getElementTypeDisplay(element.type)} (${element.id})`;
  }

  /**
   * Sets custom status
   */
  setStatus(status: StatusInfo): void {
    this.currentStatus = {
      ...status,
      timestamp: status.timestamp || new Date()
    };
  }

  /**
   * Sets validation information
   */
  setValidation(validation: ValidationInfo): void {
    this.validationInfo = validation;
  }

  /**
   * Updates zoom level
   */
  setZoomLevel(level: number): void {
    this.zoomLevel = Math.round(level * 100);
  }

  /**
   * Gets the display name for an element type
   */
  private getElementTypeDisplay(elementType: string): string {
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

    return typeMap[elementType] || elementType.replace('bpmn:', '');
  }

  /**
   * Gets the CSS class for status type
   */
  getStatusClass(): string {
    return `status-${this.currentStatus.type}`;
  }

  /**
   * Gets the status icon
   */
  getStatusIcon(): string {
    switch (this.currentStatus.type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return 'ℹ';
    }
  }

  /**
   * Gets validation icon
   */
  getValidationIcon(): string {
    if (this.validationInfo.isValid) {
      return '✓';
    } else if (this.validationInfo.errors.length > 0) {
      return '✗';
    } else {
      return '⚠';
    }
  }

  /**
   * Gets validation class
   */
  getValidationClass(): string {
    if (this.validationInfo.isValid) {
      return 'validation-success';
    } else if (this.validationInfo.errors.length > 0) {
      return 'validation-error';
    } else {
      return 'validation-warning';
    }
  }

  /**
   * Gets validation summary text
   */
  getValidationSummary(): string {
    if (this.validationInfo.isValid) {
      return 'Valid';
    }

    const errorCount = this.validationInfo.errors.length;
    const warningCount = this.validationInfo.warnings?.length || 0;
    
    const parts: string[] = [];
    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  }

  /**
   * Formats timestamp for display
   */
  formatTimestamp(timestamp?: Date): string {
    if (!timestamp) return '';
    
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Gets the diagram name for display
   */
  getDiagramName(): string {
    return this.diagramState?.diagramName || 'Untitled';
  }

  /**
   * Gets the last modified time
   */
  getLastModified(): string {
    if (!this.diagramState?.lastModified) return '';
    
    const now = new Date();
    const modified = new Date(this.diagramState.lastModified);
    const diffMs = now.getTime() - modified.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h ago`;
    }
  }

  /**
   * Checks if diagram is loaded
   */
  isLoaded(): boolean {
    return this.diagramState?.isLoaded || false;
  }

  /**
   * Checks if diagram has changes
   */
  hasChanges(): boolean {
    return this.diagramState?.isDirty || false;
  }

  /**
   * Shows detailed validation errors/warnings
   */
  showValidationDetails(): boolean {
    return !this.validationInfo.isValid && 
           (this.validationInfo.errors.length > 0 || 
            (this.validationInfo.warnings?.length || 0) > 0);
  }

  /**
   * Toggles validation details visibility
   */
  toggleValidationDetails(): void {
    // Implementation for expanding/collapsing validation details
    // This would be handled by a local state property
  }
}
