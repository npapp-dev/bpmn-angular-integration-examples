vi.mock('bpmn-js', () => ({ default: class {} }));
vi.mock('bpmn-js-properties-panel', () => ({}));
vi.mock('@bpmn-io/properties-panel', () => ({}));

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { CustomPropertiesService, EnhancedElementProperties } from './custom-properties.service';
import { ValidationService } from './validation.service';
import { BpmnElementType, PropertyType } from '../models/bpmn-elements.model';

function makeElement(type: string = 'bpmn:UserTask', overrides: any = {}) {
  return {
    type,
    businessObject: {
      id: overrides.id || 'el_1',
      name: overrides.name || 'Test Element',
      ...overrides.businessObject
    },
    ...overrides
  };
}

describe('CustomPropertiesService', () => {
  let service: CustomPropertiesService;
  let validationService: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValidationService]
    });
    validationService = TestBed.inject(ValidationService);
    service = TestBed.inject(CustomPropertiesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- setSelectedElement ---
  it('should set selected element to null', async () => {
    service.setSelectedElement(null);
    const id = await firstValueFrom(service.selectedElement$);
    expect(id).toBeNull();
  });

  it('should set selected element and initialize properties', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('el_1', element);

    const props = service.getElementProperties('el_1');
    expect(props).toBeDefined();
    expect(props!.elementId).toBe('el_1');
    expect(props!.elementType).toBe('bpmn:UserTask');
  });

  it('should emit selected element id via selectedElement$', async () => {
    service.setSelectedElement('abc', makeElement('bpmn:UserTask', { id: 'abc', businessObject: { id: 'abc', name: 'ABC' } }));
    const id = await firstValueFrom(service.selectedElement$);
    expect(id).toBe('abc');
  });

  // --- initializeElementProperties ---
  it('should initialize properties with schema defaults', () => {
    const element = makeElement('bpmn:UserTask');
    service.initializeElementProperties('init_el', element);

    const props = service.getElementProperties('init_el');
    expect(props).toBeDefined();
    expect(props!.properties['id']).toBe('el_1');
    expect(props!.properties['name']).toBe('Test Element');
  });

  it('should warn and skip when no schema found for element type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = { type: 'bpmn:UnknownType', businessObject: { id: 'x' } };
    service.initializeElementProperties('unknown_el', element);

    expect(warnSpy).toHaveBeenCalled();
    expect(service.getElementProperties('unknown_el')).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('should preserve existing property values on re-initialization', () => {
    const element = makeElement('bpmn:UserTask');
    service.initializeElementProperties('re_init', element);
    service.setProperty('re_init', 'assignee', 'John');

    service.initializeElementProperties('re_init', element);
    const props = service.getElementProperties('re_init');
    expect(props!.properties['assignee']).toBe('John');
  });

  // --- getElementProperties ---
  it('should return undefined for non-existent element', () => {
    expect(service.getElementProperties('no_such_el')).toBeUndefined();
  });

  // --- getSelectedElementProperties ---
  it('should emit selected element properties as observable', async () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('sel_el', element);

    const props = await firstValueFrom(service.getSelectedElementProperties());
    expect(props).toBeDefined();
    expect(props!.elementId).toBe('sel_el');
  });

  // --- setProperty ---
  it('should update a single property value', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('prop_el', element);

    service.setProperty('prop_el', 'assignee', 'Alice');
    const props = service.getElementProperties('prop_el');
    expect(props!.properties['assignee']).toBe('Alice');
  });

  it('should warn and skip when setProperty called on non-existent element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    service.setProperty('ghost_el', 'name', 'test');
    expect(warnSpy).toHaveBeenCalledWith('No properties found for element: ghost_el');
    warnSpy.mockRestore();
  });

  it('should update lastModified when setProperty is called', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('time_el', element);
    const before = service.getElementProperties('time_el')!.lastModified;

    service.setProperty('time_el', 'assignee', 'Bob');
    const after = service.getElementProperties('time_el')!.lastModified;
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  // --- setProperties ---
  it('should update multiple properties at once', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('multi_el', element);

    service.setProperties('multi_el', { assignee: 'Carol', priority: 'high' });
    const props = service.getElementProperties('multi_el');
    expect(props!.properties['assignee']).toBe('Carol');
    expect(props!.properties['priority']).toBe('high');
  });

  it('should warn when setProperties called on non-existent element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    service.setProperties('nonexistent', { name: 'x' });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // --- getPropertyGroups ---
  it('should return grouped properties for a known element', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('grp_el', element);

    const groups = service.getPropertyGroups('grp_el');
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].id).toBeDefined();
    expect(groups[0].properties.length).toBeGreaterThan(0);
  });

  it('should return empty array for non-existent element', () => {
    const groups = service.getPropertyGroups('nonexistent_el');
    expect(groups).toEqual([]);
  });

  it('should sort groups by order', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('sort_el', element);

    const groups = service.getPropertyGroups('sort_el');
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i].order).toBeGreaterThanOrEqual(groups[i - 1].order);
    }
  });

  // --- getSupportedElementTypes ---
  it('should return list of supported element types', () => {
    const types = service.getSupportedElementTypes();
    expect(types.length).toBeGreaterThan(0);
    expect(types).toContain(BpmnElementType.USER_TASK);
    expect(types).toContain(BpmnElementType.SERVICE_TASK);
  });

  // --- getElementSchema ---
  it('should return schema for known element type', () => {
    const schema = service.getElementSchema(BpmnElementType.USER_TASK);
    expect(schema).toBeDefined();
    expect(schema!.elementType).toBe(BpmnElementType.USER_TASK);
  });

  it('should return undefined for unsupported element type', () => {
    const schema = service.getElementSchema('bpmn:Unknown' as BpmnElementType);
    expect(schema).toBeUndefined();
  });

  // --- exportElementProperties / importElementProperties roundtrip ---
  it('should export element properties as plain object', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('exp_el', element);

    const exported = service.exportElementProperties('exp_el');
    expect(exported).toBeDefined();
    expect(exported.elementId).toBe('exp_el');
    expect(exported.elementType).toBe('bpmn:UserTask');
    expect(exported.properties).toBeDefined();
    expect(exported.lastModified).toBeDefined();
  });

  it('should return null when exporting non-existent element', () => {
    const exported = service.exportElementProperties('none');
    expect(exported).toBeNull();
  });

  it('should import element properties and make them retrievable', () => {
    const data = {
      elementId: 'imp_el',
      elementType: 'bpmn:UserTask',
      properties: { name: 'Imported Task', assignee: 'Dan' },
      lastModified: new Date().toISOString()
    };

    service.importElementProperties(data);
    const props = service.getElementProperties('imp_el');
    expect(props).toBeDefined();
    expect(props!.properties['name']).toBe('Imported Task');
    expect(props!.properties['assignee']).toBe('Dan');
  });

  it('should reject import with missing required fields', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    service.importElementProperties({ elementId: 'x' });
    expect(errorSpy).toHaveBeenCalledWith('Invalid properties data for import');
    errorSpy.mockRestore();
  });

  it('should roundtrip export then import preserving data', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('rt_el', element);
    service.setProperty('rt_el', 'assignee', 'Eve');

    const exported = service.exportElementProperties('rt_el');
    service.removeElementProperties('rt_el');
    expect(service.getElementProperties('rt_el')).toBeUndefined();

    service.importElementProperties(exported);
    const reimported = service.getElementProperties('rt_el');
    expect(reimported).toBeDefined();
    expect(reimported!.properties['assignee']).toBe('Eve');
  });

  // --- removeElementProperties ---
  it('should remove element properties', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('rem_el', element);
    expect(service.getElementProperties('rem_el')).toBeDefined();

    service.removeElementProperties('rem_el');
    expect(service.getElementProperties('rem_el')).toBeUndefined();
  });

  // --- clearAllProperties ---
  it('should clear all properties and reset selected element', async () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('clr_el1', element);
    service.setSelectedElement('clr_el2', makeElement('bpmn:ServiceTask', { businessObject: { id: 'clr_el2', name: 'Svc' } }));

    service.clearAllProperties();
    expect(service.getElementProperties('clr_el1')).toBeUndefined();
    expect(service.getElementProperties('clr_el2')).toBeUndefined();

    const id = await firstValueFrom(service.selectedElement$);
    expect(id).toBeNull();
  });

  // --- getValidationSummary ---
  it('should return validation summary as observable', async () => {
    const summary = await firstValueFrom(service.getValidationSummary());
    expect(summary).toBeDefined();
    expect(typeof summary.totalElements).toBe('number');
    expect(typeof summary.validElements).toBe('number');
    expect(typeof summary.invalidElements).toBe('number');
  });

  // --- applyBusinessRules ---
  it('should not throw when applying business rules on element without schema rules', () => {
    const element = makeElement('bpmn:ExclusiveGateway', {
      type: 'bpmn:ExclusiveGateway',
      businessObject: { id: 'gw1', name: 'GW' }
    });
    service.setSelectedElement('gw1', element);
    expect(() => service.applyBusinessRules('gw1')).not.toThrow();
  });

  it('should not throw when applying business rules on non-existent element', () => {
    expect(() => service.applyBusinessRules('no_such')).not.toThrow();
  });

  // --- initializeElementProperties: businessObject with existing values ---
  it('should read property values from businessObject during initialization', () => {
    const element = {
      type: 'bpmn:UserTask',
      businessObject: {
        id: 'bo_el',
        name: 'BO Element',
        assignee: 'FromBusinessObject'
      }
    };
    service.initializeElementProperties('bo_el', element);
    const props = service.getElementProperties('bo_el');
    expect(props!.properties['assignee']).toBe('FromBusinessObject');
  });

  // --- initializeElementProperties: extension elements with custom properties ---
  it('should read custom properties from extension elements', () => {
    const element = {
      type: 'bpmn:UserTask',
      businessObject: {
        id: 'ext_el',
        name: 'Ext Element',
        extensionElements: {
          values: [
            {
              $type: 'custom:Properties',
              properties: [
                { name: 'assignee', value: 'ExtAssignee' }
              ]
            }
          ]
        }
      }
    };
    service.initializeElementProperties('ext_el', element);
    const props = service.getElementProperties('ext_el');
    expect(props!.properties['assignee']).toBe('ExtAssignee');
  });

  it('should parse boolean custom property from extension elements', () => {
    const element = {
      type: 'bpmn:UserTask',
      businessObject: {
        id: 'boolext_el',
        name: 'Bool Ext',
        extensionElements: {
          values: [{
            $type: 'custom:Properties',
            properties: [{ name: 'isActive', value: 'false' }]
          }]
        }
      }
    };
    service.initializeElementProperties('boolext_el', element);
    const props = service.getElementProperties('boolext_el');
    expect(props!.properties['isActive']).toBe(false);
  });

  it('should parse number custom property from extension elements', () => {
    const element = {
      type: 'bpmn:ServiceTask',
      businessObject: {
        id: 'numext_el',
        name: 'Num Ext',
        extensionElements: {
          values: [{
            $type: 'custom:Properties',
            properties: [{ name: 'timeout', value: '42' }]
          }]
        }
      }
    };
    service.initializeElementProperties('numext_el', element);
    const props = service.getElementProperties('numext_el');
    expect(props!.properties['timeout']).toBe(42);
  });

  it('should parse multiSelect custom property from extension elements', () => {
    const element = {
      type: 'bpmn:UserTask',
      businessObject: {
        id: 'msext_el',
        name: 'MS Ext',
        extensionElements: {
          values: [{
            $type: 'custom:Properties',
            properties: [{ name: 'tags', value: 'automated, manual, critical' }]
          }]
        }
      }
    };
    service.initializeElementProperties('msext_el', element);
    const props = service.getElementProperties('msext_el');
    expect(props!.properties['tags']).toEqual(['automated', 'manual', 'critical']);
  });

  // --- parseCustomPropertyValue: direct private method tests ---
  it('should parse boolean true string', () => {
    const result = (service as any).parseCustomPropertyValue('true', 'boolean');
    expect(result).toBe(true);
  });

  it('should parse boolean false string', () => {
    const result = (service as any).parseCustomPropertyValue('false', 'boolean');
    expect(result).toBe(false);
  });

  it('should parse valid number string', () => {
    const result = (service as any).parseCustomPropertyValue('3.14', 'number');
    expect(result).toBe(3.14);
  });

  it('should return 0 for NaN number string', () => {
    const result = (service as any).parseCustomPropertyValue('notANumber', 'number');
    expect(result).toBe(0);
  });

  it('should parse comma-separated multiSelect string', () => {
    const result = (service as any).parseCustomPropertyValue('a, b, c', 'multiSelect');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should parse valid JSON string', () => {
    const result = (service as any).parseCustomPropertyValue('{"key":"val"}', 'json');
    expect(result).toEqual({ key: 'val' });
  });

  it('should return empty object for invalid JSON string', () => {
    const result = (service as any).parseCustomPropertyValue('{broken', 'json');
    expect(result).toEqual({});
  });

  it('should return raw string for default/unknown type', () => {
    const result = (service as any).parseCustomPropertyValue('hello', 'text');
    expect(result).toBe('hello');
  });

  // --- getDefaultValueForPropertyType ---
  it('should return false for boolean property type default', () => {
    expect((service as any).getDefaultValueForPropertyType('boolean')).toBe(false);
  });

  it('should return 0 for number property type default', () => {
    expect((service as any).getDefaultValueForPropertyType('number')).toBe(0);
  });

  it('should return empty array for multiSelect property type default', () => {
    expect((service as any).getDefaultValueForPropertyType('multiSelect')).toEqual([]);
  });

  it('should return empty object for json property type default', () => {
    expect((service as any).getDefaultValueForPropertyType('json')).toEqual({});
  });

  it('should return empty string for unknown property type default', () => {
    expect((service as any).getDefaultValueForPropertyType('text')).toBe('');
  });

  // --- getPropertyGroups: unknown group ID fallback ---
  it('should fall back to default label and icon for unknown property group', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('ug_el', element);

    const elementProps = service.getElementProperties('ug_el');
    elementProps!.schema!.properties.push({
      id: 'customProp',
      name: 'customProp',
      type: PropertyType.TEXT,
      label: 'Custom',
      group: 'unknownGroup',
      order: 100
    });

    const groups = service.getPropertyGroups('ug_el');
    const unknownGroup = groups.find(g => g.id === 'unknownGroup');
    expect(unknownGroup).toBeDefined();
    expect(unknownGroup!.label).toBe('UnknownGroup');
    expect(unknownGroup!.icon).toBe('📋');
    expect(unknownGroup!.order).toBe(999);
  });

  // --- importElementProperties: invalid data missing fields ---
  it('should reject import when elementType is missing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    service.importElementProperties({ elementId: 'x', properties: {} });
    expect(errorSpy).toHaveBeenCalledWith('Invalid properties data for import');
    errorSpy.mockRestore();
  });

  it('should reject import when properties field is missing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    service.importElementProperties({ elementId: 'x', elementType: 'bpmn:UserTask' });
    expect(errorSpy).toHaveBeenCalledWith('Invalid properties data for import');
    errorSpy.mockRestore();
  });

  // --- getSelectedElementProperties: without selection ---
  it('should emit undefined from getSelectedElementProperties when no element is selected', async () => {
    service.setSelectedElement(null);
    const props = await firstValueFrom(service.getSelectedElementProperties());
    expect(props).toBeUndefined();
  });

  // --- applyBusinessRules: default action sets a property ---
  it('should set property value when default business rule fires', () => {
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('br_def', element);

    const elementProps = service.getElementProperties('br_def');
    elementProps!.schema!.businessRules = [
      {
        id: 'setDefault',
        name: 'Set Default',
        description: 'Sets default assignee',
        condition: 'true',
        action: 'default',
        target: 'assignee',
        value: 'DefaultUser'
      }
    ];

    service.applyBusinessRules('br_def');

    const updated = service.getElementProperties('br_def');
    expect(updated!.properties['assignee']).toBe('DefaultUser');
  });

  // --- applyBusinessRules: hide action logs ---
  it('should log when hide business rule fires', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const element = makeElement('bpmn:UserTask');
    service.setSelectedElement('br_hide', element);

    const elementProps = service.getElementProperties('br_hide');
    elementProps!.schema!.businessRules = [
      {
        id: 'hideField',
        name: 'Hide Field',
        description: 'Hides assignee',
        condition: 'true',
        action: 'hide',
        target: 'assignee'
      }
    ];

    service.applyBusinessRules('br_hide');

    expect(logSpy).toHaveBeenCalledWith('Property assignee should be hidden');
    logSpy.mockRestore();
  });

  // --- applyBusinessRules: element with no schema ---
  it('should return early when applying business rules on element with no schema', () => {
    service.importElementProperties({
      elementId: 'noschema_el',
      elementType: 'bpmn:UnknownType',
      properties: { name: 'NoSchema' }
    });

    const props = service.getElementProperties('noschema_el');
    expect(props).toBeDefined();
    expect(props!.schema).toBeUndefined();
    expect(() => service.applyBusinessRules('noschema_el')).not.toThrow();
  });
});
