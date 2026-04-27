import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bpmn-js', () => ({ default: class {} }));
vi.mock('bpmn-js-properties-panel', () => ({}));
vi.mock('@bpmn-io/properties-panel', () => ({}));

import { PropertyType } from '../../models/bpmn-elements.model';
import { BpmnService } from '../../services/bpmn.service';
import { CustomPropertiesService } from '../../services/custom-properties.service';
import { DiagramStateService } from '../../services/diagram-state.service';
import { ValidationService } from '../../services/validation.service';
import { LoggerService } from '../../services/logger.service';
import { PropertiesPanelComponent } from './properties-panel.component';

describe('PropertiesPanelComponent', () => {
  let component: PropertiesPanelComponent;
  let fixture: ComponentFixture<PropertiesPanelComponent>;

  let selectedElementSubject: BehaviorSubject<any>;
  let validationMapSubject: BehaviorSubject<Map<string, any>>;

  let customPropertiesService: {
    getSelectedElementProperties: ReturnType<typeof vi.fn>;
    getPropertyGroups: ReturnType<typeof vi.fn>;
    setProperty: ReturnType<typeof vi.fn>;
    applyBusinessRules: ReturnType<typeof vi.fn>;
    exportElementProperties: ReturnType<typeof vi.fn>;
  };
  let validationService: {
    getValidationResults$: ReturnType<typeof vi.fn>;
    getValidationResults: ReturnType<typeof vi.fn>;
  };
  let bpmnService: {
    getModeler: ReturnType<typeof vi.fn>;
  };
  let logger: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    selectedElementSubject = new BehaviorSubject<any>(null);
    validationMapSubject = new BehaviorSubject<Map<string, any>>(new Map());

    customPropertiesService = {
      getSelectedElementProperties: vi.fn().mockReturnValue(selectedElementSubject.asObservable()),
      getPropertyGroups: vi.fn().mockReturnValue([]),
      setProperty: vi.fn(),
      applyBusinessRules: vi.fn(),
      exportElementProperties: vi.fn().mockReturnValue({})
    };

    validationService = {
      getValidationResults$: vi.fn().mockReturnValue(validationMapSubject.asObservable()),
      getValidationResults: vi.fn().mockReturnValue(undefined)
    };

    bpmnService = {
      getModeler: vi.fn()
    };

    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PropertiesPanelComponent, FormsModule],
      providers: [
        { provide: CustomPropertiesService, useValue: customPropertiesService },
        { provide: ValidationService, useValue: validationService },
        { provide: BpmnService, useValue: bpmnService },
        { provide: DiagramStateService, useValue: {} },
        { provide: LoggerService, useValue: logger }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesPanelComponent);
    component = fixture.componentInstance;
    component.propertiesContainer = { nativeElement: document.createElement('div') } as any;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should attach the properties panel on init when modeler is available', () => {
    const attachTo = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ attachTo })
    });

    component.ngOnInit();

    expect(attachTo).toHaveBeenCalledWith(component.propertiesContainer.nativeElement);
  });

  it('should update property value, apply rules, and emit change event', () => {
    const emitSpy = vi.spyOn(component.propertyChanged, 'emit');
    bpmnService.getModeler.mockReturnValue(null);

    component.currentElement = {
      elementId: 'Task_1',
      properties: { priority: 'low' }
    } as any;

    component.onPropertyValueChange('priority', 'high');

    expect(customPropertiesService.setProperty).toHaveBeenCalledWith('Task_1', 'priority', 'high');
    expect(customPropertiesService.applyBusinessRules).toHaveBeenCalledWith('Task_1');
    expect(emitSpy).toHaveBeenCalledWith({
      elementId: 'Task_1',
      propertyId: 'priority',
      oldValue: 'low',
      newValue: 'high'
    });
  });

  it('should filter property groups by search term', () => {
    component.propertyGroups = [
      {
        id: 'general',
        label: 'General',
        icon: 'g',
        isExpanded: true,
        properties: [
          { name: 'name', label: 'Name', type: PropertyType.TEXT },
          { name: 'id', label: 'Identifier', type: PropertyType.TEXT }
        ]
      } as any
    ];

    component.onSearchChange('name');

    expect(component.propertyGroups).toHaveLength(1);
    expect(component.propertyGroups[0].properties).toHaveLength(1);
    expect(component.propertyGroups[0].properties[0].name).toBe('name');
  });

  it('should return validation summary text', () => {
    component.validationResult = {
      isValid: false,
      errors: [{ propertyId: 'id', message: 'required', rule: 'required' }],
      warnings: [{ propertyId: 'name', message: 'recommended' }]
    };

    expect(component.getValidationSummary()).toBe('1 error, 1 warning');
  });

  it('should return "All properties are valid" when no issues', () => {
    component.validationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    expect(component.getValidationSummary()).toBe('All properties are valid');
  });

  it('should evaluate conditional visibility', () => {
    component.currentElement = {
      properties: { mode: 'advanced' }
    } as any;

    const visible = component.isPropertyVisible({
      id: 'timeout',
      name: 'timeout',
      label: 'Timeout',
      type: PropertyType.NUMBER,
      conditional: { dependsOn: 'mode', values: ['advanced'] }
    });

    expect(visible).toBe(true);

    const hidden = component.isPropertyVisible({
      id: 'timeout',
      name: 'timeout',
      label: 'Timeout',
      type: PropertyType.NUMBER,
      conditional: { dependsOn: 'mode', values: ['basic'] }
    });

    expect(hidden).toBe(false);
  });

  it('should switch active tab', () => {
    expect(component.activeTab).toBe('properties');
    component.setActiveTab('validation');
    expect(component.activeTab).toBe('validation');
  });

  it('should report validation issues', () => {
    component.validationResult = null;
    expect(component.hasValidationIssues()).toBe(false);

    component.validationResult = { isValid: false, errors: [{ propertyId: 'id', message: 'err', rule: 'req' }], warnings: [] };
    expect(component.hasValidationIssues()).toBe(true);
  });

  it('should get validation errors for specific property', () => {
    component.validationResult = {
      isValid: false,
      errors: [
        { propertyId: 'name', message: 'Name is required', rule: 'required' },
        { propertyId: 'id', message: 'ID is required', rule: 'required' }
      ],
      warnings: []
    };

    const nameErrors = component.getValidationErrorsForProperty('name');
    expect(nameErrors).toEqual(['Name is required']);
  });

  it('should return element type display info', () => {
    component.currentElement = null;
    expect(component.getElementTypeDisplayName()).toBe('Unknown Element');
    expect(component.getElementTypeIcon()).toBe('📋');
    expect(component.getElementTypeDescription()).toBe('');
  });

  // --- setupSubscriptions / selected element path ---

  it('should update currentElement and property groups when element is emitted', () => {
    const element = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { name: 'My Task' },
      schema: { displayName: 'Task', icon: '🔧', description: 'A task', properties: [] },
      lastModified: new Date()
    };

    const groups = [
      { id: 'general', label: 'General', icon: 'g', order: 0, properties: [], isExpanded: true }
    ];
    customPropertiesService.getPropertyGroups.mockReturnValue(groups);

    bpmnService.getModeler.mockReturnValue(null);
    component.ngOnInit();

    selectedElementSubject.next(element);

    expect(component.currentElement).toEqual(element);
    expect(customPropertiesService.getPropertyGroups).toHaveBeenCalledWith('Task_1');
    expect(component.propertyGroups).toEqual(groups);
  });

  it('should clear property groups when null element is emitted', () => {
    bpmnService.getModeler.mockReturnValue(null);
    component.ngOnInit();

    component.propertyGroups = [{ id: 'g', label: 'G', icon: '', order: 0, properties: [], isExpanded: true }];
    selectedElementSubject.next(null);

    expect(component.currentElement).toBeNull();
    expect(component.propertyGroups).toEqual([]);
  });

  // --- setupSubscriptions / validation path ---

  it('should update validationResult when validation map has entry for current element', () => {
    bpmnService.getModeler.mockReturnValue(null);
    component.ngOnInit();

    const element = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    };
    selectedElementSubject.next(element);

    const valResult = { isValid: false, errors: [{ propertyId: 'id', message: 'err', rule: 'required' }], warnings: [] };
    const map = new Map<string, any>();
    map.set('Task_1', valResult);
    validationMapSubject.next(map);

    expect(component.validationResult).toEqual(valResult);
  });

  it('should not update validationResult when validation map has no entry for current element', () => {
    bpmnService.getModeler.mockReturnValue(null);
    component.ngOnInit();

    const element = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    };
    selectedElementSubject.next(element);

    component.validationResult = null;
    const map = new Map<string, any>();
    map.set('Task_99', { isValid: true, errors: [], warnings: [] });
    validationMapSubject.next(map);

    expect(component.validationResult).toBeNull();
  });

  it('should not update validationResult when no currentElement is set', () => {
    bpmnService.getModeler.mockReturnValue(null);
    component.ngOnInit();

    component.validationResult = null;
    const map = new Map<string, any>();
    map.set('Task_1', { isValid: true, errors: [], warnings: [] });
    validationMapSubject.next(map);

    expect(component.validationResult).toBeNull();
  });

  // --- updateValidationResult ---

  it('should set validationResult from validationService when currentElement exists', () => {
    const valResult = { isValid: true, errors: [], warnings: [] };
    validationService.getValidationResults.mockReturnValue(valResult);

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    (component as any).updateValidationResult();

    expect(validationService.getValidationResults).toHaveBeenCalledWith('Task_1');
    expect(component.validationResult).toEqual(valResult);
  });

  it('should set validationResult to null when validationService returns undefined', () => {
    validationService.getValidationResults.mockReturnValue(undefined);

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    (component as any).updateValidationResult();

    expect(component.validationResult).toBeNull();
  });

  it('should set validationResult to null when no currentElement', () => {
    component.currentElement = null;
    component.validationResult = { isValid: true, errors: [], warnings: [] };

    (component as any).updateValidationResult();

    expect(component.validationResult).toBeNull();
  });

  // --- updatePropertyGroups ---

  it('should call getPropertyGroups and apply search filter when searchTerm is set', () => {
    const groups = [
      {
        id: 'general',
        label: 'General',
        icon: 'g',
        order: 0,
        properties: [
          { name: 'name', label: 'Name', type: PropertyType.TEXT },
          { name: 'id', label: 'Identifier', type: PropertyType.TEXT }
        ],
        isExpanded: true
      }
    ];
    customPropertiesService.getPropertyGroups.mockReturnValue(groups);

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;
    component.searchTerm = 'name';

    (component as any).updatePropertyGroups();

    expect(component.propertyGroups).toHaveLength(1);
    expect(component.propertyGroups[0].properties).toHaveLength(1);
    expect(component.propertyGroups[0].properties[0].name).toBe('name');
  });

  // --- reattachPanel ---

  it('should call attachPropertiesPanel when reattachPanel is invoked', () => {
    const attachTo = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: () => ({ attachTo })
    });

    component.reattachPanel();

    expect(attachTo).toHaveBeenCalledWith(component.propertiesContainer.nativeElement);
  });

  // --- attachPropertiesPanel ---

  it('should warn when propertiesContainer is null', () => {
    component.propertiesContainer = null as any;

    (component as any).attachPropertiesPanel();

    expect(logger.warn).toHaveBeenCalledWith('Properties container not available');
  });

  it('should warn when modeler is not available', () => {
    bpmnService.getModeler.mockReturnValue(null);

    (component as any).attachPropertiesPanel();

    expect(logger.warn).toHaveBeenCalledWith('Modeler not available for properties panel');
  });

  it('should handle error during panel attachment', () => {
    bpmnService.getModeler.mockReturnValue({
      get: () => { throw new Error('panel error'); }
    });

    (component as any).attachPropertiesPanel();

    expect(logger.error).toHaveBeenCalledWith('Error attaching properties panel:', expect.any(Error));
  });

  it('should do nothing when propertiesPanel has no attachTo method', () => {
    bpmnService.getModeler.mockReturnValue({
      get: () => ({})
    });

    expect(() => (component as any).attachPropertiesPanel()).not.toThrow();
  });

  // --- onPropertyValueChange with modeler (applyPropertyToBpmnElement paths) ---

  it('should apply id property to bpmn element', () => {
    const updateProperties = vi.fn();
    const element = { id: 'Task_1' };
    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'elementRegistry') return { get: () => element };
        if (service === 'modeling') return { updateProperties };
        return {};
      }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { id: 'Task_1' },
      lastModified: new Date()
    } as any;

    component.onPropertyValueChange('id', 'Task_2');

    expect(updateProperties).toHaveBeenCalledWith(element, { id: 'Task_2' });
  });

  it('should apply name property to bpmn element', () => {
    const updateProperties = vi.fn();
    const element = { id: 'Task_1' };
    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'elementRegistry') return { get: () => element };
        if (service === 'modeling') return { updateProperties };
        return {};
      }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { name: 'Old Name' },
      lastModified: new Date()
    } as any;

    component.onPropertyValueChange('name', 'New Name');

    expect(updateProperties).toHaveBeenCalledWith(element, { name: 'New Name' });
  });

  it('should apply documentation property with non-empty value', () => {
    const updateProperties = vi.fn();
    const element = { id: 'Task_1' };
    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'elementRegistry') return { get: () => element };
        if (service === 'modeling') return { updateProperties };
        return {};
      }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { documentation: '' },
      lastModified: new Date()
    } as any;

    component.onPropertyValueChange('documentation', 'Some docs');

    expect(updateProperties).toHaveBeenCalledWith(element, { documentation: [{ text: 'Some docs' }] });
  });

  it('should apply documentation property with empty value', () => {
    const updateProperties = vi.fn();
    const element = { id: 'Task_1' };
    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'elementRegistry') return { get: () => element };
        if (service === 'modeling') return { updateProperties };
        return {};
      }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { documentation: 'old' },
      lastModified: new Date()
    } as any;

    component.onPropertyValueChange('documentation', '');

    expect(updateProperties).toHaveBeenCalledWith(element, { documentation: [] });
  });

  it('should call updateCustomProperty for default (custom) property', () => {
    const updateProperties = vi.fn();
    const moddle = { create: vi.fn() };
    const element = { id: 'Task_1', businessObject: {} };

    const customPropsContainer = { properties: [] };
    const extElements = { values: [] };
    const customProp = { name: '', value: '', type: '' };

    moddle.create.mockImplementation((type: string) => {
      if (type === 'bpmn:ExtensionElements') return extElements;
      if (type === 'custom:Properties') return customPropsContainer;
      if (type === 'custom:Property') return { ...customProp };
      return {};
    });

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'elementRegistry') return { get: () => element };
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { priority: 'low' },
      lastModified: new Date()
    } as any;
    component.propertyGroups = [
      {
        id: 'custom',
        label: 'Custom',
        icon: 'c',
        order: 0,
        properties: [{ name: 'priority', label: 'Priority', type: PropertyType.TEXT }],
        isExpanded: true
      }
    ];

    component.onPropertyValueChange('priority', 'high');

    expect(updateProperties).toHaveBeenCalledWith(element, { extensionElements: extElements });
  });

  // --- applyPropertyToBpmnElement edge cases ---

  it('should return early from applyPropertyToBpmnElement when element is not found in registry', () => {
    const updateProperties = vi.fn();
    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'elementRegistry') return { get: () => null };
        if (service === 'modeling') return { updateProperties };
        return {};
      }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { name: 'a' },
      lastModified: new Date()
    } as any;

    component.onPropertyValueChange('name', 'b');

    expect(updateProperties).not.toHaveBeenCalled();
  });

  it('should catch and log error from applyPropertyToBpmnElement', () => {
    bpmnService.getModeler.mockReturnValue({
      get: () => { throw new Error('registry fail'); }
    });

    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { name: 'a' },
      lastModified: new Date()
    } as any;

    component.onPropertyValueChange('name', 'b');

    expect(logger.error).toHaveBeenCalledWith('Error applying property to BPMN element:', expect.any(Error));
  });

  // --- updateCustomProperty branches ---

  it('should return early from updateCustomProperty when modeler is null', () => {
    const element = { id: 'Task_1', businessObject: {} };
    bpmnService.getModeler.mockReturnValue(null);

    expect(() => {
      (component as any).updateCustomProperty(element, 'myProp', 'val', PropertyType.TEXT);
    }).not.toThrow();
  });

  it('should create extensionElements and customProperties when they do not exist', () => {
    const updateProperties = vi.fn();
    const extElements = { values: [] as any[] };
    const customPropsContainer = { properties: [] as any[] };
    const customProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'bpmn:ExtensionElements') return extElements;
        if (type === 'custom:Properties') return customPropsContainer;
        if (type === 'custom:Property') return { ...customProp };
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: {} };

    (component as any).updateCustomProperty(element, 'priority', 'high', PropertyType.TEXT);

    expect(moddle.create).toHaveBeenCalledWith('bpmn:ExtensionElements');
    expect(moddle.create).toHaveBeenCalledWith('custom:Properties');
    expect(moddle.create).toHaveBeenCalledWith('custom:Property');
    expect(updateProperties).toHaveBeenCalledWith(element, { extensionElements: extElements });
  });

  it('should use existing extensionElements and create customProperties if missing', () => {
    const updateProperties = vi.fn();
    const existingExtElements = { values: [] as any[] };
    const customPropsContainer = { properties: [] as any[] };
    const customProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Properties') return customPropsContainer;
        if (type === 'custom:Property') return { ...customProp };
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'priority', 'high', PropertyType.TEXT);

    expect(moddle.create).not.toHaveBeenCalledWith('bpmn:ExtensionElements');
    expect(moddle.create).toHaveBeenCalledWith('custom:Properties');
    expect(updateProperties).toHaveBeenCalledWith(element, { extensionElements: existingExtElements });
  });

  it('should reuse existing custom:Properties when present', () => {
    const updateProperties = vi.fn();
    const existingCustomProp = { name: 'priority', value: 'low', type: PropertyType.TEXT };
    const customPropsContainer = { $type: 'custom:Properties', properties: [existingCustomProp] };
    const existingExtElements = { values: [customPropsContainer] };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Property') return { name: '', value: '', type: '' };
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'priority', 'high', PropertyType.TEXT);

    expect(existingCustomProp.value).toBe('high');
    expect(moddle.create).not.toHaveBeenCalledWith('custom:Properties');
  });

  it('should add a new property when property does not exist yet', () => {
    const updateProperties = vi.fn();
    const customPropsContainer = { $type: 'custom:Properties', properties: [] as any[] };
    const existingExtElements = { values: [customPropsContainer] };
    const newProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Property') return newProp;
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'newProp', 'value', PropertyType.TEXT);

    expect(moddle.create).toHaveBeenCalledWith('custom:Property');
    expect(newProp.name).toBe('newProp');
    expect(newProp.value).toBe('value');
    expect(customPropsContainer.properties).toContain(newProp);
  });

  it('should convert boolean value to string', () => {
    const updateProperties = vi.fn();
    const customPropsContainer = { $type: 'custom:Properties', properties: [] as any[] };
    const existingExtElements = { values: [customPropsContainer] };
    const newProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Property') return newProp;
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'isActive', true, PropertyType.BOOLEAN);

    expect(newProp.value).toBe('true');
  });

  it('should convert multi-select array value to comma-separated string', () => {
    const updateProperties = vi.fn();
    const customPropsContainer = { $type: 'custom:Properties', properties: [] as any[] };
    const existingExtElements = { values: [customPropsContainer] };
    const newProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Property') return newProp;
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'tags', ['a', 'b', 'c'], PropertyType.MULTI_SELECT);

    expect(newProp.value).toBe('a,b,c');
  });

  it('should convert object value to JSON string', () => {
    const updateProperties = vi.fn();
    const customPropsContainer = { $type: 'custom:Properties', properties: [] as any[] };
    const existingExtElements = { values: [customPropsContainer] };
    const newProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Property') return newProp;
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'config', { key: 'val' }, PropertyType.JSON);

    expect(newProp.value).toBe('{"key":"val"}');
  });

  it('should set empty string when value is null', () => {
    const updateProperties = vi.fn();
    const customPropsContainer = { $type: 'custom:Properties', properties: [] as any[] };
    const existingExtElements = { values: [customPropsContainer] };
    const newProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Property') return newProp;
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'someProp', null, PropertyType.TEXT);

    expect(newProp.value).toBe('');
  });

  it('should catch and log error from updateCustomProperty', () => {
    bpmnService.getModeler.mockReturnValue({
      get: () => { throw new Error('moddle error'); }
    });

    const element = { id: 'Task_1', businessObject: {} };

    (component as any).updateCustomProperty(element, 'prop', 'val', PropertyType.TEXT);

    expect(logger.error).toHaveBeenCalledWith('Error updating custom property:', expect.any(Error));
  });

  // --- toggleGroup ---

  it('should toggle group.isExpanded from true to false', () => {
    const group = { id: 'g', label: 'G', icon: '', order: 0, properties: [], isExpanded: true };
    component.toggleGroup(group as any);
    expect(group.isExpanded).toBe(false);
  });

  it('should toggle group.isExpanded from false to true', () => {
    const group = { id: 'g', label: 'G', icon: '', order: 0, properties: [], isExpanded: false };
    component.toggleGroup(group as any);
    expect(group.isExpanded).toBe(true);
  });

  // --- onSearchChange ---

  it('should reset filter when search term is empty', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    const fullGroups = [
      {
        id: 'general',
        label: 'General',
        icon: 'g',
        order: 0,
        properties: [
          { name: 'name', label: 'Name', type: PropertyType.TEXT },
          { name: 'id', label: 'Identifier', type: PropertyType.TEXT }
        ],
        isExpanded: true
      }
    ];
    customPropertiesService.getPropertyGroups.mockReturnValue(fullGroups);

    component.onSearchChange('');

    expect(component.searchTerm).toBe('');
    expect(customPropertiesService.getPropertyGroups).toHaveBeenCalledWith('Task_1');
  });

  // --- applySearchFilter ---

  it('should filter properties by description', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    component.propertyGroups = [
      {
        id: 'general',
        label: 'General',
        icon: 'g',
        order: 0,
        properties: [
          { name: 'name', label: 'Name', type: PropertyType.TEXT, description: 'Element name' },
          { name: 'id', label: 'ID', type: PropertyType.TEXT, description: 'Unique identifier' }
        ],
        isExpanded: true
      } as any
    ];

    component.searchTerm = 'unique';
    (component as any).applySearchFilter();

    expect(component.propertyGroups).toHaveLength(1);
    expect(component.propertyGroups[0].properties).toHaveLength(1);
    expect(component.propertyGroups[0].properties[0].name).toBe('id');
  });

  it('should filter properties by name', () => {
    component.propertyGroups = [
      {
        id: 'general',
        label: 'General',
        icon: 'g',
        order: 0,
        properties: [
          { name: 'elementName', label: 'Display', type: PropertyType.TEXT },
          { name: 'elementId', label: 'Display', type: PropertyType.TEXT }
        ],
        isExpanded: true
      } as any
    ];

    component.searchTerm = 'elementId';
    (component as any).applySearchFilter();

    expect(component.propertyGroups).toHaveLength(1);
    expect(component.propertyGroups[0].properties).toHaveLength(1);
    expect(component.propertyGroups[0].properties[0].name).toBe('elementId');
  });

  it('should remove groups with no matching properties', () => {
    component.propertyGroups = [
      {
        id: 'general',
        label: 'General',
        icon: 'g',
        order: 0,
        properties: [
          { name: 'name', label: 'Name', type: PropertyType.TEXT }
        ],
        isExpanded: true
      } as any,
      {
        id: 'advanced',
        label: 'Advanced',
        icon: 'a',
        order: 1,
        properties: [
          { name: 'timeout', label: 'Timeout', type: PropertyType.NUMBER }
        ],
        isExpanded: true
      } as any
    ];

    component.searchTerm = 'timeout';
    (component as any).applySearchFilter();

    expect(component.propertyGroups).toHaveLength(1);
    expect(component.propertyGroups[0].id).toBe('advanced');
  });

  // --- getValidationWarningsForProperty ---

  it('should return warnings for a specific property', () => {
    component.validationResult = {
      isValid: false,
      errors: [],
      warnings: [
        { propertyId: 'name', message: 'Name is recommended' },
        { propertyId: 'desc', message: 'Description is recommended' },
        { propertyId: 'name', message: 'Name should be descriptive' }
      ]
    } as any;

    const warnings = component.getValidationWarningsForProperty('name');
    expect(warnings).toEqual(['Name is recommended', 'Name should be descriptive']);
  });

  it('should return empty array for warnings when validationResult is null', () => {
    component.validationResult = null;
    expect(component.getValidationWarningsForProperty('name')).toEqual([]);
  });

  // --- isPropertyReadonly ---

  it('should return true when property.readonly is true', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    const result = component.isPropertyReadonly({
      id: 'id',
      name: 'id',
      label: 'ID',
      type: PropertyType.TEXT,
      readonly: true
    } as any);

    expect(result).toBe(true);
  });

  it('should return true when currentElement.isReadonly is true', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date(),
      isReadonly: true
    } as any;

    const result = component.isPropertyReadonly({
      id: 'name',
      name: 'name',
      label: 'Name',
      type: PropertyType.TEXT,
      readonly: false
    } as any);

    expect(result).toBe(true);
  });

  it('should return false when neither property nor element is readonly', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date(),
      isReadonly: false
    } as any;

    const result = component.isPropertyReadonly({
      id: 'name',
      name: 'name',
      label: 'Name',
      type: PropertyType.TEXT,
      readonly: false
    } as any);

    expect(result).toBe(false);
  });

  // --- exportProperties ---

  it('should return early when currentElement is null', () => {
    component.currentElement = null;
    component.exportProperties();
    expect(customPropertiesService.exportElementProperties).not.toHaveBeenCalled();
  });

  it('should return early when exported is null', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    customPropertiesService.exportElementProperties.mockReturnValue(null);

    component.exportProperties();

    expect(customPropertiesService.exportElementProperties).toHaveBeenCalledWith('Task_1');
  });

  it('should create a download when exported has data', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: { name: 'Test' },
      lastModified: new Date()
    } as any;

    customPropertiesService.exportElementProperties.mockReturnValue({ name: 'Test' });

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURLSpy = vi.fn();
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy
    } as any);

    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

    component.exportProperties();

    expect(customPropertiesService.exportElementProperties).toHaveBeenCalledWith('Task_1');
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');

    createElementSpy.mockRestore();
  });

  // --- logCurrentState ---

  it('should log current state without error', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;
    component.propertyGroups = [];
    component.validationResult = null;

    component.logCurrentState();

    expect(logger.debug).toHaveBeenCalledWith('Current Element:', component.currentElement);
    expect(logger.debug).toHaveBeenCalledWith('Property Groups:', component.propertyGroups);
    expect(logger.debug).toHaveBeenCalledWith('Validation Result:', component.validationResult);
  });

  // --- onPropertyValidationChange ---

  it('should log property validation change', () => {
    component.onPropertyValidationChange('name', { isValid: false, errors: ['required'] });

    expect(logger.debug).toHaveBeenCalledWith('Property name validation:', { isValid: false, errors: ['required'] });
  });

  // --- element type display with currentElement set ---

  it('should return schema display name when currentElement has schema', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      schema: { displayName: 'User Task', icon: '👤', description: 'A user task element' },
      lastModified: new Date()
    } as any;

    expect(component.getElementTypeDisplayName()).toBe('User Task');
    expect(component.getElementTypeIcon()).toBe('👤');
    expect(component.getElementTypeDescription()).toBe('A user task element');
  });

  // --- isPropertyVisible edge cases ---

  it('should return false when currentElement is null', () => {
    component.currentElement = null;

    const result = component.isPropertyVisible({
      id: 'name',
      name: 'name',
      label: 'Name',
      type: PropertyType.TEXT
    } as any);

    expect(result).toBe(false);
  });

  it('should return true when property has no conditional and visible is not false', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    const result = component.isPropertyVisible({
      id: 'name',
      name: 'name',
      label: 'Name',
      type: PropertyType.TEXT
    } as any);

    expect(result).toBe(true);
  });

  it('should return false when property visible is explicitly false', () => {
    component.currentElement = {
      elementId: 'Task_1',
      elementType: 'bpmn:Task',
      properties: {},
      lastModified: new Date()
    } as any;

    const result = component.isPropertyVisible({
      id: 'name',
      name: 'name',
      label: 'Name',
      type: PropertyType.TEXT,
      visible: false
    } as any);

    expect(result).toBe(false);
  });

  // --- getValidationSummary edge cases ---

  it('should return empty string when validationResult is null', () => {
    component.validationResult = null;
    expect(component.getValidationSummary()).toBe('');
  });

  it('should use plural form for multiple errors and warnings', () => {
    component.validationResult = {
      isValid: false,
      errors: [
        { propertyId: 'id', message: 'required', rule: 'required' },
        { propertyId: 'name', message: 'required', rule: 'required' }
      ],
      warnings: [
        { propertyId: 'desc', message: 'recommended' },
        { propertyId: 'doc', message: 'recommended' }
      ]
    } as any;

    expect(component.getValidationSummary()).toBe('2 errors, 2 warnings');
  });

  // --- onPropertyValueChange when currentElement is null ---

  it('should return early when currentElement is null on property change', () => {
    component.currentElement = null;
    const emitSpy = vi.spyOn(component.propertyChanged, 'emit');

    component.onPropertyValueChange('name', 'test');

    expect(emitSpy).not.toHaveBeenCalled();
    expect(customPropertiesService.setProperty).not.toHaveBeenCalled();
  });

  // --- extensionElements with values but no custom:Properties ---

  it('should handle extensionElements with values array that has no custom:Properties', () => {
    const updateProperties = vi.fn();
    const existingExtElements = { values: [{ $type: 'other:Extension' }] };
    const customPropsContainer = { properties: [] as any[] };
    const newProp = { name: '', value: '', type: '' };

    const moddle = {
      create: vi.fn().mockImplementation((type: string) => {
        if (type === 'custom:Properties') return customPropsContainer;
        if (type === 'custom:Property') return newProp;
        return {};
      })
    };

    bpmnService.getModeler.mockReturnValue({
      get: (service: string) => {
        if (service === 'modeling') return { updateProperties };
        if (service === 'moddle') return moddle;
        return {};
      }
    });

    const element = { id: 'Task_1', businessObject: { extensionElements: existingExtElements } };

    (component as any).updateCustomProperty(element, 'myProp', 'myVal', PropertyType.TEXT);

    expect(moddle.create).toHaveBeenCalledWith('custom:Properties');
    expect(moddle.create).toHaveBeenCalledWith('custom:Property');
    expect(existingExtElements.values).toHaveLength(2);
    expect(updateProperties).toHaveBeenCalledWith(element, { extensionElements: existingExtElements });
  });
});
