import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { DiagramState, DiagramStateService } from '../../services/diagram-state.service';
import { DiagramStatusComponent, ValidationInfo } from './diagram-status.component';

describe('DiagramStatusComponent', () => {
  let component: DiagramStatusComponent;
  let fixture: ComponentFixture<DiagramStatusComponent>;
  let stateSubject: BehaviorSubject<DiagramState>;

  const initialState: DiagramState = {
    isLoaded: false,
    isDirty: false,
    currentXML: '',
    selectedElement: null,
    diagramName: 'Untitled Diagram',
    lastModified: new Date()
  };

  beforeEach(async () => {
    stateSubject = new BehaviorSubject<DiagramState>(initialState);

    await TestBed.configureTestingModule({
      imports: [DiagramStatusComponent],
      providers: [
        {
          provide: DiagramStateService,
          useValue: { state$: stateSubject.asObservable() }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagramStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should show "Loading diagram..." when not loaded', () => {
    component.ngOnInit();
    expect(component.currentStatus.message).toBe('Loading diagram...');
    expect(component.currentStatus.type).toBe('info');
  });

  it('should show "Diagram modified" when loaded and dirty', () => {
    component.ngOnInit();
    stateSubject.next({ ...initialState, isLoaded: true, isDirty: true });

    expect(component.currentStatus.message).toBe('Diagram modified');
    expect(component.getStatusClass()).toBe('status-warning');
    expect(component.getStatusIcon()).toBe('⚠');
  });

  it('should show "Ready" when loaded and clean', () => {
    component.ngOnInit();
    stateSubject.next({ ...initialState, isLoaded: true });

    expect(component.currentStatus.message).toBe('Ready');
    expect(component.getStatusClass()).toBe('status-success');
    expect(component.getStatusIcon()).toBe('✓');
  });

  it('should update selection info for selected element', () => {
    component.ngOnInit();
    stateSubject.next({
      ...initialState,
      isLoaded: true,
      selectedElement: { id: 'Task_1', type: 'bpmn:UserTask' }
    });

    expect(component.selectedElementCount).toBe(1);
    expect(component.selectedElementInfo).toContain('User Task');
    expect(component.selectedElementInfo).toContain('Task_1');
  });

  it('should display "No selection" when no element selected', () => {
    component.ngOnInit();
    stateSubject.next({ ...initialState, isLoaded: true, selectedElement: null });

    expect(component.selectedElementCount).toBe(0);
    expect(component.selectedElementInfo).toBe('No selection');
  });

  it('should round zoom level to percentage', () => {
    component.setZoomLevel(1.236);
    expect(component.zoomLevel).toBe(124);

    component.setZoomLevel(0.5);
    expect(component.zoomLevel).toBe(50);
  });

  it('should build validation summary text', () => {
    component.setValidation({
      isValid: false,
      errors: ['missing id', 'missing name'],
      warnings: ['optional warning']
    });

    expect(component.getValidationSummary()).toBe('2 errors, 1 warning');
    expect(component.getValidationIcon()).toBe('✗');
    expect(component.getValidationClass()).toBe('validation-error');
  });

  it('should show "Valid" when validation passes', () => {
    component.setValidation({ isValid: true, errors: [] });
    expect(component.getValidationSummary()).toBe('Valid');
    expect(component.getValidationIcon()).toBe('✓');
    expect(component.getValidationClass()).toBe('validation-success');
  });

  it('should format timestamps', () => {
    const date = new Date(2026, 1, 25, 14, 30, 45);
    const formatted = component.formatTimestamp(date);
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should return empty string for undefined timestamp', () => {
    expect(component.formatTimestamp(undefined)).toBe('');
  });

  it('should report diagram name from state', () => {
    component.ngOnInit();
    stateSubject.next({ ...initialState, diagramName: 'Flow A' });
    expect(component.getDiagramName()).toBe('Flow A');
  });

  it('should report loaded and dirty status', () => {
    component.ngOnInit();
    expect(component.isLoaded()).toBe(false);
    expect(component.hasChanges()).toBe(false);

    stateSubject.next({ ...initialState, isLoaded: true, isDirty: true });
    expect(component.isLoaded()).toBe(true);
    expect(component.hasChanges()).toBe(true);
  });

  it('should determine when to show validation details', () => {
    component.setValidation({ isValid: true, errors: [] });
    expect(component.showValidationDetails()).toBe(false);

    component.setValidation({ isValid: false, errors: ['err'], warnings: [] });
    expect(component.showValidationDetails()).toBe(true);
  });

  it('should return "Just now" for lastModified within the last minute', () => {
    component.ngOnInit();
    stateSubject.next({ ...initialState, isLoaded: true, lastModified: new Date() });
    expect(component.getLastModified()).toBe('Just now');
  });

  it('should return "Xm ago" for lastModified a few minutes ago', () => {
    component.ngOnInit();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    stateSubject.next({ ...initialState, isLoaded: true, lastModified: fiveMinutesAgo });
    expect(component.getLastModified()).toBe('5m ago');
  });

  it('should return "Xh ago" for lastModified over an hour ago', () => {
    component.ngOnInit();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    stateSubject.next({ ...initialState, isLoaded: true, lastModified: twoHoursAgo });
    expect(component.getLastModified()).toBe('2h ago');
  });

  it('should return error icon for error status type', () => {
    component.setStatus({ message: 'Something failed', type: 'error' });
    expect(component.getStatusIcon()).toBe('✗');
    expect(component.getStatusClass()).toBe('status-error');
  });

  it('should not throw when toggleValidationDetails is called', () => {
    expect(() => component.toggleValidationDetails()).not.toThrow();
  });

  it('should show "Initializing..." when diagramState is null', () => {
    component.diagramState = null;
    (component as any).updateStatus();
    expect(component.currentStatus.message).toBe('Initializing...');
    expect(component.currentStatus.type).toBe('info');
  });

  it('should return empty string for getLastModified when no lastModified', () => {
    component.ngOnInit();
    stateSubject.next({ ...initialState, lastModified: undefined as any });
    expect(component.getLastModified()).toBe('');
  });
});
