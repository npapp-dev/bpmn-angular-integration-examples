import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bpmn-js', () => ({ default: class {} }));
vi.mock('bpmn-js-properties-panel', () => ({}));
vi.mock('@bpmn-io/properties-panel', () => ({}));

import { CustomPropertiesService, DiagramStateService, FileService, BpmnService } from '../services';
import { DiagramComponent } from './diagram.component';

describe('DiagramComponent', () => {
  let component: DiagramComponent;
  let fixture: ComponentFixture<DiagramComponent>;

  let bpmnService: {
    getDefaultXML: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    getCommandStack: ReturnType<typeof vi.fn>;
    createModeler: ReturnType<typeof vi.fn>;
    attachModeler: ReturnType<typeof vi.fn>;
    importXML: ReturnType<typeof vi.fn>;
    getModeler: ReturnType<typeof vi.fn>;
  };
  let stateSubject: BehaviorSubject<any>;
  let diagramStateService: {
    state$: any;
    setDiagramModified: ReturnType<typeof vi.fn>;
    setDiagramLoaded: ReturnType<typeof vi.fn>;
    setDiagramExported: ReturnType<typeof vi.fn>;
    getDiagramName: ReturnType<typeof vi.fn>;
    hasUnsavedChanges: ReturnType<typeof vi.fn>;
    getSelectedElement: ReturnType<typeof vi.fn>;
    resetDiagram: ReturnType<typeof vi.fn>;
    getCurrentState: ReturnType<typeof vi.fn>;
    setSelectedElement: ReturnType<typeof vi.fn>;
  };
  let customPropertiesService: {
    properties$: any;
    getElementProperties: ReturnType<typeof vi.fn>;
    clearAllProperties: ReturnType<typeof vi.fn>;
    exportElementProperties: ReturnType<typeof vi.fn>;
    setSelectedElement: ReturnType<typeof vi.fn>;
    initializeElementProperties: ReturnType<typeof vi.fn>;
  };
  let fileService: {
    importFile: ReturnType<typeof vi.fn>;
    validateFileContent: ReturnType<typeof vi.fn>;
    exportFile: ReturnType<typeof vi.fn>;
    createBackup: ReturnType<typeof vi.fn>;
  };

  const initialState = {
    isLoaded: false,
    isDirty: false,
    currentXML: '',
    selectedElement: null,
    diagramName: 'Untitled Diagram',
    lastModified: new Date()
  };

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<any>(initialState);

    bpmnService = {
      getDefaultXML: vi.fn().mockReturnValue('<xml />'),
      destroy: vi.fn(),
      getCommandStack: vi.fn(),
      createModeler: vi.fn().mockReturnValue({}),
      attachModeler: vi.fn(),
      importXML: vi.fn().mockReturnValue(of({ warnings: [] })),
      getModeler: vi.fn().mockReturnValue(null)
    };

    diagramStateService = {
      state$: stateSubject.asObservable(),
      setDiagramModified: vi.fn(),
      setDiagramLoaded: vi.fn(),
      setDiagramExported: vi.fn(),
      getDiagramName: vi.fn().mockReturnValue('Untitled Diagram'),
      hasUnsavedChanges: vi.fn().mockReturnValue(false),
      getSelectedElement: vi.fn().mockReturnValue(null),
      resetDiagram: vi.fn(),
      getCurrentState: vi.fn().mockReturnValue(initialState),
      setSelectedElement: vi.fn()
    };

    customPropertiesService = {
      properties$: of({}),
      getElementProperties: vi.fn(),
      clearAllProperties: vi.fn(),
      exportElementProperties: vi.fn(),
      setSelectedElement: vi.fn(),
      initializeElementProperties: vi.fn()
    };

    fileService = {
      importFile: vi.fn(),
      validateFileContent: vi.fn(),
      exportFile: vi.fn(),
      createBackup: vi.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [DiagramComponent],
      providers: [
        { provide: BpmnService, useValue: bpmnService },
        { provide: DiagramStateService, useValue: diagramStateService },
        { provide: CustomPropertiesService, useValue: customPropertiesService },
        { provide: FileService, useValue: fileService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramComponent);
    component = fixture.componentInstance;

    component.diagramStatus = {
      setStatus: vi.fn(),
      setValidation: vi.fn(),
      setZoomLevel: vi.fn()
    } as any;
    component.diagramEditor = {
      importXML: vi.fn(),
      exportXML: vi.fn(),
      exportSVG: vi.fn(),
      zoomToFit: vi.fn(),
      getZoom: vi.fn().mockReturnValue(1),
      setZoom: vi.fn(),
      isReady: vi.fn().mockReturnValue(false),
      ready: { emit: vi.fn() }
    } as any;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set ready status on editor ready', () => {
    component.onEditorReady();

    expect(component.isReady).toBe(true);
    expect(component.isLoading).toBe(false);
    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith({
      message: 'Editor ready',
      type: 'success'
    });
  });

  it('should handle editor errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('test');
    component.onEditorError(error);

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith({
      message: 'Editor error occurred',
      type: 'error',
      details: error
    });
  });

  it('should handle property change and mark diagram modified', () => {
    component.onPropertyChange({
      elementId: 'Task_1',
      propertyId: 'name',
      oldValue: 'Old',
      newValue: 'New'
    });

    expect(diagramStateService.setDiagramModified).toHaveBeenCalled();
    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith({
      message: 'Property "name" updated',
      type: 'info'
    });
  });

  it('should handle validation change', () => {
    component.onValidationChange({ isValid: false, errors: ['err1'] });

    expect((component.diagramStatus as any).setValidation).toHaveBeenCalledWith({
      isValid: false,
      errors: ['err1'],
      warnings: []
    });
  });

  it('should handle toolbar action', () => {
    component.onToolbarAction('export-xml');

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith({
      message: 'Action "export-xml" executed',
      type: 'info'
    });
  });

  it('should show error when imported xml is invalid', () => {
    fileService.importFile.mockReturnValue(of({
      filename: 'invalid.xml',
      content: '<bad-xml'
    }));
    fileService.validateFileContent.mockReturnValue({
      isValid: false,
      error: 'Invalid XML'
    });

    component.onImportRequested();

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith({
      message: 'Invalid XML file',
      type: 'error',
      details: 'Invalid XML'
    });
    expect((component.diagramEditor as any).importXML).not.toHaveBeenCalled();
  });

  it('should import valid xml and update state', () => {
    fileService.importFile.mockReturnValue(of({
      filename: 'process.bpmn',
      content: '<valid-xml />'
    }));
    fileService.validateFileContent.mockReturnValue({ isValid: true });

    component.onImportRequested();

    expect((component.diagramEditor as any).importXML).toHaveBeenCalledWith('<valid-xml />');
    expect(diagramStateService.setDiagramLoaded).toHaveBeenCalledWith('<valid-xml />', 'process');
    expect(customPropertiesService.clearAllProperties).toHaveBeenCalled();
  });

  it('should export xml and mark state as exported', async () => {
    (component.diagramEditor as any).exportXML.mockResolvedValue('<xml />');
    diagramStateService.getDiagramName.mockReturnValue('my-diagram');

    await component.onExportXmlRequested();

    expect(fileService.exportFile).toHaveBeenCalledWith({
      filename: 'my-diagram',
      format: 'xml',
      content: '<xml />'
    });
    expect(diagramStateService.setDiagramExported).toHaveBeenCalled();
  });

  it('should export SVG', async () => {
    (component.diagramEditor as any).exportSVG.mockResolvedValue('<svg></svg>');
    diagramStateService.getDiagramName.mockReturnValue('my-diagram');

    await component.onExportSvgRequested();

    expect(fileService.exportFile).toHaveBeenCalledWith({
      filename: 'my-diagram',
      format: 'svg',
      content: '<svg></svg>'
    });
  });

  it('should handle export xml failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (component.diagramEditor as any).exportXML.mockRejectedValue(new Error('fail'));

    await component.onExportXmlRequested();

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to export XML', type: 'error' })
    );
  });

  it('should reset diagram to default state', () => {
    bpmnService.getDefaultXML.mockReturnValue('<default />');

    component.onResetRequested();

    expect((component.diagramEditor as any).importXML).toHaveBeenCalledWith('<default />');
    expect(diagramStateService.resetDiagram).toHaveBeenCalled();
    expect(diagramStateService.setDiagramLoaded).toHaveBeenCalledWith('<default />', 'Default Diagram');
    expect(customPropertiesService.clearAllProperties).toHaveBeenCalled();
  });

  it('should zoom in and cap zoom at 300%', () => {
    (component.diagramEditor as any).getZoom.mockReturnValue(2.95);

    component.onZoomInRequested();

    expect((component.diagramEditor as any).setZoom).toHaveBeenCalledWith(3);
    expect((component.diagramStatus as any).setZoomLevel).toHaveBeenCalledWith(3);
  });

  it('should zoom out and floor zoom at 10%', () => {
    (component.diagramEditor as any).getZoom.mockReturnValue(0.15);

    component.onZoomOutRequested();

    expect((component.diagramEditor as any).setZoom).toHaveBeenCalledWith(
      expect.closeTo(0.1, 1)
    );
  });

  it('should zoom to fit', () => {
    (component.diagramEditor as any).getZoom.mockReturnValue(0.8);

    component.onZoomToFitRequested();

    expect((component.diagramEditor as any).zoomToFit).toHaveBeenCalled();
    expect((component.diagramStatus as any).setZoomLevel).toHaveBeenCalledWith(0.8);
  });

  it('should forward undo/redo to command stack', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    bpmnService.getCommandStack.mockReturnValue({ undo, redo });

    component.onUndoRequested();
    component.onRedoRequested();

    expect(undo).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();
  });

  it('should delegate getDiagramName to state service', () => {
    diagramStateService.getDiagramName.mockReturnValue('Test Flow');
    expect(component.getDiagramName()).toBe('Test Flow');
  });

  it('should delegate hasUnsavedChanges to state service', () => {
    diagramStateService.hasUnsavedChanges.mockReturnValue(true);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('should return false for isReadonly', () => {
    expect(component.isReadonly()).toBe(false);
  });

  it('should return empty custom toolbar actions', () => {
    expect(component.getCustomToolbarActions()).toEqual([]);
  });

  it('should create backup with xml and properties', async () => {
    (component.diagramEditor as any).exportXML.mockResolvedValue('<xml />');
    diagramStateService.getSelectedElement.mockReturnValue({ id: 'Task_1' });
    customPropertiesService.exportElementProperties.mockReturnValue({ props: true });
    diagramStateService.getCurrentState.mockReturnValue(initialState);

    await component.onBackupRequested();

    expect(fileService.createBackup).toHaveBeenCalledWith({
      xml: '<xml />',
      properties: { props: true },
      state: initialState
    });
  });

  it('should handle SVG export failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (component.diagramEditor as any).exportSVG.mockRejectedValue(new Error('svg fail'));

    await component.onExportSvgRequested();

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to export SVG', type: 'error' })
    );
  });

  it('should handle import file error from fileService', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fileService.importFile.mockReturnValue(throwError(() => new Error('read error')));

    component.onImportRequested();

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to read file', type: 'error' })
    );
    expect((component.diagramEditor as any).importXML).not.toHaveBeenCalled();
  });

  it('should handle backup failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (component.diagramEditor as any).exportXML.mockRejectedValue(new Error('backup fail'));

    await component.onBackupRequested();

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to create backup', type: 'error' })
    );
  });

  it('should not throw when onValidationChange is called with null diagramStatus', () => {
    component.diagramStatus = null as any;
    expect(() => {
      component.onValidationChange({ isValid: false, errors: ['err'] });
    }).not.toThrow();
  });

  it('should not throw when onEditorError is called with null diagramStatus', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.diagramStatus = null as any;
    expect(() => {
      component.onEditorError(new Error('test'));
    }).not.toThrow();
  });

  it('should not throw when onToolbarAction is called with null diagramStatus', () => {
    component.diagramStatus = null as any;
    expect(() => {
      component.onToolbarAction('export-xml');
    }).not.toThrow();
  });

  it('should not throw when onEditorReady is called with null diagramStatus', () => {
    component.diagramStatus = null as any;
    component.onEditorReady();
    expect(component.isReady).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should not throw when onPropertyChange is called with null diagramStatus', () => {
    component.diagramStatus = null as any;
    expect(() => {
      component.onPropertyChange({
        elementId: 'Task_1',
        propertyId: 'name',
        oldValue: 'Old',
        newValue: 'New'
      });
    }).not.toThrow();
    expect(diagramStateService.setDiagramModified).toHaveBeenCalled();
  });

  it('should subscribe to state changes on ngOnInit and update status', () => {
    component.ngOnInit();

    stateSubject.next({ ...initialState, isLoaded: true, isDirty: false });

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Diagram loaded successfully', type: 'success' })
    );
    expect(component.isReady).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should update zoom level from editor when state changes and editor is ready', () => {
    (component.diagramEditor as any).isReady.mockReturnValue(true);
    (component.diagramEditor as any).getZoom.mockReturnValue(1.5);

    component.ngOnInit();
    component.isReady = true;

    stateSubject.next({ ...initialState, isLoaded: true });

    expect((component.diagramStatus as any).setZoomLevel).toHaveBeenCalledWith(1.5);
    expect(component.currentZoom).toBe(150);
  });

  it('should guard updateStatusFromState when diagramStatus is null', () => {
    component.diagramStatus = null as any;
    component.ngOnInit();

    expect(() => {
      stateSubject.next({ ...initialState, isLoaded: true });
    }).not.toThrow();
  });

  it('should guard updateValidationStatus when diagramStatus is null', () => {
    component.diagramStatus = null as any;
    diagramStateService.getSelectedElement.mockReturnValue({ id: 'Task_1' });
    customPropertiesService.getElementProperties.mockReturnValue({
      validationResult: { isValid: false, errors: [{ message: 'err' }] }
    });

    component.ngOnInit();
    expect(() => {
      stateSubject.next({ ...initialState });
    }).not.toThrow();
  });

  it('should update validation from selected element properties', () => {
    diagramStateService.getSelectedElement.mockReturnValue({ id: 'Task_1' });
    customPropertiesService.getElementProperties.mockReturnValue({
      validationResult: { isValid: false, errors: [{ message: 'Missing name' }] }
    });

    component.ngOnInit();
    stateSubject.next({ ...initialState });

    expect((component.diagramStatus as any).setValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        isValid: false,
        errors: ['Missing name'],
        warnings: []
      })
    );
  });

  it('should handle null validationResult in element properties', () => {
    diagramStateService.getSelectedElement.mockReturnValue({ id: 'Task_1' });
    customPropertiesService.getElementProperties.mockReturnValue({});

    component.ngOnInit();
    stateSubject.next({ ...initialState });

    expect((component.diagramStatus as any).setValidation).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: true, errors: [], warnings: [] })
    );
  });

  it('should unsubscribe and destroy on ngOnDestroy', () => {
    component.ngOnInit();
    component.ngOnDestroy();
    expect(bpmnService.destroy).toHaveBeenCalled();
  });

  it('should initialize modeler on ngAfterViewInit when container is available', () => {
    const containerEl = document.createElement('div');
    const propsEl = document.createElement('div');
    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = {
      propertiesContainer: { nativeElement: propsEl },
      reattachPanel: vi.fn()
    } as any;

    component.ngAfterViewInit();

    expect(bpmnService.createModeler).toHaveBeenCalledWith(
      expect.objectContaining({ container: containerEl })
    );
    expect(bpmnService.attachModeler).toHaveBeenCalledWith(containerEl, propsEl);
    expect(bpmnService.importXML).toHaveBeenCalledWith('<xml />');
    expect(diagramStateService.setDiagramLoaded).toHaveBeenCalledWith('<xml />', 'Default Diagram');
  });

  it('should log error and return when diagramContainer is not available in ngAfterViewInit', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.diagramEditor = { diagramContainer: null } as any;

    component.ngAfterViewInit();

    expect(console.error).toHaveBeenCalledWith('Diagram container not available');
    expect(bpmnService.createModeler).not.toHaveBeenCalled();
  });

  it('should handle import error during ngAfterViewInit initialization', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const containerEl = document.createElement('div');
    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl }
    } as any;
    component.propertiesPanel = null as any;
    bpmnService.importXML.mockReturnValue(throwError(() => new Error('import fail')));

    component.ngAfterViewInit();

    expect(console.error).toHaveBeenCalledWith('Failed to load default diagram', expect.any(Error));
    expect(component.isLoading).toBe(false);
  });

  it('should setup BPMN event listeners after successful import in ngAfterViewInit', () => {
    const containerEl = document.createElement('div');
    const eventHandlers: Record<string, Function> = {};
    const mockModeler = {
      on: vi.fn((event: string, handler: Function) => { eventHandlers[event] = handler; }),
      get: vi.fn()
    };
    bpmnService.getModeler.mockReturnValue(mockModeler);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;

    component.ngAfterViewInit();

    expect(mockModeler.on).toHaveBeenCalledWith('selection.changed', expect.any(Function));
    expect(mockModeler.on).toHaveBeenCalledWith('element.changed', expect.any(Function));
    expect(mockModeler.on).toHaveBeenCalledWith('import.done', expect.any(Function));
  });

  it('should handle selection.changed event with selected elements', () => {
    const containerEl = document.createElement('div');
    const eventHandlers: Record<string, Function> = {};
    const mockModeler = {
      on: vi.fn((event: string, handler: Function) => { eventHandlers[event] = handler; }),
      get: vi.fn()
    };
    bpmnService.getModeler.mockReturnValue(mockModeler);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;
    diagramStateService.getSelectedElement.mockReturnValue(null);

    component.ngAfterViewInit();

    eventHandlers['selection.changed']({ newSelection: [{ id: 'Task_1', type: 'bpmn:Task' }] });

    expect(diagramStateService.setSelectedElement).toHaveBeenCalledWith({ id: 'Task_1', type: 'bpmn:Task' });
    expect(customPropertiesService.setSelectedElement).toHaveBeenCalledWith('Task_1', { id: 'Task_1', type: 'bpmn:Task' });
    expect(customPropertiesService.initializeElementProperties).toHaveBeenCalledWith('Task_1', { id: 'Task_1', type: 'bpmn:Task' });
  });

  it('should handle selection.changed event with empty selection', () => {
    const containerEl = document.createElement('div');
    const eventHandlers: Record<string, Function> = {};
    const mockModeler = {
      on: vi.fn((event: string, handler: Function) => { eventHandlers[event] = handler; }),
      get: vi.fn()
    };
    bpmnService.getModeler.mockReturnValue(mockModeler);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;

    component.ngAfterViewInit();

    eventHandlers['selection.changed']({ newSelection: [] });

    expect(diagramStateService.setSelectedElement).toHaveBeenCalledWith(null);
    expect(customPropertiesService.setSelectedElement).toHaveBeenCalledWith(null);
    expect((component.diagramStatus as any).setValidation).toHaveBeenCalledWith({
      isValid: true, errors: []
    });
  });

  it('should handle element.changed event', () => {
    const containerEl = document.createElement('div');
    const eventHandlers: Record<string, Function> = {};
    const mockModeler = {
      on: vi.fn((event: string, handler: Function) => { eventHandlers[event] = handler; }),
      get: vi.fn()
    };
    bpmnService.getModeler.mockReturnValue(mockModeler);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;

    component.ngAfterViewInit();

    eventHandlers['element.changed']({ element: { id: 'Task_1' } });

    expect(diagramStateService.setDiagramModified).toHaveBeenCalled();
  });

  it('should handle import.done event with success', () => {
    const containerEl = document.createElement('div');
    const eventHandlers: Record<string, Function> = {};
    const mockModeler = {
      on: vi.fn((event: string, handler: Function) => { eventHandlers[event] = handler; }),
      get: vi.fn()
    };
    bpmnService.getModeler.mockReturnValue(mockModeler);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;

    component.ngAfterViewInit();

    eventHandlers['import.done']({ error: null, warnings: [] });

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Diagram imported successfully', type: 'success' })
    );
  });

  it('should handle import.done event with error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const containerEl = document.createElement('div');
    const eventHandlers: Record<string, Function> = {};
    const mockModeler = {
      on: vi.fn((event: string, handler: Function) => { eventHandlers[event] = handler; }),
      get: vi.fn()
    };
    bpmnService.getModeler.mockReturnValue(mockModeler);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;

    component.ngAfterViewInit();

    const importError = new Error('parse error');
    eventHandlers['import.done']({ error: importError, warnings: [] });

    expect((component.diagramStatus as any).setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to import diagram', type: 'error' })
    );
  });

  it('should skip setupBpmnEventListeners when modeler is null', () => {
    const containerEl = document.createElement('div');
    bpmnService.getModeler.mockReturnValue(null);

    component.diagramEditor = {
      ...component.diagramEditor,
      diagramContainer: { nativeElement: containerEl },
      isInitialized: false
    } as any;
    component.propertiesPanel = null as any;

    expect(() => component.ngAfterViewInit()).not.toThrow();
  });

  it('should create backup with null properties when no element selected', async () => {
    (component.diagramEditor as any).exportXML.mockResolvedValue('<xml />');
    diagramStateService.getSelectedElement.mockReturnValue(null);
    diagramStateService.getCurrentState.mockReturnValue(initialState);

    await component.onBackupRequested();

    expect(fileService.createBackup).toHaveBeenCalledWith({
      xml: '<xml />',
      properties: null,
      state: initialState
    });
  });

  it('should use "diagram" as fallback name when getDiagramName returns empty', async () => {
    (component.diagramEditor as any).exportXML.mockResolvedValue('<xml />');
    diagramStateService.getDiagramName.mockReturnValue('');

    await component.onExportXmlRequested();

    expect(fileService.exportFile).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'diagram' })
    );
  });

  it('should use "diagram" as fallback name for SVG export when name is empty', async () => {
    (component.diagramEditor as any).exportSVG.mockResolvedValue('<svg></svg>');
    diagramStateService.getDiagramName.mockReturnValue('');

    await component.onExportSvgRequested();

    expect(fileService.exportFile).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'diagram', format: 'svg' })
    );
  });

  it('should handle undo when command stack is null', () => {
    bpmnService.getCommandStack.mockReturnValue(null);
    expect(() => component.onUndoRequested()).not.toThrow();
  });

  it('should handle redo when command stack is null', () => {
    bpmnService.getCommandStack.mockReturnValue(null);
    expect(() => component.onRedoRequested()).not.toThrow();
  });
});
