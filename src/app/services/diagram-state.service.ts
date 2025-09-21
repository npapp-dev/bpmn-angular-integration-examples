import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DiagramState {
  isLoaded: boolean;
  isDirty: boolean;
  currentXML: string;
  selectedElement?: any;
  diagramName: string;
  lastModified: Date;
}

export interface DiagramAction {
  type: 'LOAD' | 'EXPORT' | 'RESET' | 'MODIFY' | 'SELECT_ELEMENT';
  payload?: any;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DiagramStateService {
  private readonly initialState: DiagramState = {
    isLoaded: false,
    isDirty: false,
    currentXML: '',
    selectedElement: null,
    diagramName: 'Untitled Diagram',
    lastModified: new Date()
  };

  private stateSubject = new BehaviorSubject<DiagramState>(this.initialState);
  private actionsSubject = new BehaviorSubject<DiagramAction | null>(null);

  // Public observables
  public state$ = this.stateSubject.asObservable();
  public actions$ = this.actionsSubject.asObservable();

  constructor() {}

  /**
   * Gets the current diagram state
   */
  getCurrentState(): DiagramState {
    return this.stateSubject.value;
  }

  /**
   * Updates the diagram state
   */
  updateState(partialState: Partial<DiagramState>): void {
    const currentState = this.getCurrentState();
    const newState: DiagramState = {
      ...currentState,
      ...partialState,
      lastModified: new Date()
    };
    
    this.stateSubject.next(newState);
  }

  /**
   * Marks the diagram as loaded with XML content
   */
  setDiagramLoaded(xml: string, diagramName?: string): void {
    this.updateState({
      isLoaded: true,
      isDirty: false,
      currentXML: xml,
      diagramName: diagramName || 'Untitled Diagram'
    });

    this.dispatchAction({
      type: 'LOAD',
      payload: { xml, diagramName },
      timestamp: new Date()
    });
  }

  /**
   * Marks the diagram as modified (dirty)
   */
  setDiagramModified(xml?: string): void {
    this.updateState({
      isDirty: true,
      currentXML: xml || this.getCurrentState().currentXML
    });

    this.dispatchAction({
      type: 'MODIFY',
      payload: { xml },
      timestamp: new Date()
    });
  }

  /**
   * Resets the diagram to initial state
   */
  resetDiagram(): void {
    this.updateState({
      isDirty: false,
      selectedElement: null
    });

    this.dispatchAction({
      type: 'RESET',
      timestamp: new Date()
    });
  }

  /**
   * Sets the currently selected element
   */
  setSelectedElement(element: any): void {
    this.updateState({
      selectedElement: element
    });

    this.dispatchAction({
      type: 'SELECT_ELEMENT',
      payload: element,
      timestamp: new Date()
    });
  }

  /**
   * Marks diagram as exported
   */
  setDiagramExported(): void {
    this.updateState({
      isDirty: false
    });

    this.dispatchAction({
      type: 'EXPORT',
      timestamp: new Date()
    });
  }

  /**
   * Sets the diagram name
   */
  setDiagramName(name: string): void {
    this.updateState({
      diagramName: name
    });
  }

  /**
   * Checks if the diagram has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.getCurrentState().isDirty;
  }

  /**
   * Checks if the diagram is loaded
   */
  isLoaded(): boolean {
    return this.getCurrentState().isLoaded;
  }

  /**
   * Gets the current XML content
   */
  getCurrentXML(): string {
    return this.getCurrentState().currentXML;
  }

  /**
   * Gets the selected element
   */
  getSelectedElement(): any {
    return this.getCurrentState().selectedElement;
  }

  /**
   * Gets the diagram name
   */
  getDiagramName(): string {
    return this.getCurrentState().diagramName;
  }

  /**
   * Resets the entire state to initial values
   */
  clearState(): void {
    this.stateSubject.next(this.initialState);
  }

  /**
   * Dispatches an action
   */
  private dispatchAction(action: DiagramAction): void {
    this.actionsSubject.next(action);
  }

  /**
   * Gets an observable of specific state properties
   */
  select<K extends keyof DiagramState>(key: K): Observable<DiagramState[K]> {
    return new Observable(subscriber => {
      this.state$.subscribe(state => {
        subscriber.next(state[key]);
      });
    });
  }
}
