import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { BpmnService } from '../../services/bpmn.service';
import { DiagramStateService } from '../../services/diagram-state.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-diagram-editor',
  templateUrl: './diagram-editor.component.html',
  styleUrls: ['./diagram-editor.component.css']
})
export class DiagramEditorComponent {
  @ViewChild('diagramContainer', { static: true }) diagramContainer!: ElementRef;

  @Input() initialXml?: string;
  @Input() readonly: boolean = false;

  @Output() ready = new EventEmitter<void>();
  @Output() error = new EventEmitter<any>();
  @Output() selectionChanged = new EventEmitter<any>();
  @Output() elementChanged = new EventEmitter<any>();
  @Output() importDone = new EventEmitter<any>();

  public isInitialized = false;

  private readonly bpmnService = inject(BpmnService);
  private readonly diagramStateService = inject(DiagramStateService);
  private readonly logger = inject(LoggerService);

  /**
   * Initializes the BPMN editor
   */
  private async initializeEditor(): Promise<void> {
    try {
      let modeler = this.bpmnService.getModeler();

      if (!modeler) {
        modeler = await this.bpmnService.createModeler({
          container: this.diagramContainer.nativeElement
        });
      }

      this.bpmnService.attachModeler(this.diagramContainer.nativeElement);
      this.loadInitialDiagram();

      this.isInitialized = true;
      this.ready.emit();

    } catch (error) {
      this.logger.error('Failed to initialize diagram editor:', error);
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
      this.logger.warn('Editor not initialized yet');
      return;
    }

    this.bpmnService.importXML(xml).subscribe({
      next: (result) => {
        this.diagramStateService.setDiagramLoaded(xml);
        this.importDone.emit({ warnings: result.warnings });
      },
      error: (error) => {
        this.logger.error('Failed to import XML:', error);
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
      this.logger.error('Failed to export XML:', error);
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
      this.logger.error('Failed to export SVG:', error);
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
