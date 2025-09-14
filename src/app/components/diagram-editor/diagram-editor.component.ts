import { 
  Component, 
  ElementRef, 
  EventEmitter, 
  Input, 
  OnDestroy, 
  OnInit, 
  AfterViewInit,
  Output, 
  ViewChild 
} from '@angular/core';
import { Subscription } from 'rxjs';
import { BpmnService } from '../../services/bpmn.service';
import { DiagramStateService } from '../../services/diagram-state.service';
import { CustomPropertiesService } from '../../services/custom-properties.service';

// Removed DiagramEvent interface - using direct events instead

@Component({
  selector: 'app-diagram-editor',
  templateUrl: './diagram-editor.component.html',
  styleUrls: ['./diagram-editor.component.css'],
  standalone: false
})
export class DiagramEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('diagramContainer', { static: true }) diagramContainer!: ElementRef;
  
  @Input() initialXml?: string;
  @Input() readonly: boolean = false;
  
  @Output() ready = new EventEmitter<void>();
  @Output() error = new EventEmitter<any>();
  @Output() selectionChanged = new EventEmitter<any>();
  @Output() elementChanged = new EventEmitter<any>();
  @Output() importDone = new EventEmitter<any>();

  private subscriptions: Subscription[] = [];
  public isInitialized = false;

  constructor(
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService,
    private customPropertiesService: CustomPropertiesService
  ) {}

  ngOnInit(): void {
    // Wait for view to be initialized before creating the editor
  }

  ngAfterViewInit(): void {
    // Don't initialize here - parent component will handle initialization
    // this.initializeEditor();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Don't destroy the service here as it might be used by other components
  }

  /**
   * Initializes the BPMN editor
   */
  private initializeEditor(): void {
    try {
      // Check if modeler already exists
      let modeler = this.bpmnService.getModeler();
      
      if (!modeler) {
        // Create modeler instance only if it doesn't exist
        modeler = this.bpmnService.createModeler({
          container: this.diagramContainer.nativeElement
        });
      }

      // Attach modeler to DOM
      this.bpmnService.attachModeler(this.diagramContainer.nativeElement);

      // Load initial diagram
      this.loadInitialDiagram();

      this.isInitialized = true;
      this.ready.emit();

    } catch (error) {
      console.error('Failed to initialize diagram editor:', error);
      this.error.emit(error);
    }
  }

  // Event handling removed - parent component handles all BPMN events directly

  /**
   * Loads the initial diagram
   */
  private loadInitialDiagram(): void {
    const xml = this.initialXml || this.bpmnService.getDefaultXML();
    this.importXML(xml);
  }

  /**
   * Imports XML into the editor
   */
  importXML(xml: string): void {
    if (!this.isInitialized) {
      console.warn('Editor not initialized yet');
      return;
    }

    this.bpmnService.importXML(xml).subscribe({
      next: (result) => {
        this.diagramStateService.setDiagramLoaded(xml);
        this.importDone.emit({ warnings: result.warnings });
      },
      error: (error) => {
        console.error('Failed to import XML:', error);
        this.error.emit(error);
      }
    });
  }

  /**
   * Exports the current diagram as XML
   */
  async exportXML(options: { format?: boolean } = {}): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Editor not initialized');
    }

    try {
      const result = await this.bpmnService.exportXML(options);
      
      // Export completed - no event emission needed

      return result.xml || '';
    } catch (error) {
      console.error('Failed to export XML:', error);
      this.error.emit(error);
      throw error;
    }
  }

  /**
   * Exports the current diagram as SVG
   */
  async exportSVG(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Editor not initialized');
    }

    try {
      const result = await this.bpmnService.exportSVG();
      
      // Export completed - no event emission needed

      return result.svg;
    } catch (error) {
      console.error('Failed to export SVG:', error);
      this.error.emit(error);
      throw error;
    }
  }

  /**
   * Zooms the diagram to fit the viewport
   */
  zoomToFit(): void {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const canvas = modeler.get('canvas');
      (canvas as any).zoom('fit-viewport');
    }
  }

  /**
   * Resets the zoom to 100%
   */
  resetZoom(): void {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const canvas = modeler.get('canvas');
      (canvas as any).zoom(1);
    }
  }

  /**
   * Gets the current zoom level
   */
  getZoom(): number {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const canvas = modeler.get('canvas');
      return (canvas as any).zoom();
    }
    return 1;
  }

  /**
   * Sets the zoom level
   */
  setZoom(level: number): void {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const canvas = modeler.get('canvas');
      (canvas as any).zoom(level);
    }
  }

  /**
   * Checks if the editor is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.bpmnService.isReady();
  }

  /**
   * Gets the current selection
   */
  getSelection(): any[] {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const selection = modeler.get('selection');
      return (selection as any).get();
    }
    return [];
  }

  /**
   * Selects elements by ID
   */
  selectElements(elementIds: string[]): void {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const elementRegistry = modeler.get('elementRegistry');
      const selection = modeler.get('selection');
      
      const elements = elementIds
        .map(id => (elementRegistry as any).get(id))
        .filter(element => element);
      
      (selection as any).select(elements);
    }
  }

  /**
   * Clears the current selection
   */
  clearSelection(): void {
    const modeler = this.bpmnService.getModeler();
    if (modeler) {
      const selection = modeler.get('selection');
      (selection as any).select(null);
    }
  }
}
