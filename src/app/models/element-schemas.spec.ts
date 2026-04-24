import { describe, it, expect } from 'vitest';
import { BpmnElementType, PropertyType, CommonProperties } from './bpmn-elements.model';
import { ElementSchemas, getElementSchema, getSupportedElementTypes } from './element-schemas';

describe('ElementSchemas', () => {
  const ALL_SCHEMA_TYPES: BpmnElementType[] = [
    BpmnElementType.USER_TASK,
    BpmnElementType.SERVICE_TASK,
    BpmnElementType.SCRIPT_TASK,
    BpmnElementType.EXCLUSIVE_GATEWAY,
    BpmnElementType.PARALLEL_GATEWAY,
    BpmnElementType.START_EVENT,
    BpmnElementType.END_EVENT,
    BpmnElementType.SEQUENCE_FLOW
  ];

  it('should contain exactly 8 schemas', () => {
    expect(ElementSchemas).toHaveLength(8);
  });

  it('should have required fields on every schema', () => {
    for (const schema of ElementSchemas) {
      expect(schema.elementType).toBeDefined();
      expect(schema.displayName).toBeTruthy();
      expect(schema.icon).toBeTruthy();
      expect(schema.description).toBeTruthy();
      expect(Array.isArray(schema.properties)).toBe(true);
      expect(schema.properties.length).toBeGreaterThan(0);
    }
  });

  describe('getElementSchema', () => {
    it.each(ALL_SCHEMA_TYPES)(
      'should return a schema for %s',
      (type) => {
        const schema = getElementSchema(type);
        expect(schema).toBeDefined();
        expect(schema!.elementType).toBe(type);
      }
    );

    it('should return undefined for an unknown element type', () => {
      const result = getElementSchema('bpmn:NonExistent' as BpmnElementType);
      expect(result).toBeUndefined();
    });

    it('should return the USER_TASK schema with correct displayName', () => {
      const schema = getElementSchema(BpmnElementType.USER_TASK);
      expect(schema!.displayName).toBe('User Task');
    });

    it('should return the SERVICE_TASK schema with correct displayName', () => {
      const schema = getElementSchema(BpmnElementType.SERVICE_TASK);
      expect(schema!.displayName).toBe('Service Task');
    });

    it('should return the START_EVENT schema with correct displayName', () => {
      const schema = getElementSchema(BpmnElementType.START_EVENT);
      expect(schema!.displayName).toBe('Start Event');
    });
  });

  describe('getSupportedElementTypes', () => {
    it('should return all 8 supported element types', () => {
      const types = getSupportedElementTypes();
      expect(types).toHaveLength(8);
    });

    it('should include every expected type', () => {
      const types = getSupportedElementTypes();
      for (const expected of ALL_SCHEMA_TYPES) {
        expect(types).toContain(expected);
      }
    });
  });

  describe('common properties', () => {
    it('should include id, name, and documentation in every schema', () => {
      for (const schema of ElementSchemas) {
        const propIds = schema.properties.map(p => p.id);
        expect(propIds).toContain('id');
        expect(propIds).toContain('name');
        expect(propIds).toContain('documentation');
      }
    });

    it('should use the shared CommonProperties definition for id', () => {
      const userTaskSchema = getElementSchema(BpmnElementType.USER_TASK)!;
      const idProp = userTaskSchema.properties.find(p => p.id === 'id');
      expect(idProp).toBe(CommonProperties['id']);
    });
  });

  describe('USER_TASK schema', () => {
    it('should have businessRules defined', () => {
      const schema = getElementSchema(BpmnElementType.USER_TASK)!;
      expect(schema.businessRules).toBeDefined();
      expect(schema.businessRules!.length).toBeGreaterThan(0);
    });

    it('should include assignee and formKey properties', () => {
      const schema = getElementSchema(BpmnElementType.USER_TASK)!;
      const propIds = schema.properties.map(p => p.id);
      expect(propIds).toContain('assignee');
      expect(propIds).toContain('formKey');
    });
  });

  describe('SERVICE_TASK schema', () => {
    it('should have businessRules defined', () => {
      const schema = getElementSchema(BpmnElementType.SERVICE_TASK)!;
      expect(schema.businessRules).toBeDefined();
      expect(schema.businessRules!.length).toBeGreaterThan(0);
    });

    it('should include implementation property with SELECT type', () => {
      const schema = getElementSchema(BpmnElementType.SERVICE_TASK)!;
      const implProp = schema.properties.find(p => p.id === 'implementation');
      expect(implProp).toBeDefined();
      expect(implProp!.type).toBe(PropertyType.SELECT);
    });
  });

  describe('conditional properties', () => {
    it('should have javaClass depend on implementation in SERVICE_TASK', () => {
      const schema = getElementSchema(BpmnElementType.SERVICE_TASK)!;
      const javaClassProp = schema.properties.find(p => p.id === 'javaClass');
      expect(javaClassProp).toBeDefined();
      expect(javaClassProp!.conditional).toBeDefined();
      expect(javaClassProp!.conditional!.dependsOn).toBe('implementation');
      expect(javaClassProp!.conditional!.values).toContain('java');
    });

    it('should have timerDefinition depend on eventType in START_EVENT', () => {
      const schema = getElementSchema(BpmnElementType.START_EVENT)!;
      const timerProp = schema.properties.find(p => p.id === 'timerDefinition');
      expect(timerProp).toBeDefined();
      expect(timerProp!.conditional).toBeDefined();
      expect(timerProp!.conditional!.dependsOn).toBe('eventType');
      expect(timerProp!.conditional!.values).toContain('timer');
    });
  });

  describe('schemas without businessRules', () => {
    it('should not have businessRules on PARALLEL_GATEWAY', () => {
      const schema = getElementSchema(BpmnElementType.PARALLEL_GATEWAY)!;
      expect(schema.businessRules).toBeUndefined();
    });
  });
});
