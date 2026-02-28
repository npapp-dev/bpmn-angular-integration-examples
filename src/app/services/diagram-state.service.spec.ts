import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiagramStateService, DiagramState, DiagramAction } from './diagram-state.service';

describe('DiagramStateService', () => {
  let service: DiagramStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiagramStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct initial state', () => {
    const state = service.getCurrentState();
    expect(state.isLoaded).toBe(false);
    expect(state.isDirty).toBe(false);
    expect(state.currentXML).toBe('');
    expect(state.selectedElement).toBeNull();
    expect(state.diagramName).toBe('Untitled Diagram');
    expect(state.lastModified).toBeInstanceOf(Date);
  });

  it('should emit initial state via state$ observable', () => {
    const spy = vi.fn();
    service.state$.subscribe(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted: DiagramState = spy.mock.calls[0][0];
    expect(emitted.isLoaded).toBe(false);
    expect(emitted.currentXML).toBe('');
  });

  it('should emit null as initial action via actions$ observable', () => {
    const spy = vi.fn();
    service.actions$.subscribe(spy);
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('should update partial state via updateState', () => {
    service.updateState({ isDirty: true, diagramName: 'Test' });
    const state = service.getCurrentState();
    expect(state.isDirty).toBe(true);
    expect(state.diagramName).toBe('Test');
    expect(state.isLoaded).toBe(false);
  });

  it('should update lastModified when updateState is called', () => {
    const before = service.getCurrentState().lastModified;
    service.updateState({ isDirty: true });
    const after = service.getCurrentState().lastModified;
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('should set diagram as loaded via setDiagramLoaded', () => {
    const xml = '<xml>test</xml>';
    service.setDiagramLoaded(xml, 'My Diagram');
    const state = service.getCurrentState();
    expect(state.isLoaded).toBe(true);
    expect(state.isDirty).toBe(false);
    expect(state.currentXML).toBe(xml);
    expect(state.diagramName).toBe('My Diagram');
  });

  it('should use default name when setDiagramLoaded is called without name', () => {
    service.setDiagramLoaded('<xml/>');
    expect(service.getDiagramName()).toBe('Untitled Diagram');
  });

  it('should dispatch LOAD action on setDiagramLoaded', () => {
    const spy = vi.fn();
    service.actions$.subscribe(spy);
    spy.mockClear();

    service.setDiagramLoaded('<xml/>', 'Test');
    expect(spy).toHaveBeenCalledTimes(1);
    const action: DiagramAction = spy.mock.calls[0][0];
    expect(action.type).toBe('LOAD');
    expect(action.payload).toEqual({ xml: '<xml/>', diagramName: 'Test' });
    expect(action.timestamp).toBeInstanceOf(Date);
  });

  it('should mark diagram as modified via setDiagramModified', () => {
    service.setDiagramLoaded('<original/>');
    service.setDiagramModified('<modified/>');
    const state = service.getCurrentState();
    expect(state.isDirty).toBe(true);
    expect(state.currentXML).toBe('<modified/>');
  });

  it('should keep existing XML when setDiagramModified called without xml', () => {
    service.setDiagramLoaded('<original/>');
    service.setDiagramModified();
    expect(service.getCurrentXML()).toBe('<original/>');
    expect(service.hasUnsavedChanges()).toBe(true);
  });

  it('should dispatch MODIFY action on setDiagramModified', () => {
    const spy = vi.fn();
    service.actions$.subscribe(spy);
    spy.mockClear();

    service.setDiagramModified('<xml/>');
    const action: DiagramAction = spy.mock.calls[0][0];
    expect(action.type).toBe('MODIFY');
  });

  it('should reset diagram via resetDiagram', () => {
    service.setDiagramLoaded('<xml/>');
    service.setDiagramModified('<changed/>');
    service.setSelectedElement({ id: 'el1' });
    service.resetDiagram();

    const state = service.getCurrentState();
    expect(state.isDirty).toBe(false);
    expect(state.selectedElement).toBeNull();
    expect(state.isLoaded).toBe(true);
  });

  it('should dispatch RESET action on resetDiagram', () => {
    const spy = vi.fn();
    service.actions$.subscribe(spy);
    spy.mockClear();

    service.resetDiagram();
    const action: DiagramAction = spy.mock.calls[0][0];
    expect(action.type).toBe('RESET');
  });

  it('should set selected element via setSelectedElement', () => {
    const element = { id: 'task_1', type: 'bpmn:UserTask' };
    service.setSelectedElement(element);
    expect(service.getSelectedElement()).toEqual(element);
  });

  it('should dispatch SELECT_ELEMENT action on setSelectedElement', () => {
    const spy = vi.fn();
    service.actions$.subscribe(spy);
    spy.mockClear();

    const element = { id: 'el1' };
    service.setSelectedElement(element);
    const action: DiagramAction = spy.mock.calls[0][0];
    expect(action.type).toBe('SELECT_ELEMENT');
    expect(action.payload).toEqual(element);
  });

  it('should mark diagram as exported via setDiagramExported', () => {
    service.setDiagramLoaded('<xml/>');
    service.setDiagramModified('<changed/>');
    expect(service.hasUnsavedChanges()).toBe(true);

    service.setDiagramExported();
    expect(service.hasUnsavedChanges()).toBe(false);
  });

  it('should dispatch EXPORT action on setDiagramExported', () => {
    const spy = vi.fn();
    service.actions$.subscribe(spy);
    spy.mockClear();

    service.setDiagramExported();
    const action: DiagramAction = spy.mock.calls[0][0];
    expect(action.type).toBe('EXPORT');
  });

  it('should set diagram name via setDiagramName', () => {
    service.setDiagramName('New Name');
    expect(service.getDiagramName()).toBe('New Name');
  });

  it('should report hasUnsavedChanges correctly', () => {
    expect(service.hasUnsavedChanges()).toBe(false);
    service.updateState({ isDirty: true });
    expect(service.hasUnsavedChanges()).toBe(true);
  });

  it('should report isLoaded correctly', () => {
    expect(service.isLoaded()).toBe(false);
    service.setDiagramLoaded('<xml/>');
    expect(service.isLoaded()).toBe(true);
  });

  it('should return current XML via getCurrentXML', () => {
    service.setDiagramLoaded('<xml>content</xml>');
    expect(service.getCurrentXML()).toBe('<xml>content</xml>');
  });

  it('should clear state to initial values via clearState', () => {
    service.setDiagramLoaded('<xml/>', 'TestDiagram');
    service.setDiagramModified('<changed/>');
    service.setSelectedElement({ id: 'el1' });

    service.clearState();
    const state = service.getCurrentState();
    expect(state.isLoaded).toBe(false);
    expect(state.isDirty).toBe(false);
    expect(state.currentXML).toBe('');
    expect(state.selectedElement).toBeNull();
    expect(state.diagramName).toBe('Untitled Diagram');
  });

  it('should emit selected state slice via select(key)', () => {
    const values: boolean[] = [];
    service.select('isLoaded').subscribe(v => values.push(v));

    expect(values).toEqual([false]);

    service.setDiagramLoaded('<xml/>');
    expect(values).toEqual([false, true]);
  });

  it('should emit diagramName slice via select', () => {
    const names: string[] = [];
    service.select('diagramName').subscribe(n => names.push(n));

    expect(names[0]).toBe('Untitled Diagram');

    service.setDiagramName('Updated');
    expect(names).toContain('Updated');
  });
});
