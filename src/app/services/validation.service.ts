/**
 * Advanced Validation Service with Business Rule Integration
 * Handles complex validation scenarios and business logic
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { 
  PropertyDefinition, 
  BusinessRule, 
  PropertyValidationResult, 
  PropertyValidationError, 
  PropertyValidationWarning,
  ElementPropertySchema 
} from '../models/bpmn-elements.model';

export interface ValidationContext {
  elementId: string;
  elementType: string;
  elementData: any;
  allElementsData?: any[];
  processData?: any;
}

export interface BusinessRuleExecutionResult {
  ruleId: string;
  passed: boolean;
  action: string;
  target?: string;
  value?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private validationResults = new BehaviorSubject<Map<string, PropertyValidationResult>>(new Map());
  private businessRuleResults = new BehaviorSubject<Map<string, BusinessRuleExecutionResult[]>>(new Map());

  constructor() {}

  /**
   * Validate all properties of an element according to its schema
   */
  validateElement(
    schema: ElementPropertySchema, 
    elementData: any, 
    context: ValidationContext
  ): Observable<PropertyValidationResult> {
    return new Observable(observer => {
      const result = this.performElementValidation(schema, elementData, context);
      
      // Store result for later retrieval
      const currentResults = this.validationResults.value;
      currentResults.set(context.elementId, result);
      this.validationResults.next(currentResults);
      
      observer.next(result);
      observer.complete();
    });
  }

  /**
   * Execute business rules for an element
   */
  executeBusinessRules(
    rules: BusinessRule[], 
    elementData: any, 
    context: ValidationContext
  ): Observable<BusinessRuleExecutionResult[]> {
    return new Observable(observer => {
      const results = rules.map(rule => this.executeBusinessRule(rule, elementData, context));
      
      // Store results
      const currentResults = this.businessRuleResults.value;
      currentResults.set(context.elementId, results);
      this.businessRuleResults.next(currentResults);
      
      observer.next(results);
      observer.complete();
    });
  }

  /**
   * Get current validation results for an element
   */
  getValidationResults(elementId: string): PropertyValidationResult | undefined {
    return this.validationResults.value.get(elementId);
  }

  /**
   * Get current business rule results for an element
   */
  getBusinessRuleResults(elementId: string): BusinessRuleExecutionResult[] {
    return this.businessRuleResults.value.get(elementId) || [];
  }

  /**
   * Observable of all validation results
   */
  getValidationResults$(): Observable<Map<string, PropertyValidationResult>> {
    return this.validationResults.asObservable();
  }

  /**
   * Observable of all business rule results
   */
  getBusinessRuleResults$(): Observable<Map<string, BusinessRuleExecutionResult[]>> {
    return this.businessRuleResults.asObservable();
  }

  /**
   * Validate a single property value
   */
  validateProperty(
    property: PropertyDefinition, 
    value: any, 
    elementData: any, 
    context: ValidationContext
  ): PropertyValidationResult {
    const errors: PropertyValidationError[] = [];
    const warnings: PropertyValidationWarning[] = [];

    // Basic validation rules
    if (property.validation) {
      for (const rule of property.validation) {
        const error = this.validateRule(rule, value, property, elementData, context);
        if (error) {
          errors.push({
            propertyId: property.id,
            message: error,
            rule: rule.type
          });
        }
      }
    }

    // Cross-property validation
    const crossValidation = this.performCrossPropertyValidation(property, value, elementData, context);
    errors.push(...crossValidation.errors);
    warnings.push(...crossValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clear validation results for an element
   */
  clearValidationResults(elementId: string): void {
    const currentValidation = this.validationResults.value;
    const currentBusinessRules = this.businessRuleResults.value;
    
    currentValidation.delete(elementId);
    currentBusinessRules.delete(elementId);
    
    this.validationResults.next(currentValidation);
    this.businessRuleResults.next(currentBusinessRules);
  }

  /**
   * Get validation summary for all elements
   */
  getValidationSummary(): { 
    totalElements: number; 
    validElements: number; 
    invalidElements: number; 
    totalErrors: number; 
    totalWarnings: number; 
  } {
    const results = this.validationResults.value;
    let totalErrors = 0;
    let totalWarnings = 0;
    let validElements = 0;
    let invalidElements = 0;

    results.forEach(result => {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      
      if (result.isValid) {
        validElements++;
      } else {
        invalidElements++;
      }
    });

    return {
      totalElements: results.size,
      validElements,
      invalidElements,
      totalErrors,
      totalWarnings
    };
  }

  // Private methods

  private performElementValidation(
    schema: ElementPropertySchema, 
    elementData: any, 
    context: ValidationContext
  ): PropertyValidationResult {
    const allErrors: PropertyValidationError[] = [];
    const allWarnings: PropertyValidationWarning[] = [];

    // Validate each property
    for (const property of schema.properties) {
      const value = elementData[property.name];
      const propertyResult = this.validateProperty(property, value, elementData, context);
      
      allErrors.push(...propertyResult.errors);
      allWarnings.push(...propertyResult.warnings);
    }

    // Execute business rules if they exist
    if (schema.businessRules) {
      const ruleResults = schema.businessRules.map(rule => 
        this.executeBusinessRule(rule, elementData, context)
      );
      
      // Convert failed validation rules to errors
      ruleResults
        .filter(result => !result.passed && result.action === 'validate')
        .forEach(result => {
          allErrors.push({
            propertyId: result.target || 'general',
            message: result.message || 'Business rule validation failed',
            rule: result.ruleId
          });
        });
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  private validateRule(
    rule: any, 
    value: any, 
    property: PropertyDefinition, 
    elementData: any, 
    context: ValidationContext
  ): string | null {
    try {
      switch (rule.type) {
        case 'required':
          if (this.isEmpty(value)) {
            return rule.message || `${property.label} is required`;
          }
          break;

        case 'minLength':
          if (typeof value === 'string' && value.length < rule.value) {
            return rule.message || `${property.label} must be at least ${rule.value} characters`;
          }
          break;

        case 'maxLength':
          if (typeof value === 'string' && value.length > rule.value) {
            return rule.message || `${property.label} must not exceed ${rule.value} characters`;
          }
          break;

        case 'min':
          if (typeof value === 'number' && value < rule.value) {
            return rule.message || `${property.label} must be at least ${rule.value}`;
          }
          break;

        case 'max':
          if (typeof value === 'number' && value > rule.value) {
            return rule.message || `${property.label} must not exceed ${rule.value}`;
          }
          break;

        case 'pattern':
          if (typeof value === 'string' && value && !new RegExp(rule.value).test(value)) {
            return rule.message || `${property.label} format is invalid`;
          }
          break;

        case 'email':
          if (typeof value === 'string' && value && !this.isValidEmail(value)) {
            return rule.message || `${property.label} must be a valid email address`;
          }
          break;

        case 'url':
          if (typeof value === 'string' && value && !this.isValidUrl(value)) {
            return rule.message || `${property.label} must be a valid URL`;
          }
          break;

        case 'custom':
          if (rule.customValidator) {
            try {
              const isValid = rule.customValidator(value, elementData, context);
              if (!isValid) {
                return rule.message || `${property.label} validation failed`;
              }
            } catch (error) {
              console.error('Custom validator error:', error);
              return `${property.label} validation error`;
            }
          }
          break;
      }
    } catch (error) {
      console.error('Validation rule error:', error);
      return `Validation error for ${property.label}`;
    }

    return null;
  }

  private executeBusinessRule(
    rule: BusinessRule, 
    elementData: any, 
    context: ValidationContext
  ): BusinessRuleExecutionResult {
    try {
      // Create evaluation context
      const evalContext = {
        ...elementData,
        elementId: context.elementId,
        elementType: context.elementType,
        allElements: context.allElementsData || [],
        process: context.processData || {}
      };

      // Evaluate condition
      const conditionResult = this.evaluateExpression(rule.condition, evalContext);
      
      return {
        ruleId: rule.id,
        passed: !conditionResult, // Rule passes if condition is false
        action: rule.action,
        target: rule.target,
        value: rule.value,
        message: rule.message
      };
    } catch (error) {
      console.error(`Business rule execution error for rule ${rule.id}:`, error);
      return {
        ruleId: rule.id,
        passed: false,
        action: rule.action,
        message: `Rule execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private evaluateExpression(expression: string, context: any): boolean {
    try {
      // Simple expression evaluator
      // In a production environment, consider using a proper expression parser
      // like jsep or similar for security
      
      // Create a safe evaluation context
      const safeContext = { ...context };
      
      // Replace context variables in expression
      let processedExpression = expression;
      Object.keys(safeContext).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        processedExpression = processedExpression.replace(regex, `context.${key}`);
      });

      // Create evaluation function
      const evalFunction = new Function('context', `return ${processedExpression}`);
      
      return Boolean(evalFunction(safeContext));
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return false;
    }
  }

  private performCrossPropertyValidation(
    property: PropertyDefinition, 
    value: any, 
    elementData: any, 
    context: ValidationContext
  ): { errors: PropertyValidationError[]; warnings: PropertyValidationWarning[] } {
    const errors: PropertyValidationError[] = [];
    const warnings: PropertyValidationWarning[] = [];

    // Example cross-property validations
    
    // User Task specific validations
    if (context.elementType === 'bpmn:UserTask') {
      if (property.id === 'assignee' && !value && !elementData.candidateUsers && !elementData.candidateGroups) {
        warnings.push({
          propertyId: property.id,
          message: 'User task should have assignee, candidate users, or candidate groups',
          suggestion: 'Consider adding an assignee or candidate groups'
        });
      }
    }

    // Service Task specific validations
    if (context.elementType === 'bpmn:ServiceTask') {
      if (property.id === 'javaClass' && elementData.implementation === 'java' && !value) {
        errors.push({
          propertyId: property.id,
          message: 'Java class is required when implementation type is "Java Class"',
          rule: 'cross-property'
        });
      }
    }

    return { errors, warnings };
  }

  private isEmpty(value: any): boolean {
    return value === null || 
           value === undefined || 
           value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
