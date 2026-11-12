# API Reference

> All services are `providedIn: 'root'` and all components are declared in `AppModule` with `standalone: false`. Signatures below are taken from the source in `src/app/`.

## 🔗 Core Services

### BpmnService

The `BpmnService` owns the single bpmn-js `Modeler` instance (`src/app/services/bpmn.service.ts`).

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

`createModeler` defaults `additionalModules` to `BpmnPropertiesPanelModule`, `BpmnPropertiesProviderModule` and the custom properties provider, and `moddleExtensions` to `{ custom }` (`utils/descriptors/custom.json`). A key you pass in the config **replaces** the default for that key (shallow merge), so pass the complete list if you override it.

#### Methods

##### Modeler Management

```typescript
// Create a new BPMN modeler instance
createModeler(config: BpmnConfig): Modeler

// Get the current modeler instance (null before createModeler)
getModeler(): Modeler | null

// Attach the modeler (and optionally the native properties panel) to DOM elements
attachModeler(diagramContainer: HTMLElement, propertiesContainer?: HTMLElement): void

// Destroy the current modeler instance and drop the cached command stack
destroy(): void

// Check if modeler is initialized
isReady(): boolean
```

##### Diagram Operations

```typescript
// Import BPMN XML into the modeler
importXML(xml: string): Observable<ImportResult>

// Export current diagram as BPMN XML
exportXML(options?: { format?: boolean }): Promise<ExportResult>   // ExportResult = { xml?: string }

// Export current diagram as SVG
exportSVG(): Promise<{ svg: string }>

// Get default BPMN XML template
getDefaultXML(): string
```

##### Element Operations

`BpmnService` has no element helpers. Use the modeler's services:

```typescript
const modeler: any = bpmnService.getModeler();
const element = modeler.get('elementRegistry').get('UserTask_1');
const all = modeler.get('elementRegistry').getAll();
modeler.get('selection').select(element);
const selected = modeler.get('selection').get();   // array
modeler.get('modeling').updateProperties(element, { name: 'New name' });
```

##### Command Stack Operations

```typescript
// Cached wrapper around the modeler's commandStack.
// Throws 'Modeler not initialized. Call createModeler first.' if there is no modeler.
getCommandStack(): CommandStack | null

interface CommandStack {
  execute(commandName: string, ...args: any[]): void;
  undo(): void;
  redo(): void;
  canUndo?(): boolean;
  canRedo?(): boolean;
}
```

#### Events

`BpmnService` does not expose observables. Subscribe to bpmn-js events through the event bus; `DiagramComponent` does this and forwards the results to `DiagramStateService` and `CustomPropertiesService`:

```typescript
const eventBus = (bpmnService.getModeler() as any).get('eventBus');
eventBus.on('selection.changed', e => { /* e.newSelection */ });
eventBus.on('element.changed', () => { /* diagram modified */ });
eventBus.on('commandStack.changed', () => { /* undo/redo state */ });
eventBus.on('canvas.viewbox.changed', e => { /* e.viewbox.scale */ });
eventBus.on('import.done', () => { /* import finished */ });
```

---

### CustomPropertiesService

Manages per-element property values for the enhanced properties panel, with validation and business rules.

#### Interfaces

```typescript
export interface EnhancedElementProperties {
  elementId: string;
  elementType: BpmnElementType;
  properties: { [key: string]: any };
  schema?: ElementPropertySchema;
  validationResult?: PropertyValidationResult;
  lastModified: Date;
  isReadonly?: boolean;
}

export interface PropertyGroup {
  id: string;
  label: string;
  icon: string;
  order: number;
  properties: PropertyDefinition[];
  isExpanded?: boolean;
}

export interface PropertyDefinition {          // models/bpmn-elements.model.ts
  id: string;
  name: string;
  type: PropertyType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: PropertyOption[];
  validation?: ValidationRule[];               // { type, value?, message, customValidator? }
  group?: string;                              // key of PropertyGroups
  order?: number;
  visible?: boolean;
  readonly?: boolean;
  conditional?: { dependsOn: string; values: any[] };
}

export interface ElementPropertySchema {
  elementType: BpmnElementType;
  displayName: string;
  icon: string;
  description: string;
  properties: PropertyDefinition[];
  businessRules?: BusinessRule[];
}
```

Business rules live on the **schema** (`ElementPropertySchema.businessRules`), not on individual properties.

#### Observables

```typescript
properties$: Observable<Map<string, EnhancedElementProperties>>
selectedElement$: Observable<string | null>
```

#### Methods

##### Property Management

```typescript
// Select an element; initialises its properties when `element` is passed
setSelectedElement(elementId: string | null, element?: any): void

// Build properties from the schema (existing values > custom:Properties in XML > businessObject > defaults)
initializeElementProperties(elementId: string, element: any): void

// Get all properties for an element
getElementProperties(elementId: string): EnhancedElementProperties | undefined

// Observable for the currently selected element
getSelectedElementProperties(): Observable<EnhancedElementProperties | undefined>

// Set one / several property values (re-validates)
setProperty(elementId: string, propertyName: string, value: any): void
setProperties(elementId: string, properties: { [key: string]: any }): void

// Properties organised by group, in PropertyGroups order
getPropertyGroups(elementId: string): PropertyGroup[]

// Export / import / remove / clear
exportElementProperties(elementId: string): any
importElementProperties(data: any): void
removeElementProperties(elementId: string): void
clearAllProperties(): void
```

##### Schema Operations

Schemas are static (`ElementSchemas` in `models/element-schemas.ts`). There is no runtime registration API.

```typescript
getElementSchema(elementType: BpmnElementType): ElementPropertySchema | undefined
getSupportedElementTypes(): BpmnElementType[]
```

Supported types: UserTask, ServiceTask, ScriptTask, ExclusiveGateway, ParallelGateway, StartEvent, EndEvent, SequenceFlow.

##### Business Rules

```typescript
// Execute the schema's business rules; `default` actions write the target property
applyBusinessRules(elementId: string): void
```

##### Validation

```typescript
// Observable summary across all validated elements
getValidationSummary(): Observable<{
  totalElements: number;
  validElements: number;
  invalidElements: number;
  totalErrors: number;
  totalWarnings: number;
}>
```

Validation of an element runs automatically on initialisation and on every `setProperty` / `setProperties`; the result is stored on `EnhancedElementProperties.validationResult`.

---

### ValidationService

Property validation and business-rule evaluation (`src/app/services/validation.service.ts`).

#### Interfaces

```typescript
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

// models/bpmn-elements.model.ts
export interface PropertyValidationResult {
  isValid: boolean;
  errors: { propertyId: string; message: string; rule: string }[];
  warnings: { propertyId: string; message: string; suggestion?: string }[];
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;                            // JavaScript-style expression
  action: 'validate' | 'transform' | 'default' | 'hide' | 'show' | 'enable' | 'disable';
  target?: string;
  value?: any;
  message?: string;
}
```

#### Methods

##### Validation

```typescript
// Validate every property of an element against its schema (also runs business rules); stores the result
validateElement(schema: ElementPropertySchema, elementData: any, context: ValidationContext): Observable<PropertyValidationResult>

// Validate a single property value (schema rules + built-in cross-property checks)
validateProperty(property: PropertyDefinition, value: any, elementData: any, context: ValidationContext): PropertyValidationResult

// Summary over all stored results
getValidationSummary(): { totalElements; validElements; invalidElements; totalErrors; totalWarnings }
```

Rule types supported in `PropertyDefinition.validation`: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `email`, `url`, `custom`.

##### Business Rules

```typescript
executeBusinessRules(rules: BusinessRule[], elementData: any, context: ValidationContext): Observable<BusinessRuleExecutionResult[]>
```

A rule **passes when its `condition` evaluates to false** (the condition describes the violation). A condition that throws is caught and reported as passed.

##### Stored Results

```typescript
getValidationResults(elementId: string): PropertyValidationResult | undefined
getBusinessRuleResults(elementId: string): BusinessRuleExecutionResult[]
getValidationResults$(): Observable<Map<string, PropertyValidationResult>>
getBusinessRuleResults$(): Observable<Map<string, BusinessRuleExecutionResult[]>>
clearValidationResults(elementId: string): void
```

There is no diagram-wide validation, rule registry, or `registerRule` API.

---

### DiagramStateService

Application state exposed as RxJS streams (`src/app/services/diagram-state.service.ts`).

#### State Interfaces

```typescript
export interface DiagramState {
  isLoaded: boolean;
  isDirty: boolean;
  currentXML: string;
  selectedElement?: any;
  diagramName: string;
  lastModified: Date;
}

export interface DiagramAction {
  type: 'LOAD' | 'EXPORT' | 'RESET' | 'MODIFY' | 'SELECT_ELEMENT';
  payload?: any;
  timestamp: Date;
}
```

#### Observables

```typescript
state$: Observable<DiagramState>
actions$: Observable<DiagramAction | null>
select<K extends keyof DiagramState>(key: K): Observable<DiagramState[K]>   // note: does not unsubscribe from state$
```

#### Methods

##### State Management

```typescript
getCurrentState(): DiagramState
updateState(partialState: Partial<DiagramState>): void   // also bumps lastModified
resetDiagram(): void                                     // clears dirty flag and selection
clearState(): void                                       // back to the initial state
```

##### Loading, Selection and Export

```typescript
setDiagramLoaded(xml: string, diagramName?: string): void
setSelectedElement(element: any): void                  // takes the element, not an id
setDiagramExported(): void                              // clears the dirty flag
setDiagramName(name: string): void
```

##### Modification Tracking

```typescript
setDiagramModified(xml?: string): void
hasUnsavedChanges(): boolean
isLoaded(): boolean
```

##### Getters

```typescript
getCurrentXML(): string
getSelectedElement(): any
getDiagramName(): string
```

Every `set*` call that changes diagram state also emits a `DiagramAction` on `actions$`; there is no action history.

---

### FileService

Browser file download/upload helpers (`src/app/services/file.service.ts`).

#### Interfaces

```typescript
export interface FileExportOptions {
  filename: string;
  format: 'xml' | 'svg' | 'png' | 'json';
  content: string | Blob;
  mimeType?: string;
}

export interface FileImportResult {
  filename: string;
  content: string;
  size: number;
  lastModified: Date;
}
```

#### Methods

##### Import Operations

```typescript
// Open a file picker (default accept: .xml, .bpmn) and read the chosen file as text
importFile(fileTypes?: string[]): Observable<FileImportResult>

// Same, with multiple selection
importMultipleFiles(fileTypes?: string[]): Observable<FileImportResult[]>

// Check that content parses as XML or JSON
validateFileContent(content: string, format: 'xml' | 'json'): { isValid: boolean; error?: string }
```

##### Export Operations

```typescript
// Trigger a browser download via a temporary <a download>
exportFile(options: FileExportOptions): void

// Download { content, metadata } as a timestamped JSON file
createBackup(content: any, metadata?: any): void

// Canvas -> Blob for image export
canvasToBlob(canvas: HTMLCanvasElement, format?: 'png' | 'jpeg', quality?: number): Observable<Blob>
```

##### File Utilities

```typescript
// e.g. diagram_2026-11-10T09-30-00.xml
generateTimestampedFilename(baseName: string, format: string): string
```

`FileService` does not know about the modeler: the caller passes the XML/SVG (from `BpmnService`) as `content`. There is no URL import.

---

## 🧩 Component APIs

### DiagramEditorComponent (`app-diagram-editor`)

Canvas host for the BPMN modeler.

#### Inputs

```typescript
@Input() initialXml?: string;
@Input() readonly: boolean = false;
```

#### Outputs

```typescript
@Output() ready = new EventEmitter<void>();
@Output() error = new EventEmitter<any>();
@Output() selectionChanged = new EventEmitter<any>();
@Output() elementChanged = new EventEmitter<any>();
@Output() importDone = new EventEmitter<any>();
```

#### Methods

```typescript
importXML(xml: string): void
exportXML(options?: { format?: boolean }): Promise<string>
exportSVG(): Promise<string>
zoomToFit(): void
resetZoom(): void
getZoom(): number
setZoom(level: number): void
isReady(): boolean
getSelection(): any[]
selectElements(elementIds: string[]): void
clearSelection(): void
```

### PropertiesPanelComponent (`app-properties-panel`)

Schema-driven enhanced properties panel.

#### Inputs

```typescript
@Input() selectedElementId: string | null = null;
```

#### Outputs

```typescript
@Output() propertyChanged = new EventEmitter<PropertyChangeEvent>();

interface PropertyChangeEvent {
  elementId: string;
  propertyId: string;
  oldValue: any;
  newValue: any;
}
```

#### Methods (public)

```typescript
reattachPanel(): void
onPropertyValueChange(propertyId: string, newValue: any): void
onPropertyValidationChange(propertyId: string, validation: { isValid: boolean; errors: string[] }): void
toggleGroup(group: PropertyGroup): void
onSearchChange(term: string): void
setActiveTab(tab: 'properties' | 'validation' | 'preview'): void
hasValidationIssues(): boolean
getValidationSummary(): string
exportProperties(): void      // downloads the element's properties
```

### PropertyInputComponent (`app-property-input`)

Renders one input for a `PropertyDefinition`.

```typescript
@Input() property!: PropertyDefinition;
@Input() value: any;
@Input() disabled: boolean = false;
@Input() readonly: boolean = false;
@Input() elementData: any = {};          // used for `conditional` visibility

@Output() valueChange = new EventEmitter<any>();
@Output() validationChange = new EventEmitter<{ isValid: boolean; errors: string[] }>();
```

### DiagramToolbarComponent (`app-diagram-toolbar`)

#### Inputs

```typescript
@Input() diagramName: string = 'Untitled Diagram';
@Input() hasUnsavedChanges: boolean = false;
@Input() isReadonly: boolean = false;
@Input() customActions: ToolbarAction[] = [];
@Input() canUndo: boolean = false;
@Input() canRedo: boolean = false;
@Input() propertiesOpen: boolean = true;

interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}
```

#### Outputs

```typescript
@Output() actionClicked = new EventEmitter<string>();   // id of a custom action
@Output() importRequested = new EventEmitter<void>();
@Output() exportXmlRequested = new EventEmitter<void>();
@Output() exportSvgRequested = new EventEmitter<void>();
@Output() resetRequested = new EventEmitter<void>();
@Output() backupRequested = new EventEmitter<void>();
@Output() zoomToFitRequested = new EventEmitter<void>();
@Output() zoomInRequested = new EventEmitter<void>();
@Output() zoomOutRequested = new EventEmitter<void>();
@Output() undoRequested = new EventEmitter<void>();
@Output() redoRequested = new EventEmitter<void>();
@Output() togglePropertiesRequested = new EventEmitter<void>();
```

#### Built-in Actions

```
File:  import, export-xml, export-svg, backup, reset
View:  zoom-to-fit, zoom-in, zoom-out
Edit:  undo, redo
```

There are no new/open/save, copy/paste/delete, or validate actions.

### DiagramStatusComponent (`app-diagram-status`)

```typescript
@Input() showDetails: boolean = true;
@Input() showValidation: boolean = true;
@Input() showZoom: boolean = true;
@Input() showSelection: boolean = true;

// Public methods
setStatus(status: StatusInfo): void
setValidation(validation: ValidationInfo): void
setZoomLevel(level: number): void
dismissValidationDetails(): void
```

---

## 🔧 Extension APIs

### Custom Properties Provider (native bpmn-js panel)

`src/app/custom-properties-provider/custom-property-provider.ts` registers a provider with the native bpmn-js properties panel. Today it adds a "Custom properties" group with one text field (`custom` attribute) to **StartEvent** only.

```typescript
function CustomPropertiesProvider(propertiesPanel, translate) {
  propertiesPanel.registerProvider(LOW_PRIORITY, this);

  this.getGroups = function (element) {
    return function (groups) {
      if (is(element, 'bpmn:StartEvent')) {
        groups.push(createCustomGroup(element, translate));
      }
      return groups;
    };
  };
}
```

To extend it to another type, add an `is()` check **and** a type in `utils/descriptors/custom.json` that `extends` that BPMN type (as `CustomStartEvent` does), otherwise the attribute is not serialised.

### Custom Validation Rules

Validation rules are declarative entries in a property's `validation` array (`models/bpmn-elements.model.ts`):

```typescript
const assigneeProperty: PropertyDefinition = {
  id: 'assignee',
  name: 'assignee',
  type: PropertyType.TEXT,
  label: 'Assignee',
  group: 'execution',
  validation: [
    { type: 'required', message: 'Assignee is required' },
    { type: 'minLength', value: 3, message: 'At least 3 characters' },
    { type: 'custom', message: 'No spaces allowed', customValidator: v => !/\s/.test(v ?? '') }
  ]
};
```

Cross-property checks (for example "a user task needs an assignee, candidate users, or candidate groups") live in `ValidationService.performCrossPropertyValidation`.

### Business Rules

Business rules are declared on a schema in `ElementSchemas`. The `condition` is a JavaScript-style expression over the element's property values:

```typescript
businessRules: [
  {
    id: 'assigneeRequired',
    name: 'Assignee required',
    description: 'User tasks must have an assignee or candidates',
    condition: '!assignee && !candidateUsers && !candidateGroups',   // true = violation
    action: 'validate',
    message: 'User task must have an assignee, candidate users, or candidate groups defined'
  }
]
```

`applyBusinessRules(elementId)` currently acts on `default` (sets `target` to `value`, whether or not the condition held); `hide` only logs. Conditions are evaluated with `new Function`, so define them in code and never from user input.

---

## 📊 Type Definitions

### Core Types

```typescript
// BPMN Element Types (excerpt - the enum also covers events, tasks, gateways, containers, data, swimlanes)
export enum BpmnElementType {
  START_EVENT = 'bpmn:StartEvent',
  END_EVENT = 'bpmn:EndEvent',
  USER_TASK = 'bpmn:UserTask',
  SERVICE_TASK = 'bpmn:ServiceTask',
  SCRIPT_TASK = 'bpmn:ScriptTask',
  EXCLUSIVE_GATEWAY = 'bpmn:ExclusiveGateway',
  PARALLEL_GATEWAY = 'bpmn:ParallelGateway',
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
  DATETIME = 'datetime',
  TIME = 'time',
  EMAIL = 'email',
  URL = 'url',
  FILE = 'file',
  COLOR = 'color',
  JSON = 'json'
}
```

### Shared Definitions

`CommonProperties` (id, name, documentation, priority, assignee, dueDate, category, tags, isActive) and `PropertyGroups` (general, execution, classification, status, technical, business, integration, advanced) are exported from `models/bpmn-elements.model.ts` for reuse in schemas.

### Moddle Extension

`utils/descriptors/custom.json` defines the `custom:` namespace (`http://custom`): `custom:Properties` containing many `custom:Property` (`name`, `value`, `type` attributes), and `CustomStartEvent` which adds a `custom` string attribute to `bpmn:StartEvent`.

---

This reference covers the services, components, and extension points that exist in the code. Where behaviour is not listed here (for example element helpers or a rule registry), it is not implemented.
