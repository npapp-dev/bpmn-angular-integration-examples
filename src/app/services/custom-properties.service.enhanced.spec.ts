import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('bpmn-js', () => ({ default: class {} }));
vi.mock('bpmn-js-properties-panel', () => ({}));
vi.mock('@bpmn-io/properties-panel', () => ({}));

import { TestBed } from '@angular/core/testing';
import { BpmnElementType } from '../models/bpmn-elements.model';
import { EnhancedCustomPropertiesService } from './custom-properties.service.enhanced';
import { ValidationService } from './validation.service';

function makeElement(type: string, overrides: Record<string, any> = {}) {
  return {
    type,
    businessObject: { id: 'el_1', name: 'Test Element', ...overrides }
  };
}

describe('EnhancedCustomPropertiesService', () => {
  let service: EnhancedCustomPropertiesService;
  let validationService: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EnhancedCustomPropertiesService, ValidationService]
    });
    service = TestBed.inject(EnhancedCustomPropertiesService);
    validationService = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setSelectedElement', () => {
    it('should clear selection when called with null', () => {
      service.setSelectedElement('x', makeElement(BpmnElementType.USER_TASK));
      service.setSelectedElement(null);

      let selected: string | null = 'not-set';
      service.selectedElement$.subscribe(v => (selected = v));
      expect(selected).toBeNull();
    });

    it('should initialize properties when element is provided', () => {
      service.setSelectedElement('el_1', makeElement(BpmnElementType.USER_TASK));
      const props = service.getElementProperties('el_1');
      expect(props).toBeDefined();
      expect(props!.elementType).toBe(BpmnElementType.USER_TASK);
    });
  });

  describe('initializeElementProperties', () => {
    it('should populate properties for a known type (bpmn:UserTask)', () => {
      service.initializeElementProperties('ut1', makeElement(BpmnElementType.USER_TASK));
      const props = service.getElementProperties('ut1');
      expect(props).toBeDefined();
      expect(props!.properties).toHaveProperty('id');
      expect(props!.properties).toHaveProperty('name');
    });

    it('should warn and skip for an unknown element type', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.initializeElementProperties('unk', { type: 'bpmn:Unknown' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No schema found'));
      expect(service.getElementProperties('unk')).toBeUndefined();
      warnSpy.mockRestore();
    });
  });

  describe('setProperty', () => {
    it('should update the property value and re-validate', () => {
      service.initializeElementProperties('s1', makeElement(BpmnElementType.SERVICE_TASK));
      service.setProperty('s1', 'implementation', 'external');
      const props = service.getElementProperties('s1');
      expect(props!.properties['implementation']).toBe('external');
    });

    it('should warn when element is not found', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      service.setProperty('missing', 'name', 'value');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No properties found'));
      warnSpy.mockRestore();
    });
  });

  describe('setProperties', () => {
    it('should update multiple property values at once', () => {
      service.initializeElementProperties('ut2', makeElement(BpmnElementType.USER_TASK));
      service.setProperties('ut2', { assignee: 'john', priority: 'high' });
      const props = service.getElementProperties('ut2');
      expect(props!.properties['assignee']).toBe('john');
      expect(props!.properties['priority']).toBe('high');
    });
  });

  describe('getPropertyGroups', () => {
    it('should return grouped properties sorted by order', () => {
      service.initializeElementProperties('ut3', makeElement(BpmnElementType.USER_TASK));
      const groups = service.getPropertyGroups('ut3');
      expect(groups.length).toBeGreaterThan(0);
      const groupIds = groups.map(g => g.id);
      expect(groupIds).toContain('general');
    });

    it('should return empty array for unknown element', () => {
      expect(service.getPropertyGroups('nope')).toEqual([]);
    });
  });

  describe('exportElementProperties', () => {
    it('should return serialized data for a known element', () => {
      service.initializeElementProperties('e1', makeElement(BpmnElementType.START_EVENT));
      const exported = service.exportElementProperties('e1');
      expect(exported).not.toBeNull();
      expect(exported.elementId).toBe('e1');
      expect(exported.elementType).toBe(BpmnElementType.START_EVENT);
      expect(exported.properties).toBeDefined();
      expect(exported.lastModified).toBeDefined();
    });

    it('should return null for an unknown element', () => {
      expect(service.exportElementProperties('nope')).toBeNull();
    });
  });

  describe('importElementProperties', () => {
    it('should store and validate imported properties', () => {
      const data = {
        elementId: 'imp1',
        elementType: BpmnElementType.END_EVENT,
        properties: { id: 'imp1', name: 'Imported' }
      };
      service.importElementProperties(data);
      const props = service.getElementProperties('imp1');
      expect(props).toBeDefined();
      expect(props!.elementType).toBe(BpmnElementType.END_EVENT);
    });

    it('should reject invalid data (missing required fields)', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      service.importElementProperties({ elementId: 'bad' });
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid properties data'));
      expect(service.getElementProperties('bad')).toBeUndefined();
      errorSpy.mockRestore();
    });
  });

  describe('removeElementProperties', () => {
    it('should delete properties from the map', () => {
      service.initializeElementProperties('r1', makeElement(BpmnElementType.PARALLEL_GATEWAY));
      expect(service.getElementProperties('r1')).toBeDefined();
      service.removeElementProperties('r1');
      expect(service.getElementProperties('r1')).toBeUndefined();
    });
  });

  describe('clearAllProperties', () => {
    it('should reset all properties and selected element', () => {
      service.initializeElementProperties('c1', makeElement(BpmnElementType.USER_TASK));
      service.setSelectedElement('c1', makeElement(BpmnElementType.USER_TASK));
      service.clearAllProperties();

      expect(service.getElementProperties('c1')).toBeUndefined();
      let selected: string | null = 'not-set';
      service.selectedElement$.subscribe(v => (selected = v));
      expect(selected).toBeNull();
    });
  });

  describe('getSupportedElementTypes', () => {
    it('should return an array of 8 element types', () => {
      const types = service.getSupportedElementTypes();
      expect(types).toHaveLength(8);
      expect(types).toContain(BpmnElementType.USER_TASK);
      expect(types).toContain(BpmnElementType.SEQUENCE_FLOW);
    });
  });

  describe('getValidationSummary', () => {
    it('should return an observable that emits summary data', () => {
      let summary: any;
      service.getValidationSummary().subscribe(s => (summary = s));
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('totalElements');
      expect(summary).toHaveProperty('validElements');
      expect(summary).toHaveProperty('totalErrors');
    });
  });

  describe('applyBusinessRules', () => {
    it('should not throw for an element without businessRules', () => {
      service.initializeElementProperties('pg1', makeElement(BpmnElementType.PARALLEL_GATEWAY));
      expect(() => service.applyBusinessRules('pg1')).not.toThrow();
    });

    it('should execute business rules for USER_TASK without error', () => {
      service.initializeElementProperties('ut_br', makeElement(BpmnElementType.USER_TASK));
      expect(() => service.applyBusinessRules('ut_br')).not.toThrow();
    });
  });
});
