import { Component, OnInit, AfterViewInit, ViewChild, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BpmnService, DiagramStateService, CustomPropertiesService, FileService, LoggerService } from '../services';
import {
  DiagramEditorComponent,
  PropertiesPanelComponent,
  DiagramToolbarComponent,
  DiagramStatusComponent
} from '../components';
import {
  PropertyChangeEvent,
  ToolbarAction,
  ValidationInfo
} from '../components';

@Component({
  selector: 'app-diagram',
  templateUrl: 'diagram.component.html',
  styleUrls: [
    'diagram.component.css'
  ],
  imports: [
    DiagramEditorComponent,
    PropertiesPanelComponent,
    DiagramToolbarComponent,
    DiagramStatusComponent
  ],
  providers: [BpmnService]
})
export class DiagramComponent implements OnInit, AfterViewInit {

  @ViewChild('diagramEditor') diagramEditor!: DiagramEditorComponent;
  @ViewChild('propertiesPanel') propertiesPanel!: PropertiesPanelComponent;
  @ViewChild('diagramToolbar') diagramToolbar!: DiagramToolbarComponent;
  @ViewChild('diagramStatus') diagramStatus!: DiagramStatusComponent;

  isReady = false;
  isLoading = true;
  currentZoom = 100;

  private readonly bpmnService = inject(BpmnService);
  private readonly diagramStateService = inject(DiagramStateService);
  private readonly customPropertiesService = inject(CustomPropertiesService);
  private readonly fileService = inject(FileService);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    void this.initializeBpmnModeler();
  }

  /**
   * Initializes the BPMN modeler with proper configuration.
   * Async because `createModeler` lazy-loads bpmn-js on first call.
   */
  private async initializeBpmnModeler(): Promise<void> {
    // Get the DOM elements from child components
    const diagramContainer = this.diagramEditor?.diagramContainer?.nativeElement;
    const propertiesContainer = this.propertiesPanel?.propertiesContainer?.nativeElement;

    if (!diagramContainer) {
      this.logger.error('Diagram container not available');
      return;
    }

    // Create modeler with both containers configured (lazy-loads bpmn-js).
    await this.bpmnService.createModeler({
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
        this.logger.error('Failed to load default diagram', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Subscribes to BPMN modeler events via the BpmnService reactive API.
   * `takeUntilDestroyed(destroyRef)` ties teardown to the component lifecycle.
   */
  private setupBpmnEventListeners(): void {
    this.bpmnService.selectionChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.newSelection.length > 0) {
          const element = event.newSelection[0];
          this.diagramStateService.setSelectedElement(element);
          this.customPropertiesService.setSelectedElement(element.id, element);
          this.customPropertiesService.initializeElementProperties(element.id, element);
          this.updateValidationStatus();
        } else {
          this.diagramStateService.setSelectedElement(null);
          this.customPropertiesService.setSelectedElement(null);
          if (this.diagramStatus) {
            this.diagramStatus.setValidation({ isValid: true, errors: [] });
          }
        }
      });

    this.bpmnService.elementChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.diagramStateService.setDiagramModified();
        this.updateValidationStatus();
      });

    this.bpmnService.importDone$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ error, warnings }) => {
        if (!error) {
          this.logger.info('Diagram imported successfully', warnings);
          if (this.diagramStatus) {
            this.diagramStatus.setStatus({
              message: 'Diagram imported successfully',
              type: 'success'
            });
          }
        } else {
          this.logger.error('Failed to import diagram', error);
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
    this.diagramStateService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => this.updateStatusFromState(state));

    this.customPropertiesService.properties$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateValidationStatus());
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
    this.logger.error('Editor error:', error);

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
        this.logger.error('Failed to read file', error);
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
      this.logger.error('Failed to export XML', error);
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
      this.logger.error('Failed to export SVG', error);
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
      this.logger.error('Failed to create backup', error);
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
    this.bpmnService.getCommandStack()?.undo();
  }

  onRedoRequested(): void {
    // Implementation depends on BPMN.js undo/redo capabilities
    this.bpmnService.getCommandStack()?.redo();
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
