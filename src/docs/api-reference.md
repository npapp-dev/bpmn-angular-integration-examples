# API Reference

## 🔗 Core Services

### BpmnService

The `BpmnService` is the core service that manages BPMN.js integration and provides the main API for diagram operations.

#### Configuration

```typescript
export interface BpmnConfig {
  container?: any;
  propertiesPanel?: {
    parent?: any;
  };
  additionalModules?: any[];
  moddleExtensions?: any;
}
```

#### Methods

##### Modeler Management

```typescript
// Create a new BPMN modeler instance
createModeler(config: BpmnConfig): void

// Destroy the current modeler instance
destroyModeler(): void

// Get the current modeler instance
getModeler(): Modeler | null

// Check if modeler is initialized
isModelerReady(): boolean
```

##### Diagram Operations

```typescript
// Import BPMN XML into the modeler
importXML(xml: string): Promise<ImportResult>

// Export current diagram as BPMN XML
exportXML(): Promise<{ xml: string }>

// Export current diagram as SVG
exportSVG(): Promise<{ svg: string }>

// Get default BPMN XML template
getDefaultXML(): string

// Clear the diagram
clearDiagram(): Promise<void>
```

##### Element Operations

```typescript
// Get a specific element by ID
getElement(elementId: string): any

// Get all elements in the diagram
getAllElements(): any[]

// Get the currently selected element
getSelectedElement(): any | null

// Select an element programmatically
selectElement(elementId: string): void
```

##### Command Stack Operations

```typescript
// Undo the last operation
undo(): void

// Redo the last undone operation
redo(): void

// Check if undo is available
canUndo(): boolean

// Check if redo is available
canRedo(): boolean

// Get command stack instance
getCommandStack(): CommandStack | null
```

#### Events

The service emits various events that can be subscribed to:

```typescript
// Element selection changed
elementSelected: Observable<any>

// Diagram was imported
diagramImported: Observable<ImportResult>

// Diagram was modified
diagramModified: Observable<void>

// Command stack changed (undo/redo state)
commandStackChanged: Observable<void>
```

---

### CustomPropertiesService

Manages custom properties for BPMN elements with validation and business rules.

#### Interfaces

```typescript
export interface EnhancedElementProperties {
  elementId: string;
  elementType: BpmnElementType;
  properties: { [key: string]: any };
  groups: PropertyGroup[];
  validation?: PropertyValidationResult;
  isReadonly?: boolean;
}

export interface PropertyGroup {
  id: string;
  label: string;
  properties: PropertyDefinition[];
  collapsed?: boolean;
  visible?: boolean;
}

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  group: string;
  defaultValue?: any;
  required?: boolean;
  readonly?: boolean;
  visible?: boolean;
  description?: string;
  placeholder?: string;
  validation?: PropertyValidation;
  businessRules?: BusinessRule[];
  options?: PropertyOption[];
  dependsOn?: string[];
  conditionalLogic?: ConditionalLogic;
}
```

#### Methods

##### Property Management

```typescript
// Get all properties for an element
getElementProperties(elementId: string): EnhancedElementProperties | null

// Set a property value for an element
setProperty(elementId: string, propertyId: string, value: any): void

// Get a specific property value
getProperty(elementId: string, propertyId: string): any

// Remove a property from an element
removeProperty(elementId: string, propertyId: string): void

// Clear all properties for an element
clearElementProperties(elementId: string): void
```

##### Schema Operations

```typescript
// Get property schema for an element type
getPropertySchema(elementType: BpmnElementType): ElementPropertySchema | null

// Register a new property definition
registerPropertyDefinition(definition: PropertyDefinition): void

// Get all registered property definitions
getPropertyDefinitions(): PropertyDefinition[]

// Update an existing property definition
updatePropertyDefinition(propertyId: string, updates: Partial<PropertyDefinition>): void
```

##### Business Rules

```typescript
// Apply business rules for an element
applyBusinessRules(elementId: string): void

// Execute a specific business rule
executeRule(rule: BusinessRule, context: ValidationContext): BusinessRuleExecutionResult

// Register a new business rule
registerBusinessRule(rule: BusinessRule): void

// Get all business rules for a property
getBusinessRules(propertyId: string): BusinessRule[]
```

##### Validation

```typescript
// Validate all properties for an element
validateElementProperties(elementId: string): PropertyValidationResult

// Validate a specific property
validateProperty(elementId: string, propertyId: string, value: any): PropertyValidationResult

// Register custom validation rule
registerValidationRule(rule: ValidationRule): void
```

---

### ValidationService

Provides comprehensive validation for BPMN diagrams and properties.

#### Interfaces

```typescript
export interface ValidationContext {
  element: any;
  elementId: string;
  elementType: BpmnElementType;
  properties: { [key: string]: any };
  processData?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  elementId: string;
  timestamp: Date;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  elementTypes: BpmnElementType[];
  severity: 'error' | 'warning' | 'info';
  validate: (context: ValidationContext) => ValidationResult;
}
```

#### Methods

##### Diagram Validation

```typescript
// Validate the entire diagram
validateDiagram(): Observable<ValidationResult[]>

// Validate a specific element
validateElement(elementId: string): ValidationResult

// Validate element properties
validateElementProperties(elementId: string): PropertyValidationResult

// Get validation summary
getValidationSummary(): ValidationSummary
```

##### Rule Management

```typescript
// Register a new validation rule
registerRule(rule: ValidationRule): void

// Remove a validation rule
removeRule(ruleId: string): void

// Get all registered rules
getRules(): ValidationRule[]

// Get rules for specific element type
getRulesForElementType(elementType: BpmnElementType): ValidationRule[]
```

##### Validation Events

```typescript
// Validation completed for element
elementValidated: Observable<ValidationResult>

// Full diagram validation completed
diagramValidated: Observable<ValidationResult[]>

// Validation rule registered
ruleRegistered: Observable<ValidationRule>
```

---

### DiagramStateService

Manages application state and provides reactive updates.

#### State Interfaces

```typescript
export interface DiagramState {
  selectedElementId: string | null;
  isModified: boolean;
  validationResults: ValidationResult[];
  undoAvailable: boolean;
  redoAvailable: boolean;
  zoomLevel: number;
  viewBox: ViewBox;
}

export interface DiagramAction {
  type: string;
  payload: any;
  timestamp: Date;
}
```

#### Methods

##### State Management

```typescript
// Get current diagram state
getState(): Observable<DiagramState>

// Update diagram state
updateState(updates: Partial<DiagramState>): void

// Reset state to initial values
resetState(): void

// Get current state snapshot
getCurrentState(): DiagramState
```

##### Element Selection

```typescript
// Set selected element
setSelectedElement(elementId: string | null): void

// Get selected element ID
getSelectedElementId(): Observable<string | null>

// Clear selection
clearSelection(): void
```

##### Modification Tracking

```typescript
// Mark diagram as modified
markAsModified(): void

// Mark diagram as saved
markAsSaved(): void

// Check if diagram is modified
isModified(): Observable<boolean>
```

##### Action History

```typescript
// Add action to history
addAction(action: DiagramAction): void

// Get action history
getActionHistory(): DiagramAction[]

// Clear action history
clearActionHistory(): void
```

---

### FileService

Handles file operations for diagram import/export.

#### Methods

##### Import Operations

```typescript
// Import BPMN file from input element
importFromFile(file: File): Promise<string>

// Import from URL
importFromUrl(url: string): Promise<string>

// Validate file format
validateBpmnFile(file: File): boolean
```

##### Export Operations

```typescript
// Export diagram as BPMN XML file
exportAsBpmn(filename?: string): void

// Export diagram as SVG file
exportAsSvg(filename?: string): void

// Export diagram as PNG (if supported)
exportAsPng(filename?: string): void

// Get export data without downloading
getExportData(format: 'bpmn' | 'svg'): Promise<string>
```

##### File Utilities

```typescript
// Generate filename with timestamp
generateFilename(baseName: string, extension: string): string

// Download data as file
downloadFile(data: string, filename: string, mimeType: string): void

// Check browser file API support
isFileApiSupported(): boolean
```

---

## 🧩 Component APIs

### DiagramEditorComponent

The main BPMN diagram editing component.

#### Inputs

```typescript
@Input() initialXml?: string;
@Input() readOnly?: boolean;
@Input() config?: BpmnConfig;
```

#### Outputs

```typescript
@Output() elementSelected = new EventEmitter<any>();
@Output() diagramChanged = new EventEmitter<void>();
@Output() importCompleted = new EventEmitter<ImportResult>();
@Output() exportCompleted = new EventEmitter<{ format: string; data: string }>();
```

#### Methods

```typescript
// Import BPMN XML
importDiagram(xml: string): Promise<ImportResult>

// Export current diagram
exportDiagram(format: 'xml' | 'svg'): Promise<string>

// Fit diagram to viewport
fitToViewport(): void

// Zoom to specific level
zoomTo(level: number): void

// Reset zoom to 100%
resetZoom(): void
```

### PropertiesPanelComponent

Advanced properties management component.

#### Inputs

```typescript
@Input() selectedElementId: string | null;
@Input() readOnly?: boolean;
@Input() showValidation?: boolean;
```

#### Outputs

```typescript
@Output() propertyChanged = new EventEmitter<PropertyChangeEvent>();
@Output() validationStateChanged = new EventEmitter<PropertyValidationResult>();
```

#### Methods

```typescript
// Refresh properties for current element
refreshProperties(): void

// Validate all properties
validateAllProperties(): void

// Reset properties to default values
resetToDefaults(): void

// Export properties as JSON
exportProperties(): object
```

### DiagramToolbarComponent

Toolbar component with diagram operations.

#### Inputs

```typescript
@Input() showFileOperations?: boolean = true;
@Input() showEditOperations?: boolean = true;
@Input() showViewOperations?: boolean = true;
@Input() customActions?: ToolbarAction[];
```

#### Outputs

```typescript
@Output() actionClicked = new EventEmitter<string>();
@Output() fileOperation = new EventEmitter<FileOperation>();
```

#### Available Actions

```typescript
// File operations
'new', 'open', 'save', 'export-xml', 'export-svg'

// Edit operations
'undo', 'redo', 'copy', 'paste', 'delete'

// View operations
'zoom-in', 'zoom-out', 'zoom-reset', 'fit-viewport'

// Validation
'validate', 'clear-errors'
```

---

## 🔧 Extension APIs

### Custom Properties Provider

Create custom properties for specific BPMN elements.

```typescript
// Define custom property provider
export function createCustomPropertiesProvider() {
  return {
    __init__: ['customPropertiesProvider'],
    customPropertiesProvider: ['type', CustomPropertiesProvider]
  };
}

// Implementation
function CustomPropertiesProvider(propertiesPanel, translate) {
  this.getGroups = function(element) {
    return function(groups) {
      if (is(element, 'bpmn:UserTask')) {
        groups.push(createUserTaskGroup(element, translate));
      }
      return groups;
    };
  };
}
```

### Custom Validation Rules

Implement domain-specific validation logic.

```typescript
// Define validation rule
const customRule: ValidationRule = {
  id: 'user-task-assignee',
  name: 'User Task Assignee Required',
  description: 'User tasks must have an assignee',
  elementTypes: [BpmnElementType.USER_TASK],
  severity: 'error',
  validate: (context: ValidationContext) => {
    const assignee = context.properties['assignee'];
    return {
      isValid: !!assignee,
      errors: assignee ? [] : ['User task must have an assignee'],
      warnings: [],
      elementId: context.elementId,
      timestamp: new Date()
    };
  }
};

// Register the rule
validationService.registerRule(customRule);
```

### Business Rules

Implement automated property updates based on business logic.

```typescript
// Define business rule
const businessRule: BusinessRule = {
  id: 'auto-generate-task-id',
  name: 'Auto Generate Task ID',
  description: 'Automatically generate task ID based on name',
  triggers: ['name'],
  condition: (context) => context.elementType === BpmnElementType.USER_TASK,
  execute: (context) => {
    const name = context.properties['name'];
    if (name && !context.properties['taskId']) {
      const taskId = name.toLowerCase().replace(/\s+/g, '-');
      return { taskId };
    }
    return {};
  }
};

// Register the business rule
customPropertiesService.registerBusinessRule(businessRule);
```

---

## 📊 Type Definitions

### Core Types

```typescript
// BPMN Element Types
export enum BpmnElementType {
  START_EVENT = 'bpmn:StartEvent',
  END_EVENT = 'bpmn:EndEvent',
  USER_TASK = 'bpmn:UserTask',
  SERVICE_TASK = 'bpmn:ServiceTask',
  EXCLUSIVE_GATEWAY = 'bpmn:ExclusiveGateway',
  SEQUENCE_FLOW = 'bpmn:SequenceFlow',
  // ... more types
}

// Property Types
export enum PropertyType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multiSelect',
  DATE = 'date',
  TIME = 'time',
  EMAIL = 'email',
  URL = 'url',
  PASSWORD = 'password',
  FILE = 'file'
}
```

### Event Types

```typescript
// Property change event
export interface PropertyChangeEvent {
  elementId: string;
  propertyId: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

// Validation events
export interface ValidationEvent {
  elementId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Diagram events
export interface DiagramEvent {
  type: 'import' | 'export' | 'modify' | 'select';
  data: any;
  timestamp: Date;
}
```

---

This API reference provides comprehensive documentation for all the major services, components, and extension points in the BPMN Angular Integration project. Use these APIs to build upon the existing functionality and create custom BPMN diagram solutions.
