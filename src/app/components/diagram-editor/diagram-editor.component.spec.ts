import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bpmn-js', () => ({ default: class {} }));
vi.mock('bpmn-js-properties-panel', () => ({}));
vi.mock('@bpmn-io/properties-panel', () => ({}));

import { BpmnService } from '../../services/bpmn.service';
import { CustomPropertiesService } from '../../services/custom-properties.service';
import { DiagramStateService } from '../../services/diagram-state.service';
import { DiagramEditorComponent } from './diagram-editor.component';

describe('DiagramEditorComponent', () => {
  let component: DiagramEditorComponent;
  let fixture: ComponentFixture<DiagramEditorComponent>;

  let bpmnService: {
    getModeler: ReturnType<typeof vi.fn>;
    importXML: ReturnType<typeof vi.fn>;
    exportXML: ReturnType<typeof vi.fn>;
    exportSVG: ReturnType<typeof vi.fn>;
    isReady: ReturnType<typeof vi.fn>;
    createModeler: ReturnType<typeof vi.fn>;
    attachModeler: ReturnType<typeof vi.fn>;
    getDefaultXML: ReturnType<typeof vi.fn>;
  };
  let diagramStateService: {
    setDiagramLoaded: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    bpmnService = {
      getModeler: vi.fn(),
      importXML: vi.fn(),
      exportXML: vi.fn(),
      exportSVG: vi.fn(),
      isReady: vi.fn(),
      createModeler: vi.fn().mockReturnValue({}),
      attachModeler: vi.fn(),
      getDefaultXML: vi.fn().mockReturnValue('<default />')
    };
    diagramStateService = {
      setDiagramLoaded: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DiagramEditorComponent],
      providers: [
        { provide: BpmnService, useValue: bpmnService },
        { provide: DiagramStateService, useValue: diagramStateService },
        { provide: CustomPropertiesService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramEditorComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not import xml before initialization', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    component.isInitialized = false;
    component.importXML('<xml />');

    expect(warnSpy).toHaveBeenCalledWith('Editor not initialized yet');
    expect(bpmnService.importXML).not.toHaveBeenCalled();
  });

  it('should import xml and emit importDone when initialized', () => {
    const emitSpy = vi.spyOn(component.importDone, 'emit');
    bpmnService.importXML.mockReturnValue(of({ warnings: ['warn-1'] }));

    component.isInitialized = true;
    component.importXML('<xml />');

    expect(diagramStateService.setDiagramLoaded).toHaveBeenCalledWith('<xml />');
    expect(emitSpy).toHaveBeenCalledWith({ warnings: ['warn-1'] });
  });

  it('should throw when exporting xml before initialization', async () => {
    component.isInitialized = false;
    await expect(component.exportXML()).rejects.toThrow('Editor not initialized');
  });

  it('should emit error when import xml fails', () => {
    const error = new Error('import failed');
    const emitSpy = vi.spyOn(component.error, 'emit');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    bpmnService.importXML.mockReturnValue(throwError(() => error));

    component.isInitialized = true;
    component.importXML('<xml />');

    expect(emitSpy).toHaveBeenCalledWith(error);
  });

  it('should export xml when initialized', async () => {
    component.isInitialized = true;
    bpmnService.exportXML.mockResolvedValue({ xml: '<definitions />' });

    const result = await component.exportXML({ format: true });
    expect(result).toBe('<definitions />');
    expect(bpmnService.exportXML).toHaveBeenCalledWith({ format: true });
  });

  it('should export SVG when initialized', async () => {
    component.isInitialized = true;
    bpmnService.exportSVG.mockResolvedValue({ svg: '<svg></svg>' });

    const result = await component.exportSVG();
    expect(result).toBe('<svg></svg>');
  });

  it('should zoom to fit using modeler canvas', () => {
    const zoomFn = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ zoom: zoomFn })
    });

    component.zoomToFit();
    expect(zoomFn).toHaveBeenCalledWith('fit-viewport');
  });

  it('should reset zoom to 100%', () => {
    const zoomFn = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ zoom: zoomFn })
    });

    component.resetZoom();
    expect(zoomFn).toHaveBeenCalledWith(1);
  });

  it('should get current zoom level from canvas', () => {
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ zoom: () => 1.5 })
    });

    expect(component.getZoom()).toBe(1.5);
  });

  it('should return 1 as default zoom when no modeler', () => {
    bpmnService.getModeler.mockReturnValue(null);
    expect(component.getZoom()).toBe(1);
  });

  it('should select found elements by id', () => {
    const selectFn = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: (token: string) => {
        if (token === 'elementRegistry') {
          return { get: (id: string) => (id === 'known' ? { id } : null) };
        }
        if (token === 'selection') {
          return { select: selectFn };
        }
        return null;
      }
    });

    component.selectElements(['known', 'missing']);
    expect(selectFn).toHaveBeenCalledWith([{ id: 'known' }]);
  });

  it('should clear selection', () => {
    const selectFn = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ select: selectFn })
    });

    component.clearSelection();
    expect(selectFn).toHaveBeenCalledWith(null);
  });

  it('should report ready state from modeler', () => {
    component.isInitialized = true;
    bpmnService.isReady.mockReturnValue(true);
    expect(component.isReady()).toBe(true);

    component.isInitialized = false;
    expect(component.isReady()).toBe(false);
  });

  it('should set zoom level via canvas', () => {
    const zoomFn = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ zoom: zoomFn })
    });

    component.setZoom(1.5);
    expect(zoomFn).toHaveBeenCalledWith(1.5);
  });

  it('should return current selection from modeler', () => {
    const mockElements = [{ id: 'Task_1' }, { id: 'Task_2' }];
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ get: () => mockElements })
    });

    expect(component.getSelection()).toEqual(mockElements);
  });

  it('should return empty array for getSelection when no modeler', () => {
    bpmnService.getModeler.mockReturnValue(null);
    expect(component.getSelection()).toEqual([]);
  });

  it('should no-op selectElements when no modeler', () => {
    bpmnService.getModeler.mockReturnValue(null);
    expect(() => component.selectElements(['Task_1'])).not.toThrow();
  });

  it('should no-op clearSelection when no modeler', () => {
    bpmnService.getModeler.mockReturnValue(null);
    expect(() => component.clearSelection()).not.toThrow();
  });

  it('should emit error and re-throw when exportXML fails', async () => {
    component.isInitialized = true;
    const exportError = new Error('export xml failed');
    const emitSpy = vi.spyOn(component.error, 'emit');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    bpmnService.exportXML.mockRejectedValue(exportError);

    await expect(component.exportXML()).rejects.toThrow('export xml failed');
    expect(emitSpy).toHaveBeenCalledWith(exportError);
  });

  it('should throw when exporting SVG before initialization', async () => {
    component.isInitialized = false;
    await expect(component.exportSVG()).rejects.toThrow('Editor not initialized');
  });

  it('should emit error and re-throw when exportSVG fails', async () => {
    component.isInitialized = true;
    const exportError = new Error('export svg failed');
    const emitSpy = vi.spyOn(component.error, 'emit');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    bpmnService.exportSVG.mockRejectedValue(exportError);

    await expect(component.exportSVG()).rejects.toThrow('export svg failed');
    expect(emitSpy).toHaveBeenCalledWith(exportError);
  });

  it('should initialize editor with existing modeler', () => {
    const mockModeler = { id: 'existing' };
    bpmnService.getModeler.mockReturnValue(mockModeler);
    bpmnService.importXML.mockReturnValue(of({ warnings: [] }));
    component.diagramContainer = { nativeElement: document.createElement('div') } as any;

    const readySpy = vi.spyOn(component.ready, 'emit');
    (component as any).initializeEditor();

    expect(bpmnService.createModeler).not.toHaveBeenCalled();
    expect(bpmnService.attachModeler).toHaveBeenCalled();
    expect(component.isInitialized).toBe(true);
    expect(readySpy).toHaveBeenCalled();
  });

  it('should create new modeler when none exists during initialization', async () => {
    bpmnService.getModeler.mockReturnValue(null);
    bpmnService.createModeler.mockResolvedValue({});
    bpmnService.importXML.mockReturnValue(of({ warnings: [] }));
    const containerEl = document.createElement('div');
    component.diagramContainer = { nativeElement: containerEl } as any;

    await (component as any).initializeEditor();

    expect(bpmnService.createModeler).toHaveBeenCalledWith({ container: containerEl });
    expect(bpmnService.attachModeler).toHaveBeenCalledWith(containerEl);
    expect(component.isInitialized).toBe(true);
  });

  it('should emit error when initializeEditor throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const emitSpy = vi.spyOn(component.error, 'emit');
    bpmnService.getModeler.mockImplementation(() => { throw new Error('init fail'); });
    component.diagramContainer = { nativeElement: document.createElement('div') } as any;

    await (component as any).initializeEditor();

    expect(emitSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(component.isInitialized).toBe(false);
  });

  it('should use initialXml when provided during loadInitialDiagram', async () => {
    bpmnService.getModeler.mockReturnValue({});
    component.diagramContainer = { nativeElement: document.createElement('div') } as any;
    component.initialXml = '<custom-xml />';

    await (component as any).initializeEditor();

    expect(bpmnService.getDefaultXML).not.toHaveBeenCalled();
    expect(component.isInitialized).toBe(true);
  });

  it('should use default XML when no initialXml provided during loadInitialDiagram', async () => {
    bpmnService.getModeler.mockReturnValue({});
    component.diagramContainer = { nativeElement: document.createElement('div') } as any;
    component.initialXml = undefined;

    await (component as any).initializeEditor();

    expect(bpmnService.getDefaultXML).toHaveBeenCalled();
    expect(component.isInitialized).toBe(true);
  });

});
