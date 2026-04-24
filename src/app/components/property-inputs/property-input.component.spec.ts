import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyDefinition, PropertyType } from '../../models/bpmn-elements.model';
import { PropertyInputComponent } from './property-input.component';

describe('PropertyInputComponent', () => {
  let component: PropertyInputComponent;
  let fixture: ComponentFixture<PropertyInputComponent>;

  const baseProperty: PropertyDefinition = {
    id: 'name',
    name: 'name',
    label: 'Name',
    type: PropertyType.TEXT
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PropertyInputComponent],
      imports: [FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertyInputComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    component.property = { ...baseProperty };
    component.ngOnInit();
    expect(component).toBeTruthy();
  });

  it('should initialize with provided value', () => {
    component.property = { ...baseProperty };
    component.value = 'Hello';
    component.ngOnInit();

    expect(component.currentValue).toBe('Hello');
  });

  it('should initialize with default value and emit it', () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    component.property = { ...baseProperty, defaultValue: 'Default Name' };
    component.value = undefined;
    component.ngOnInit();

    expect(component.currentValue).toBe('Default Name');
    expect(emitSpy).toHaveBeenCalledWith('Default Name');
  });

  it('should use type-specific defaults when no value provided', () => {
    component.property = { ...baseProperty, type: PropertyType.BOOLEAN };
    component.value = undefined;
    component.ngOnInit();
    expect(component.currentValue).toBe(false);

    component.property = { ...baseProperty, type: PropertyType.NUMBER };
    component.value = undefined;
    component.ngOnInit();
    expect(component.currentValue).toBe(0);

    component.property = { ...baseProperty, type: PropertyType.MULTI_SELECT };
    component.value = undefined;
    component.ngOnInit();
    expect(component.currentValue).toEqual([]);
  });

  it('should validate required rule as invalid for empty value', () => {
    component.property = {
      ...baseProperty,
      validation: [{ type: 'required', message: 'Name is required' }]
    };
    component.value = '';
    component.ngOnInit();

    expect(component.isValid).toBe(false);
    expect(component.validationErrors).toEqual(['Name is required']);
  });

  it('should pass required validation for non-empty value', () => {
    component.property = {
      ...baseProperty,
      validation: [{ type: 'required', message: 'Required' }]
    };
    component.value = 'hello';
    component.ngOnInit();

    expect(component.isValid).toBe(true);
    expect(component.validationErrors).toEqual([]);
  });

  it('should validate email rule', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.EMAIL,
      validation: [{ type: 'email', message: 'Invalid email' }]
    };
    component.value = 'not-an-email';
    component.ngOnInit();
    expect(component.isValid).toBe(false);

    component.onValueChange('user@example.com');
    expect(component.isValid).toBe(true);
  });

  it('should validate url rule', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.URL,
      validation: [{ type: 'url', message: 'Invalid URL' }]
    };
    component.value = 'not-a-url';
    component.ngOnInit();
    expect(component.isValid).toBe(false);

    component.onValueChange('https://example.com');
    expect(component.isValid).toBe(true);
  });

  it('should validate minLength and maxLength rules', () => {
    component.property = {
      ...baseProperty,
      validation: [
        { type: 'minLength', value: 3, message: 'Too short' },
        { type: 'maxLength', value: 10, message: 'Too long' }
      ]
    };

    component.value = 'ab';
    component.ngOnInit();
    expect(component.isValid).toBe(false);
    expect(component.validationErrors).toContain('Too short');

    component.onValueChange('hello world!');
    expect(component.validationErrors).toContain('Too long');

    component.onValueChange('hello');
    expect(component.isValid).toBe(true);
  });

  it('should validate min and max rules for numbers', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.NUMBER,
      validation: [
        { type: 'min', value: 1, message: 'Too low' },
        { type: 'max', value: 100, message: 'Too high' }
      ]
    };

    component.value = 0;
    component.ngOnInit();
    expect(component.validationErrors).toContain('Too low');

    component.onValueChange(101);
    expect(component.validationErrors).toContain('Too high');

    component.onValueChange(50);
    expect(component.isValid).toBe(true);
  });

  it('should validate pattern rule', () => {
    component.property = {
      ...baseProperty,
      validation: [{ type: 'pattern', value: '^[A-Z]+$', message: 'Must be uppercase' }]
    };

    component.value = 'abc';
    component.ngOnInit();
    expect(component.isValid).toBe(false);

    component.onValueChange('ABC');
    expect(component.isValid).toBe(true);
  });

  it('should toggle multi-select option values', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.MULTI_SELECT,
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    };
    component.value = [];
    component.ngOnInit();

    component.toggleMultiSelectValue({ value: 'a', label: 'A' });
    expect(component.currentValue).toEqual(['a']);

    component.toggleMultiSelectValue({ value: 'b', label: 'B' });
    expect(component.currentValue).toEqual(['a', 'b']);

    component.toggleMultiSelectValue({ value: 'a', label: 'A' });
    expect(component.currentValue).toEqual(['b']);
  });

  it('should report multi-select membership', () => {
    component.property = { ...baseProperty, type: PropertyType.MULTI_SELECT };
    component.currentValue = ['x', 'y'];

    expect(component.isMultiSelectValue({ value: 'x', label: 'X' })).toBe(true);
    expect(component.isMultiSelectValue({ value: 'z', label: 'Z' })).toBe(false);
  });

  it('should parse valid json input', () => {
    component.property = { ...baseProperty, type: PropertyType.JSON };
    component.value = {};
    component.ngOnInit();

    component.onJsonChange('{"enabled":true}');
    expect(component.currentValue).toEqual({ enabled: true });
  });

  it('should keep raw string on invalid json', () => {
    component.property = { ...baseProperty, type: PropertyType.JSON };
    component.value = {};
    component.ngOnInit();

    component.onJsonChange('{invalid');
    expect(component.currentValue).toBe('{invalid');
  });

  it('should format json value for display', () => {
    component.property = { ...baseProperty, type: PropertyType.JSON };
    component.currentValue = { a: 1 };
    expect(component.formatJsonValue()).toBe('{\n  "a": 1\n}');
  });

  it('should format datetime value', () => {
    component.property = { ...baseProperty, type: PropertyType.DATETIME };
    component.currentValue = null;
    expect(component.formatDateTimeValue()).toBe('');

    const date = new Date('2026-02-25T14:30:00Z');
    component.currentValue = date;
    const result = component.formatDateTimeValue();
    expect(result).toContain('2026');
    expect(result).not.toContain('Z');
  });

  it('should handle datetime change', () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    component.property = { ...baseProperty, type: PropertyType.DATETIME };
    component.value = null;
    component.ngOnInit();

    component.onDateTimeChange('2026-02-25T14:30');
    expect(component.currentValue).toBeInstanceOf(Date);

    component.onDateTimeChange('');
    expect(component.currentValue).toBeNull();
  });

  it('should compute input CSS classes', () => {
    component.property = { ...baseProperty };
    component.isValid = true;
    component.disabled = true;
    component.readonly = true;

    const classes = component.getInputClasses();
    expect(classes).toContain('property-input');
    expect(classes).toContain('valid');
    expect(classes).toContain('disabled');
    expect(classes).toContain('readonly');
  });

  it('should report isRequired based on validation rules', () => {
    component.property = { ...baseProperty };
    expect(component.isRequired).toBe(false);

    component.property = {
      ...baseProperty,
      validation: [{ type: 'required', message: 'Required' }]
    };
    expect(component.isRequired).toBe(true);
  });

  it('should check visibility based on conditional config', () => {
    component.property = {
      ...baseProperty,
      conditional: { dependsOn: 'mode', values: ['advanced'] }
    };
    component.elementData = { mode: 'basic' };
    component.ngOnInit();
    expect(component.isVisible).toBe(false);

    component.elementData = { mode: 'advanced' };
    component.ngOnChanges({ elementData: {} as any });
    expect(component.isVisible).toBe(true);
  });

  it('should return select options from property definition', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.SELECT,
      options: [{ value: 'a', label: 'A' }]
    };

    expect(component.getSelectOptions()).toEqual([{ value: 'a', label: 'A' }]);
  });

  it('should return empty options when none defined', () => {
    component.property = { ...baseProperty };
    expect(component.getSelectOptions()).toEqual([]);
  });

  it('should compute selectValue as string', () => {
    component.currentValue = null;
    expect(component.selectValue).toBe('');

    component.currentValue = 42;
    expect(component.selectValue).toBe('42');
  });

  it('should emit validation change on value update', () => {
    const validSpy = vi.spyOn(component.validationChange, 'emit');
    component.property = {
      ...baseProperty,
      validation: [{ type: 'required', message: 'Required' }]
    };
    component.value = '';
    component.ngOnInit();

    expect(validSpy).toHaveBeenCalledWith({ isValid: false, errors: ['Required'] });
  });

  it('should update currentValue when value reference changes but string representation is the same', () => {
    component.property = { ...baseProperty, type: PropertyType.JSON };
    const obj1 = { a: 1 };
    component.value = obj1;
    component.ngOnInit();
    expect(component.currentValue).toBe(obj1);

    const obj2 = { a: 1 };
    component.value = obj2;
    component.ngOnChanges({
      value: {
        previousValue: obj1,
        currentValue: obj2,
        firstChange: false,
        isFirstChange: () => false
      }
    });
    expect(component.currentValue).toBe(obj2);
    expect(component.currentValue).not.toBe(obj1);
  });

  it('should extract value from event.target.value via onSelectChange', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.SELECT,
      options: [{ value: 'opt1', label: 'Option 1' }]
    };
    component.value = '';
    component.ngOnInit();

    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    const event = { target: { value: 'opt1' } } as unknown as Event;
    component.onSelectChange(event);

    expect(component.currentValue).toBe('opt1');
    expect(emitSpy).toHaveBeenCalledWith('opt1');
  });

  it('should call onValueChange with newValue via onSelectValueChange', () => {
    component.property = { ...baseProperty, type: PropertyType.SELECT };
    component.value = '';
    component.ngOnInit();

    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    component.onSelectValueChange('selectedVal');

    expect(component.currentValue).toBe('selectedVal');
    expect(emitSpy).toHaveBeenCalledWith('selectedVal');
  });

  it('should extract file name from input.files[0] via onFileChange', () => {
    component.property = { ...baseProperty, type: PropertyType.FILE };
    component.value = '';
    component.ngOnInit();

    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    const event = {
      target: { files: [{ name: 'report.pdf' }] }
    } as unknown as Event;
    component.onFileChange(event);

    expect(component.currentValue).toBe('report.pdf');
    expect(emitSpy).toHaveBeenCalledWith('report.pdf');
  });

  it('should not change value when no files are selected in onFileChange', () => {
    component.property = { ...baseProperty, type: PropertyType.FILE };
    component.value = 'existing.txt';
    component.ngOnInit();

    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    emitSpy.mockClear();

    const event = { target: { files: null } } as unknown as Event;
    component.onFileChange(event);

    expect(component.currentValue).toBe('existing.txt');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should include invalid class when isValid is false', () => {
    component.property = { ...baseProperty };
    component.isValid = false;
    component.disabled = false;
    component.readonly = false;

    const classes = component.getInputClasses();
    expect(classes).toContain('invalid');
    const classTokens = classes.split(' ');
    expect(classTokens).not.toContain('valid');
  });

  it('should return empty string from formatJsonValue when property type is not JSON', () => {
    component.property = { ...baseProperty, type: PropertyType.TEXT };
    component.currentValue = { a: 1 };
    expect(component.formatJsonValue()).toBe('');
  });

  it('should initialize currentValue as empty array in toggleMultiSelectValue when not an array', () => {
    component.property = {
      ...baseProperty,
      type: PropertyType.MULTI_SELECT,
      options: [{ value: 'x', label: 'X' }]
    };
    component.value = 'not-an-array';
    component.ngOnInit();
    component.currentValue = 'not-an-array';

    component.toggleMultiSelectValue({ value: 'x', label: 'X' });
    expect(Array.isArray(component.currentValue)).toBe(true);
    expect(component.currentValue).toContain('x');
  });

  it('should return false from isMultiSelectValue when currentValue is not an array', () => {
    component.property = { ...baseProperty, type: PropertyType.MULTI_SELECT };
    component.currentValue = 'not-an-array';
    expect(component.isMultiSelectValue({ value: 'x', label: 'X' })).toBe(false);
  });

  it('should use empty object as default value for JSON type', () => {
    component.property = { ...baseProperty, type: PropertyType.JSON };
    component.value = undefined;
    component.ngOnInit();
    expect(component.currentValue).toEqual({});
  });

  it('should fail validation for custom rule when customValidator returns false', () => {
    component.property = {
      ...baseProperty,
      validation: [{
        type: 'custom',
        message: 'Custom validation failed',
        customValidator: (val: any) => val === 'valid'
      }]
    };
    component.value = 'invalid';
    component.ngOnInit();

    expect(component.isValid).toBe(false);
    expect(component.validationErrors).toContain('Custom validation failed');
  });

  it('should pass validation for custom rule when customValidator returns true', () => {
    component.property = {
      ...baseProperty,
      validation: [{
        type: 'custom',
        message: 'Custom validation failed',
        customValidator: (val: any) => val === 'valid'
      }]
    };
    component.value = 'valid';
    component.ngOnInit();

    expect(component.isValid).toBe(true);
    expect(component.validationErrors).toEqual([]);
  });
});
