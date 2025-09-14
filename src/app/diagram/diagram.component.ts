import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { BpmnService, DiagramStateService, CustomPropertiesService, FileService } from '../services';
import { 
  DiagramEditorComponent, 
  PropertiesPanelComponent, 
  DiagramToolbarComponent, 
  DiagramStatusComponent
} from '../components';
import { 
  PropertyChangeEvent,
  ToolbarAction,
  StatusInfo,
  ValidationInfo
} from '../components';

@Component({
  selector: 'app-diagram',
  templateUrl: 'diagram.component.html',
  styleUrls: [
    'diagram.component.css'
  ],
  standalone: false
})
export class DiagramComponent implements OnInit, AfterViewInit, OnDestroy {

  // Child component references
  @ViewChild('diagramEditor') diagramEditor!: DiagramEditorComponent;
  @ViewChild('propertiesPanel') propertiesPanel!: PropertiesPanelComponent;
  @ViewChild('diagramToolbar') diagramToolbar!: DiagramToolbarComponent;
  @ViewChild('diagramStatus') diagramStatus!: DiagramStatusComponent;

  // Component state
  isReady = false;
  isLoading = true;
  currentZoom = 100;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService,
    private customPropertiesService: CustomPropertiesService,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    // Initialize the BPMN modeler with proper configuration after views are ready
    this.initializeBpmnModeler();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.bpmnService.destroy();
  }

  /**
   * Initializes the BPMN modeler with proper configuration
   */
  private initializeBpmnModeler(): void {
    // Get the DOM elements from child components
    const diagramContainer = this.diagramEditor?.diagramContainer?.nativeElement;
    const propertiesContainer = this.propertiesPanel?.propertiesContainer?.nativeElement;

    if (!diagramContainer) {
      console.error('Diagram container not available');
      return;
    }

    // Create modeler with both containers configured
    const modeler = this.bpmnService.createModeler({
      container: diagramContainer,
      propertiesPanel: propertiesContainer ? {
        parent: propertiesContainer
      } : undefined
    });

    // Attach modeler to DOM
    this.bpmnService.attachModeler(diagramContainer, propertiesContainer);

    // Load default diagram
    const defaultXML = this.bpmnService.getDefaultXML();
    this.bpmnService.importXML(defaultXML).subscribe({
      next: (result) => {
        this.diagramStateService.setDiagramLoaded(defaultXML, 'Default Diagram');
        this.isReady = true;
        this.isLoading = false;
        
        // Setup BPMN event listeners after successful import
        this.setupBpmnEventListeners();

        if (this.diagramEditor) {
          this.diagramEditor.isInitialized = true;
          this.diagramEditor.ready.emit();
        }
        
        if (this.propertiesPanel) {
          this.propertiesPanel.reattachPanel();
        }
      },
      error: (error) => {
        console.error('Failed to load default diagram', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Sets up BPMN-specific event listeners
   */
  private setupBpmnEventListeners(): void {
    const modeler = this.bpmnService.getModeler();
    if (!modeler) return;

    // Listen for element selection changes
    modeler.on('selection.changed', (event: any) => {
      const selectedElements = event.newSelection;
      if (selectedElements.length > 0) {
        const element = selectedElements[0];
        this.diagramStateService.setSelectedElement(element);
        this.customPropertiesService.setSelectedElement(element.id, element);
        
        // Initialize custom properties for the element if needed
        this.customPropertiesService.initializeElementProperties(element.id, element);

        // Update validation status
        this.updateValidationStatus();
      } else {
        this.diagramStateService.setSelectedElement(null);
        this.customPropertiesService.setSelectedElement(null);

        // Clear validation status
        if (this.diagramStatus) {
          this.diagramStatus.setValidation({ isValid: true, errors: [] });
        }
      }
    });

    // Listen for element changes
    modeler.on('element.changed', (event: any) => {
      this.diagramStateService.setDiagramModified();
      this.updateValidationStatus();
    });

    // Listen for import completion
    modeler.on('import.done', (event: any) => {
      const { error, warnings } = event;
      if (!error) {
        console.log('Diagram imported successfully', warnings);
        if (this.diagramStatus) {
          this.diagramStatus.setStatus({
            message: 'Diagram imported successfully',
            type: 'success'
          });
        }
      } else {
        console.error('Failed to import diagram', error);
        if (this.diagramStatus) {
          this.diagramStatus.setStatus({
            message: 'Failed to import diagram',
            type: 'error',
            details: error
          });
        }
      }
    });
  }

  /**
   * Sets up component subscriptions
   */
  private setupSubscriptions(): void {
    // Subscribe to diagram state changes
    const stateSubscription = this.diagramStateService.state$.subscribe(state => {
      this.updateStatusFromState(state);
    });

    // Subscribe to property changes for validation updates
    const propertiesSubscription = this.customPropertiesService.properties$.subscribe(() => {
      this.updateValidationStatus();
    });

    this.subscriptions.push(stateSubscription, propertiesSubscription);
  }

  /**
   * Updates status component based on diagram state
   */
  private updateStatusFromState(state: any): void {
    if (!this.diagramStatus) return;

    if (state.isLoaded && !this.isReady) {
      this.isReady = true;
      this.isLoading = false;
      this.diagramStatus.setStatus({
        message: 'Diagram loaded successfully',
        type: 'success'
      });
    }

    // Update zoom level if available
    if (this.diagramEditor?.isReady()) {
      const zoom = this.diagramEditor.getZoom();
      this.currentZoom = Math.round(zoom * 100);
      this.diagramStatus.setZoomLevel(zoom);
    }
  }

  /**
   * Updates validation status
   */
  private updateValidationStatus(): void {
    if (!this.diagramStatus) return;

    const selectedElement = this.diagramStateService.getSelectedElement();
    if (selectedElement) {
      const elementProps = this.customPropertiesService.getElementProperties(selectedElement.id);
      const validationInfo: ValidationInfo = {
        isValid: elementProps?.validationResult?.isValid ?? true,
        errors: elementProps?.validationResult?.errors?.map(e => e.message) ?? [],
        warnings: [] // Could be extended
      };
      this.diagramStatus.setValidation(validationInfo);
    }
  }

  // ===================
  // Editor Event Handlers
  // ===================

  /**
   * Handles editor ready event
   */
  onEditorReady(): void {
    this.isReady = true;
    this.isLoading = false;
    
    if (this.diagramStatus) {
      this.diagramStatus.setStatus({
        message: 'Editor ready',
        type: 'success'
      });
    }
  }

  /**
   * Handles editor errors
   */
  onEditorError(error: any): void {
    console.error('Editor error:', error);
    
    if (this.diagramStatus) {
      this.diagramStatus.setStatus({
        message: 'Editor error occurred',
        type: 'error',
        details: error
      });
    }
  }

  // Individual event handlers removed - using direct service communication

  // ===================
  // Properties Panel Event Handlers
  // ===================

  /**
   * Handles property changes from properties panel
   */
  onPropertyChange(event: PropertyChangeEvent): void {
    this.diagramStateService.setDiagramModified();
    this.updateValidationStatus();
    
    if (this.diagramStatus) {
      this.diagramStatus.setStatus({
        message: `Property "${event.propertyId}" updated`,
        type: 'info'
      });
    }
  }

  /**
   * Handles validation changes from properties panel
   */
  onValidationChange(validation: { isValid: boolean; errors: string[] }): void {
    if (this.diagramStatus) {
      const validationInfo: ValidationInfo = {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: []
      };
      this.diagramStatus.setValidation(validationInfo);
    }
  }

  // ===================
  // Toolbar Event Handlers
  // ===================

  /**
   * Handles toolbar action clicks
   */
  onToolbarAction(actionId: string): void {
    if (this.diagramStatus) {
      this.diagramStatus.setStatus({
        message: `Action "${actionId}" executed`,
        type: 'info'
      });
    }
  }

  /**
   * Handles import request from toolbar
   */
  onImportRequested(): void {
    this.fileService.importFile(['.xml', '.bpmn']).subscribe({
      next: (fileResult) => {
        // Validate XML content
        const validation = this.fileService.validateFileContent(fileResult.content, 'xml');
        if (!validation.isValid) {
          if (this.diagramStatus) {
            this.diagramStatus.setStatus({
              message: 'Invalid XML file',
              type: 'error',
              details: validation.error
            });
          }
      return;
    }

        // Import using editor component
        this.diagramEditor.importXML(fileResult.content);
        
        // Update state
        const diagramName = fileResult.filename.replace(/\.(xml|bpmn)$/i, '');
        this.diagramStateService.setDiagramLoaded(fileResult.content, diagramName);
        this.customPropertiesService.clearAllProperties();
      },
      error: (error) => {
        console.error('Failed to read file', error);
        if (this.diagramStatus) {
          this.diagramStatus.setStatus({
            message: 'Failed to read file',
            type: 'error',
            details: error
          });
        }
      }
    });
  }

  /**
   * Handles XML export request from toolbar
   */
  async onExportXmlRequested(): Promise<void> {
    try {
      const xml = await this.diagramEditor.exportXML({ format: true });
      const diagramName = this.diagramStateService.getDiagramName();
      
      this.fileService.exportFile({
        filename: diagramName || 'diagram',
        format: 'xml',
        content: xml
      });

      this.diagramStateService.setDiagramExported();
    } catch (error) {
      console.error('Failed to export XML', error);
      if (this.diagramStatus) {
        this.diagramStatus.setStatus({
          message: 'Failed to export XML',
          type: 'error',
          details: error
        });
      }
    }
  }

  /**
   * Handles SVG export request from toolbar
   */
  async onExportSvgRequested(): Promise<void> {
    try {
      const svg = await this.diagramEditor.exportSVG();
      const diagramName = this.diagramStateService.getDiagramName();
      
      this.fileService.exportFile({
        filename: diagramName || 'diagram',
        format: 'svg',
        content: svg
      });
    } catch (error) {
      console.error('Failed to export SVG', error);
      if (this.diagramStatus) {
        this.diagramStatus.setStatus({
          message: 'Failed to export SVG',
          type: 'error',
          details: error
        });
      }
    }
  }

  /**
   * Handles reset request from toolbar
   */
  onResetRequested(): void {
    const defaultXML = this.bpmnService.getDefaultXML();
    this.diagramEditor.importXML(defaultXML);
    
    this.diagramStateService.resetDiagram();
    this.diagramStateService.setDiagramLoaded(defaultXML, 'Default Diagram');
    this.customPropertiesService.clearAllProperties();
  }

  /**
   * Handles backup request from toolbar
   */
  async onBackupRequested(): Promise<void> {
    try {
      const xml = await this.diagramEditor.exportXML({ format: true });
      const selectedElement = this.diagramStateService.getSelectedElement();
      const elementProps = selectedElement ? 
        this.customPropertiesService.exportElementProperties(selectedElement.id) : null;
      
      const backupData = {
        xml,
        properties: elementProps,
        state: this.diagramStateService.getCurrentState()
      };

      this.fileService.createBackup(backupData);
    } catch (error) {
      console.error('Failed to create backup', error);
      if (this.diagramStatus) {
        this.diagramStatus.setStatus({
          message: 'Failed to create backup',
          type: 'error',
          details: error
        });
      }
    }
  }

  // ===================
  // View Control Handlers
  // ===================

  onZoomToFitRequested(): void {
    this.diagramEditor.zoomToFit();
    if (this.diagramStatus) {
      this.diagramStatus.setZoomLevel(this.diagramEditor.getZoom());
    }
  }

  onZoomInRequested(): void {
    const currentZoom = this.diagramEditor.getZoom();
    const newZoom = Math.min(currentZoom + 0.1, 3); // Max 300%
    this.diagramEditor.setZoom(newZoom);
    if (this.diagramStatus) {
      this.diagramStatus.setZoomLevel(newZoom);
    }
  }

  onZoomOutRequested(): void {
    const currentZoom = this.diagramEditor.getZoom();
    const newZoom = Math.max(currentZoom - 0.1, 0.1); // Min 10%
    this.diagramEditor.setZoom(newZoom);
    if (this.diagramStatus) {
      this.diagramStatus.setZoomLevel(newZoom);
    }
  }

  onUndoRequested(): void {
    // Implementation depends on BPMN.js undo/redo capabilities
    console.log('Undo requested');
  }

  onRedoRequested(): void {
    // Implementation depends on BPMN.js undo/redo capabilities
    console.log('Redo requested');
  }

  // ===================
  // Public API for Component Access
  // ===================

  /**
   * Gets the current diagram name
   */
  getDiagramName(): string {
    return this.diagramStateService.getDiagramName();
  }

  /**
   * Checks if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.diagramStateService.hasUnsavedChanges();
  }

  /**
   * Checks if the diagram is in readonly mode
   */
  isReadonly(): boolean {
    return false; // Could be made configurable
  }

  /**
   * Gets custom toolbar actions
   */
  getCustomToolbarActions(): ToolbarAction[] {
    return [
      // Custom actions can be added here
    ];
  }
}