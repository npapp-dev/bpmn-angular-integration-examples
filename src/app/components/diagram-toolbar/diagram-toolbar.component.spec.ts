import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiagramToolbarComponent, ToolbarAction } from './diagram-toolbar.component';

describe('DiagramToolbarComponent', () => {
  let component: DiagramToolbarComponent;
  let fixture: ComponentFixture<DiagramToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramToolbarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramToolbarComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should return short diagram names unmodified', () => {
    component.diagramName = 'Short';
    expect(component.displayName).toBe('Short');
  });

  it('should truncate long diagram names with ellipsis', () => {
    component.diagramName = 'This is a very long diagram name that should be truncated';
    expect(component.displayName).toHaveLength(25);
    expect(component.displayName.endsWith('...')).toBe(true);
  });

  it('should reflect unsaved status class and text', () => {
    component.hasUnsavedChanges = false;
    expect(component.statusClass).toBe('saved');
    expect(component.statusText).toBe('Saved');

    component.hasUnsavedChanges = true;
    expect(component.statusClass).toBe('unsaved');
    expect(component.statusText).toBe('Unsaved changes');
  });

  it('should emit actionClicked and execute the action callback', () => {
    const actionFn = vi.fn();
    const emitSpy = vi.spyOn(component.actionClicked, 'emit');

    const action: ToolbarAction = {
      id: 'custom',
      label: 'Custom',
      icon: 'C',
      action: actionFn
    };

    component.onActionClick(action);

    expect(actionFn).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('custom');
  });

  it('should mark import and reset as disabled in readonly mode', () => {
    component.isReadonly = true;

    const importAction = component.defaultActions.find(a => a.id === 'import');
    const resetAction = component.defaultActions.find(a => a.id === 'reset');

    expect(importAction?.disabled).toBe(true);
    expect(resetAction?.disabled).toBe(true);
  });

  it('should build correct CSS class for action button', () => {
    const result = component.getActionClass({
      id: 'a1',
      label: 'Action',
      icon: 'A',
      action: () => undefined,
      variant: 'danger',
      disabled: true
    });

    expect(result).toContain('toolbar-btn');
    expect(result).toContain('btn-danger');
    expect(result).toContain('disabled');
  });

  it('should emit specific output events through default actions', () => {
    const importSpy = vi.spyOn(component.importRequested, 'emit');
    const exportXmlSpy = vi.spyOn(component.exportXmlRequested, 'emit');
    const resetSpy = vi.spyOn(component.resetRequested, 'emit');

    component.defaultActions.find(a => a.id === 'import')?.action();
    component.defaultActions.find(a => a.id === 'export-xml')?.action();
    component.defaultActions.find(a => a.id === 'reset')?.action();

    expect(importSpy).toHaveBeenCalled();
    expect(exportXmlSpy).toHaveBeenCalled();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('should report actions in categories', () => {
    expect(component.hasActionsInCategory('file')).toBe(true);
    expect(component.hasActionsInCategory('edit')).toBe(true);
    expect(component.hasActionsInCategory('view')).toBe(true);
    expect(component.hasActionsInCategory('nonexistent')).toBeFalsy();
  });

  it('should provide trackBy using action id', () => {
    const action: ToolbarAction = { id: 'zoom-in', label: '+', icon: '+', action: () => {} };
    expect(component.trackByActionId(0, action)).toBe('zoom-in');
  });

  it('should emit view action events (zoom-to-fit, zoom-in, zoom-out)', () => {
    const zoomToFitSpy = vi.spyOn(component.zoomToFitRequested, 'emit');
    const zoomInSpy = vi.spyOn(component.zoomInRequested, 'emit');
    const zoomOutSpy = vi.spyOn(component.zoomOutRequested, 'emit');

    component.viewActions.find(a => a.id === 'zoom-to-fit')?.action();
    component.viewActions.find(a => a.id === 'zoom-in')?.action();
    component.viewActions.find(a => a.id === 'zoom-out')?.action();

    expect(zoomToFitSpy).toHaveBeenCalled();
    expect(zoomInSpy).toHaveBeenCalled();
    expect(zoomOutSpy).toHaveBeenCalled();
  });

  it('should emit edit action events (undo, redo)', () => {
    const undoSpy = vi.spyOn(component.undoRequested, 'emit');
    const redoSpy = vi.spyOn(component.redoRequested, 'emit');

    component.editActions.find(a => a.id === 'undo')?.action();
    component.editActions.find(a => a.id === 'redo')?.action();

    expect(undoSpy).toHaveBeenCalled();
    expect(redoSpy).toHaveBeenCalled();
  });

  it('should return all action categories from getAllActions', () => {
    const allActions = component.getAllActions();

    expect(allActions).toHaveProperty('file');
    expect(allActions).toHaveProperty('edit');
    expect(allActions).toHaveProperty('view');
    expect(allActions).toHaveProperty('custom');
    expect(allActions.file).toBe(component.defaultActions);
    expect(allActions.edit).toBe(component.editActions);
    expect(allActions.view).toBe(component.viewActions);
    expect(allActions.custom).toEqual([]);
  });
});
