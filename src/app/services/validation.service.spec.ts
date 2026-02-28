import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { ValidationService, ValidationContext, BusinessRuleExecutionResult } from './validation.service';
import {
  PropertyType,
  PropertyDefinition,
  ElementPropertySchema,
  BpmnElementType,
  BusinessRule
} from '../models/bpmn-elements.model';

function makeProperty(overrides: Partial<PropertyDefinition> = {}): PropertyDefinition {
  return {
    id: 'testProp',
    name: 'testProp',
    type: PropertyType.TEXT,
    label: 'Test Property',
    ...overrides
  };
}

function makeContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    elementId: 'el_1',
    elementType: 'bpmn:Task',
    elementData: {},
    ...overrides
  };
}

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Required validation ---
  it('should return error when required value is empty string', () => {
    const prop = makeProperty({
      validation: [{ type: 'required', message: 'Name is required' }]
    });
    const result = service.validateProperty(prop, '', {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Name is required');
    expect(result.errors[0].rule).toBe('required');
  });

  it('should return error when required value is null', () => {
    const prop = makeProperty({
      validation: [{ type: 'required', message: 'Required' }]
    });
    const result = service.validateProperty(prop, null, {}, makeContext());
    expect(result.isValid).toBe(false);
  });

  it('should return error when required value is undefined', () => {
    const prop = makeProperty({
      validation: [{ type: 'required', message: 'Required' }]
    });
    const result = service.validateProperty(prop, undefined, {}, makeContext());
    expect(result.isValid).toBe(false);
  });

  it('should pass when required value is provided', () => {
    const prop = makeProperty({
      validation: [{ type: 'required', message: 'Required' }]
    });
    const result = service.validateProperty(prop, 'hello', {}, makeContext());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- MinLength ---
  it('should fail minLength validation when string is too short', () => {
    const prop = makeProperty({
      validation: [{ type: 'minLength', value: 5, message: 'Too short' }]
    });
    const result = service.validateProperty(prop, 'ab', {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Too short');
  });

  it('should pass minLength validation when string meets requirement', () => {
    const prop = makeProperty({
      validation: [{ type: 'minLength', value: 3, message: 'Too short' }]
    });
    const result = service.validateProperty(prop, 'abc', {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- MaxLength ---
  it('should fail maxLength validation when string is too long', () => {
    const prop = makeProperty({
      validation: [{ type: 'maxLength', value: 3, message: 'Too long' }]
    });
    const result = service.validateProperty(prop, 'abcde', {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Too long');
  });

  it('should pass maxLength validation when string is within limit', () => {
    const prop = makeProperty({
      validation: [{ type: 'maxLength', value: 10, message: 'Too long' }]
    });
    const result = service.validateProperty(prop, 'hello', {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- Min ---
  it('should fail min validation when number is below minimum', () => {
    const prop = makeProperty({
      type: PropertyType.NUMBER,
      validation: [{ type: 'min', value: 10, message: 'Must be >= 10' }]
    });
    const result = service.validateProperty(prop, 5, {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Must be >= 10');
  });

  it('should pass min validation when number meets minimum', () => {
    const prop = makeProperty({
      type: PropertyType.NUMBER,
      validation: [{ type: 'min', value: 10, message: 'Must be >= 10' }]
    });
    const result = service.validateProperty(prop, 10, {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- Max ---
  it('should fail max validation when number exceeds maximum', () => {
    const prop = makeProperty({
      type: PropertyType.NUMBER,
      validation: [{ type: 'max', value: 100, message: 'Must be <= 100' }]
    });
    const result = service.validateProperty(prop, 150, {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Must be <= 100');
  });

  it('should pass max validation when number is within limit', () => {
    const prop = makeProperty({
      type: PropertyType.NUMBER,
      validation: [{ type: 'max', value: 100, message: 'Max' }]
    });
    const result = service.validateProperty(prop, 50, {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- Pattern ---
  it('should fail pattern validation when string does not match', () => {
    const prop = makeProperty({
      validation: [{ type: 'pattern', value: '^[A-Z]+$', message: 'Uppercase only' }]
    });
    const result = service.validateProperty(prop, 'hello', {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Uppercase only');
  });

  it('should pass pattern validation when string matches', () => {
    const prop = makeProperty({
      validation: [{ type: 'pattern', value: '^[A-Z]+$', message: 'Uppercase only' }]
    });
    const result = service.validateProperty(prop, 'HELLO', {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  it('should skip pattern validation for empty string', () => {
    const prop = makeProperty({
      validation: [{ type: 'pattern', value: '^[A-Z]+$', message: 'Uppercase only' }]
    });
    const result = service.validateProperty(prop, '', {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- Email ---
  it('should fail email validation for invalid email', () => {
    const prop = makeProperty({
      validation: [{ type: 'email', message: 'Invalid email' }]
    });
    const result = service.validateProperty(prop, 'not-an-email', {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Invalid email');
  });

  it('should pass email validation for valid email', () => {
    const prop = makeProperty({
      validation: [{ type: 'email', message: 'Invalid email' }]
    });
    const result = service.validateProperty(prop, 'user@example.com', {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- URL ---
  it('should fail url validation for invalid URL', () => {
    const prop = makeProperty({
      validation: [{ type: 'url', message: 'Invalid URL' }]
    });
    const result = service.validateProperty(prop, 'not a url', {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Invalid URL');
  });

  it('should pass url validation for valid URL', () => {
    const prop = makeProperty({
      validation: [{ type: 'url', message: 'Invalid URL' }]
    });
    const result = service.validateProperty(prop, 'https://example.com', {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- Custom validator ---
  it('should fail custom validation when validator returns false', () => {
    const prop = makeProperty({
      validation: [{
        type: 'custom',
        message: 'Must be even',
        customValidator: (v: any) => v % 2 === 0
      }]
    });
    const result = service.validateProperty(prop, 3, {}, makeContext());
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe('Must be even');
  });

  it('should pass custom validation when validator returns true', () => {
    const prop = makeProperty({
      validation: [{
        type: 'custom',
        message: 'Must be even',
        customValidator: (v: any) => v % 2 === 0
      }]
    });
    const result = service.validateProperty(prop, 4, {}, makeContext());
    expect(result.isValid).toBe(true);
  });

  // --- Cross-property validation: UserTask ---
  it('should warn for UserTask assignee when no assignee/candidateUsers/candidateGroups', () => {
    const prop = makeProperty({ id: 'assignee' });
    const ctx = makeContext({ elementType: 'bpmn:UserTask' });
    const elementData = {};
    const result = service.validateProperty(prop, '', elementData, ctx);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0].propertyId).toBe('assignee');
  });

  it('should not warn for UserTask assignee when candidateUsers is present', () => {
    const prop = makeProperty({ id: 'assignee' });
    const ctx = makeContext({ elementType: 'bpmn:UserTask' });
    const elementData = { candidateUsers: 'user1' };
    const result = service.validateProperty(prop, '', elementData, ctx);
    const assigneeWarnings = result.warnings.filter(w => w.propertyId === 'assignee');
    expect(assigneeWarnings).toHaveLength(0);
  });

  // --- Cross-property validation: ServiceTask ---
  it('should error for ServiceTask javaClass when implementation is java and class missing', () => {
    const prop = makeProperty({ id: 'javaClass' });
    const ctx = makeContext({ elementType: 'bpmn:ServiceTask' });
    const elementData = { implementation: 'java' };
    const result = service.validateProperty(prop, '', elementData, ctx);
    expect(result.isValid).toBe(false);
    const crossError = result.errors.find(e => e.rule === 'cross-property');
    expect(crossError).toBeDefined();
    expect(crossError!.propertyId).toBe('javaClass');
  });

  it('should not error for ServiceTask javaClass when implementation is not java', () => {
    const prop = makeProperty({ id: 'javaClass' });
    const ctx = makeContext({ elementType: 'bpmn:ServiceTask' });
    const elementData = { implementation: 'expression' };
    const result = service.validateProperty(prop, '', elementData, ctx);
    const crossErrors = result.errors.filter(e => e.rule === 'cross-property');
    expect(crossErrors).toHaveLength(0);
  });

  // --- validateElement ---
  it('should validate all properties in a schema via validateElement', async () => {
    const schema: ElementPropertySchema = {
      elementType: BpmnElementType.TASK,
      displayName: 'Task',
      icon: '',
      description: '',
      properties: [
        makeProperty({
          id: 'name', name: 'name', label: 'Name',
          validation: [{ type: 'required', message: 'Name is required' }]
        })
      ]
    };
    const ctx = makeContext({ elementData: {} });

    const result = await firstValueFrom(service.validateElement(schema, {}, ctx));
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  // --- executeBusinessRules ---
  it('should execute business rules and return results', async () => {
    const rules: BusinessRule[] = [
      {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test',
        condition: 'true',
        action: 'validate',
        message: 'Always fails'
      }
    ];
    const ctx = makeContext();

    const results = await firstValueFrom(service.executeBusinessRules(rules, {}, ctx));
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe('rule1');
    expect(results[0].action).toBe('validate');
  });

  it('should mark rule as passed when condition evaluates to false', async () => {
    const rules: BusinessRule[] = [
      {
        id: 'rule2',
        name: 'Pass Rule',
        description: 'Condition is false',
        condition: 'false',
        action: 'validate',
        message: 'Should pass'
      }
    ];
    const ctx = makeContext();

    const results = await firstValueFrom(service.executeBusinessRules(rules, {}, ctx));
    expect(results[0].passed).toBe(true);
  });

  // --- getValidationResults / getBusinessRuleResults ---
  it('should store and retrieve validation results by elementId', async () => {
    const schema: ElementPropertySchema = {
      elementType: BpmnElementType.TASK,
      displayName: 'Task',
      icon: '',
      description: '',
      properties: [makeProperty()]
    };
    const ctx = makeContext({ elementId: 'stored_el' });

    await firstValueFrom(service.validateElement(schema, { testProp: 'value' }, ctx));
    const stored = service.getValidationResults('stored_el');
    expect(stored).toBeDefined();
    expect(stored!.isValid).toBe(true);
  });

  it('should return undefined for non-existent validation results', () => {
    expect(service.getValidationResults('non_existent')).toBeUndefined();
  });

  it('should store and retrieve business rule results by elementId', async () => {
    const rules: BusinessRule[] = [
      { id: 'br1', name: 'R', description: '', condition: 'false', action: 'validate', message: '' }
    ];
    const ctx = makeContext({ elementId: 'br_el' });

    await firstValueFrom(service.executeBusinessRules(rules, {}, ctx));
    const stored = service.getBusinessRuleResults('br_el');
    expect(stored).toHaveLength(1);
  });

  it('should return empty array for non-existent business rule results', () => {
    expect(service.getBusinessRuleResults('no_el')).toEqual([]);
  });

  // --- clearValidationResults ---
  it('should clear validation results for a specific element', async () => {
    const schema: ElementPropertySchema = {
      elementType: BpmnElementType.TASK,
      displayName: 'Task',
      icon: '',
      description: '',
      properties: [makeProperty()]
    };
    const ctx = makeContext({ elementId: 'clear_el' });

    await firstValueFrom(service.validateElement(schema, { testProp: 'v' }, ctx));
    expect(service.getValidationResults('clear_el')).toBeDefined();
    service.clearValidationResults('clear_el');
    expect(service.getValidationResults('clear_el')).toBeUndefined();
  });

  // --- getValidationSummary ---
  it('should return correct validation summary', async () => {
    const validSchema: ElementPropertySchema = {
      elementType: BpmnElementType.TASK,
      displayName: 'Task',
      icon: '',
      description: '',
      properties: [makeProperty()]
    };
    const invalidSchema: ElementPropertySchema = {
      elementType: BpmnElementType.TASK,
      displayName: 'Task',
      icon: '',
      description: '',
      properties: [
        makeProperty({
          validation: [{ type: 'required', message: 'Required' }]
        })
      ]
    };

    const ctx1 = makeContext({ elementId: 'valid_el' });
    const ctx2 = makeContext({ elementId: 'invalid_el' });

    await firstValueFrom(service.validateElement(validSchema, { testProp: 'value' }, ctx1));
    await firstValueFrom(service.validateElement(invalidSchema, {}, ctx2));
    const summary = service.getValidationSummary();
    expect(summary.totalElements).toBe(2);
    expect(summary.validElements).toBe(1);
    expect(summary.invalidElements).toBe(1);
    expect(summary.totalErrors).toBeGreaterThanOrEqual(1);
  });

  // --- Observables ---
  it('should emit via getValidationResults$ observable', async () => {
    const map = await firstValueFrom(service.getValidationResults$());
    expect(map).toBeInstanceOf(Map);
  });

  it('should emit via getBusinessRuleResults$ observable', async () => {
    const map = await firstValueFrom(service.getBusinessRuleResults$());
    expect(map).toBeInstanceOf(Map);
  });

  // --- Multiple validation rules on single property ---
  it('should accumulate multiple errors from different rules', () => {
    const prop = makeProperty({
      validation: [
        { type: 'required', message: 'Required' },
        { type: 'minLength', value: 5, message: 'Too short' }
      ]
    });
    const result = service.validateProperty(prop, '', {}, makeContext());
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  // --- Property with no validation rules ---
  it('should pass validation for property with no validation rules', () => {
    const prop = makeProperty();
    const result = service.validateProperty(prop, 'anything', {}, makeContext());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- Schema with business rules that produce errors ---
  it('should include business rule failures as errors in validateElement', async () => {
    const schema: ElementPropertySchema = {
      elementType: BpmnElementType.TASK,
      displayName: 'Task',
      icon: '',
      description: '',
      properties: [makeProperty()],
      businessRules: [
        {
          id: 'failRule',
          name: 'Fail',
          description: '',
          condition: 'true',
          action: 'validate',
          target: 'testProp',
          message: 'Business rule failed'
        }
      ]
    };
    const ctx = makeContext();

    const result = await firstValueFrom(service.validateElement(schema, { testProp: 'v' }, ctx));
    expect(result.isValid).toBe(false);
    const brError = result.errors.find(e => e.rule === 'failRule');
    expect(brError).toBeDefined();
    expect(brError!.message).toBe('Business rule failed');
  });
});
