# Code Examples and Use Cases

## 🎯 Overview

This section provides practical examples for the BPMN Angular Integration project. They use the APIs that exist in `src/app/` (see the [API Reference](api-reference.md)). Components in this app are declared in `AppModule` (`standalone: false`) and use the `@if` / `@for` control flow. Examples that call a backend (`/api/...`) are illustrative: the project itself has no server.

## 🚀 Basic Usage Examples

### 1. Creating a Simple BPMN Editor

**Scenario**: Embed a basic BPMN editor in your Angular application. This mirrors `DiagramComponent.initializeBpmnModeler()`.

```typescript
// simple-editor.component.ts
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { BpmnService } from './services/bpmn.service';

@Component({
  selector: 'app-simple-editor',
  standalone: false,   // declare it in a module's `declarations`
  template: `
    <div class="bpmn-editor-container">
      <div #diagramContainer class="diagram-container"></div>
      <div #propertiesContainer class="properties-container"></div>
    </div>
  `,
  styles: [`
    .bpmn-editor-container { display: flex; height: 100vh; }
    .diagram-container { flex: 1; }
    .properties-container { width: 300px; border-left: 1px solid #ddd; }
  `]
})
export class SimpleEditorComponent implements AfterViewInit {
  @ViewChild('diagramContainer', { static: true }) diagramContainer!: ElementRef<HTMLElement>;
  @ViewChild('propertiesContainer', { static: true }) propertiesContainer!: ElementRef<HTMLElement>;

  constructor(private bpmnService: BpmnService) {}

  ngAfterViewInit(): void {
    // Default modules (properties panel + custom provider) and the `custom` moddle extension are applied by the service
    this.bpmnService.createModeler({
      container: this.diagramContainer.nativeElement,
      propertiesPanel: { parent: this.propertiesContainer.nativeElement }
    });
    this.bpmnService.attachModeler(
      this.diagramContainer.nativeElement,
      this.propertiesContainer.nativeElement
    );

    // importXML returns an Observable
    this.bpmnService.importXML(this.bpmnService.getDefaultXML()).subscribe({
      error: err => console.error('Import failed', err)
    });
  }
}
```

Remember to include the four required stylesheets in `angular.json` (see the root README), otherwise the canvas and properties panel render unstyled.

### 2. Handling Element Selection

**Scenario**: React to element selection and display custom information. `DiagramComponent` already forwards bpmn-js `selection.changed` events to `DiagramStateService`, so you can read the selected element from `state$`.

```typescript
// selection-info.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { DiagramStateService } from './services/diagram-state.service';

@Component({
  selector: 'app-selection-info',
  standalone: false,
  template: `
    @if (selectedElement) {
      <div class="info-panel">
        <h3>{{ selectedElement.businessObject.name || 'Unnamed Element' }}</h3>
        <p><strong>Type:</strong> {{ getElementType(selectedElement) }}</p>
        <p><strong>ID:</strong> {{ selectedElement.id }}</p>
        @if (getDocumentation(selectedElement)) {
          <p><strong>Documentation:</strong> {{ getDocumentation(selectedElement) }}</p>
        }
      </div>
    }
  `
})
export class SelectionInfoComponent implements OnInit, OnDestroy {
  selectedElement: any = null;
  private destroy$ = new Subject<void>();

  constructor(private diagramState: DiagramStateService) {}

  ngOnInit(): void {
    // Prefer state$ + operators over select(), which subscribes without teardown
    this.diagramState.state$
      .pipe(map(s => s.selectedElement ?? null), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(el => (this.selectedElement = el));
  }

  getElementType(element: any): string {
    return element.businessObject.$type.replace('bpmn:', '');
  }

  getDocumentation(element: any): string {
    // businessObject.documentation is an array of bpmn:Documentation
    const docs = element.businessObject.documentation;
    return docs && docs.length > 0 ? docs[0].text : '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3. Custom File Operations

**Scenario**: Implement save/load with a backend. The app's own toolbar uses `FileService` (browser download/upload); this example adds a server round-trip using `BpmnService` and `HttpClient` (already provided in `AppModule`).

```typescript
// file-manager.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BpmnService } from './services/bpmn.service';
import { DiagramStateService } from './services/diagram-state.service';

@Injectable({ providedIn: 'root' })
export class FileManagerService {
  constructor(
    private http: HttpClient,
    private bpmnService: BpmnService,
    private diagramState: DiagramStateService
  ) {}

  async saveDiagramToServer(name: string): Promise<void> {
    const { xml } = await this.bpmnService.exportXML({ format: true });
    await firstValueFrom(this.http.post('/api/diagrams', {
      name,
      content: xml,
      lastModified: new Date().toISOString()
    }));
    this.diagramState.setDiagramExported();   // clears the unsaved-changes flag
  }

  async loadDiagramFromServer(id: string): Promise<void> {
    const diagram = await firstValueFrom(this.http.get<any>(`/api/diagrams/${id}`));
    await firstValueFrom(this.bpmnService.importXML(diagram.content));
    this.diagramState.setDiagramLoaded(diagram.content, diagram.name);
  }

  getDiagramList(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>('/api/diagrams'));
  }
}
```

```typescript
// diagram-list.component.ts
@Component({
  selector: 'app-diagram-list',
  standalone: false,
  template: `
    <div class="diagram-list">
      <h3>Saved Diagrams</h3>
      @for (diagram of diagrams; track diagram.id) {
        <div class="diagram-item">
          <span>{{ diagram.name }}</span>
          <span class="last-modified">{{ diagram.lastModified | date }}</span>
          <button type="button" (click)="loadDiagram(diagram.id)">Load</button>
        </div>
      }
    </div>
  `
})
export class DiagramListComponent implements OnInit {
  diagrams: any[] = [];

  constructor(private fileManager: FileManagerService) {}

  async ngOnInit() {
    this.diagrams = await this.fileManager.getDiagramList();
  }

  loadDiagram(id: string) {
    return this.fileManager.loadDiagramFromServer(id);
  }
}
```

If you load XML outside `DiagramComponent`'s import handler, call `CustomPropertiesService.clearAllProperties()` afterwards, as the toolbar's import and reset handlers do, so stale per-element values are dropped.

## 🔧 Advanced Customization Examples

### 4. Custom Properties for User Tasks

**Scenario**: Add specialised properties for user task assignment and form configuration.

Schemas are entries in the `ElementSchemas` array (`models/element-schemas.ts`); properties are a flat list with a `group` key, and `validation` is an array of rules. The existing User Task entry already has `formKey`, `candidateUsers`, `candidateGroups` and `skipExpression`; add or change properties in that entry:

```typescript
// models/element-schemas.ts - inside the BpmnElementType.USER_TASK schema's `properties`
{
  id: 'assignee',
  name: 'assignee',
  type: PropertyType.EMAIL,
  label: 'Assignee',
  description: 'Email of the person assigned to this task',
  group: 'execution',
  validation: [
    { type: 'required', message: 'Assignee is required' },
    { type: 'email', message: 'Please enter a valid email address' }
  ]
},
{
  id: 'candidateGroups',
  name: 'candidateGroups',
  type: PropertyType.MULTI_SELECT,
  label: 'Candidate Groups',
  description: 'Groups eligible to claim this task',
  group: 'execution',
  options: [
    { value: 'managers', label: 'Managers' },
    { value: 'developers', label: 'Developers' },
    { value: 'qa-team', label: 'QA Team' },
    { value: 'business-analysts', label: 'Business Analysts' }
  ]
},
{
  id: 'dueDate',
  name: 'dueDate',
  type: PropertyType.DATE,
  label: 'Due Date',
  description: 'When this task should be completed',
  group: 'execution'
},
{
  id: 'formFields',
  name: 'formFields',
  type: PropertyType.JSON,            // JSON text editor; stored as a JSON string in the XML
  label: 'Form Fields',
  description: 'Form field definitions as JSON',
  defaultValue: [],
  group: 'technical'
}
```

Notes:
- Values are stored in the BPMN XML as `custom:Properties` extension elements (`MULTI_SELECT` as a comma-separated string, `JSON` as a JSON string) and parsed back on selection.
- There is no pluggable `PropertyType.CUSTOM` / custom component hook. For a bespoke editor, add a new `PropertyType` value and a template branch in `PropertyInputComponent`.
- Before adding a property, check `CommonProperties` in `models/bpmn-elements.model.ts`: `priority`, `assignee`, `dueDate`, `category`, `tags` and `isActive` are already defined and can be reused as `CommonProperties['priority']`.
- Properties with a `conditional` (`{ dependsOn, values }`) are shown only when another property has one of the listed values.

### 5. Custom Validation Rules

**Scenario**: Implement business-specific validation rules for process compliance.

Property-level rules and schema-level business rules are declarative (see [Developer Guide](developer-guide.md#creating-custom-validation-rules)). For example, a service task that needs a topic when it is an external task is already expressed as:

```typescript
const ServiceTaskBusinessRules: BusinessRule[] = [
  {
    id: 'topicRequired',
    name: 'Topic Required',
    description: 'Topic is required for external tasks',
    condition: 'implementation === "external" && !topic',   // true = violation
    action: 'validate',
    target: 'topic',
    message: 'Topic is required for external task implementation'
  }
];
```

`ValidationService` has no rule registry and does not look at the diagram structure. For diagram-level checks (for example "service tasks should have an error boundary event"), write a small service that reads the modeler's `elementRegistry` and report the results yourself:

```typescript
// compliance-check.service.ts
@Injectable({ providedIn: 'root' })
export class ComplianceCheckService {
  constructor(private bpmnService: BpmnService) {}

  check(): { elementId: string; message: string }[] {
    const modeler: any = this.bpmnService.getModeler();
    if (!modeler) return [];

    const elements: any[] = modeler.get('elementRegistry').getAll();
    const issues: { elementId: string; message: string }[] = [];

    for (const el of elements) {
      const type = el.businessObject?.$type;

      if (type === 'bpmn:ServiceTask') {
        const hasErrorBoundary = (el.attachers ?? []).some((a: any) =>
          a.businessObject.eventDefinitions?.some((d: any) => d.$type === 'bpmn:ErrorEventDefinition')
        );
        if (!hasErrorBoundary) {
          issues.push({ elementId: el.id, message: 'Consider adding error handling for this service task' });
        }
      }
    }

    // Structural checks the editor does not do for you
    const types = elements.map(e => e.businessObject?.$type);
    if (!types.includes('bpmn:StartEvent')) issues.push({ elementId: 'process', message: 'Process has no start event' });
    if (!types.includes('bpmn:EndEvent')) issues.push({ elementId: 'process', message: 'Process has no end event' });

    return issues;
  }
}
```

Business-rule `condition` strings are evaluated with `new Function`, so author them in code only and never build them from user input. A condition that throws is caught and the rule is reported as passed.

### 6. Business Rules Engine

**Scenario**: Automate behaviour based on property values.

Business rules are declared on a schema (`businessRules`). `PropertiesPanelComponent` calls `CustomPropertiesService.applyBusinessRules(elementId)` after each property change, and `ValidationService` also evaluates them when it validates the element. Supported `action` values are `validate`, `transform`, `default`, `hide`, `show`, `enable`, `disable`, but only these are acted on today:

- `validate`: the rule shows up as a failed validation (with `message`) when its `condition` is true.
- `default`: `applyBusinessRules` writes `value` into `target`.
- `hide`: only logs that the property should be hidden (use a property's `conditional` or `visible` field to hide fields instead).

Because `applyBusinessRules` applies every `default` rule result without checking whether the condition held, give `default` rules a `condition` you are happy to see applied unconditionally, or prefer `defaultValue` on the property definition.

```typescript
const ScriptTaskBusinessRules: BusinessRule[] = [
  {
    id: 'scriptRequired',
    name: 'Script Required',
    description: 'A script task needs a script body',
    condition: '!script',
    action: 'validate',
    target: 'script',
    message: 'Script is required'
  }
];

// then attach it in the Script Task schema:
// { elementType: BpmnElementType.SCRIPT_TASK, ..., businessRules: ScriptTaskBusinessRules }
```

To compute values from other properties (for example generating an id from a name), handle the `(propertyChanged)` output of `<app-properties-panel>` (bound in `diagram.component.html` to `DiagramComponent.onPropertyChange`) or subscribe to `CustomPropertiesService.properties$`, and call `customPropertiesService.setProperty(elementId, 'taskId', value)`:

```typescript
onPropertyChanged(e: PropertyChangeEvent) {
  if (e.propertyId === 'name' && typeof e.newValue === 'string') {
    const taskId = e.newValue.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);
    this.customPropertiesService.setProperty(e.elementId, 'taskId', taskId);
  }
}
```

(`taskId` must exist as a property in the element's schema to appear in the panel; `setProperty` itself does not persist to the BPMN XML.)

## 🌟 Real-World Use Cases

### 7. Document Approval Workflow

**Scenario**: Create a document approval process with routing based on document type and value.

Add the approval fields to the User Task schema (flat `properties` list, `group` keys from `PropertyGroups`):

```typescript
{
  id: 'approvalLevel',
  name: 'approvalLevel',
  type: PropertyType.SELECT,
  label: 'Approval Level',
  group: 'business',
  options: [
    { value: '1', label: 'Level 1 - Supervisor' },
    { value: '2', label: 'Level 2 - Manager' },
    { value: '3', label: 'Level 3 - Director' },
    { value: '4', label: 'Level 4 - Executive' }
  ]
},
{
  id: 'requiredSignatures',
  name: 'requiredSignatures',
  type: PropertyType.NUMBER,
  label: 'Required Signatures',
  description: 'Number of signatures required at this level',
  defaultValue: 1,
  group: 'business',
  validation: [{ type: 'min', value: 1, message: 'At least one signature is required' }]
}
```

Load a template diagram and pre-configure approval tasks when they are selected:

```typescript
@Component({
  selector: 'app-document-approval-designer',
  standalone: false,
  template: `
    <label>Process template
      <select [(ngModel)]="selectedTemplate" (ngModelChange)="loadTemplate()">
        <option value="">Select a template...</option>
        <option value="simple-approval">Simple Approval</option>
        <option value="multi-level-approval">Multi-Level Approval</option>
      </select>
    </label>
  `
})
export class DocumentApprovalDesignerComponent {
  selectedTemplate = '';

  constructor(
    private bpmnService: BpmnService,
    private customPropertiesService: CustomPropertiesService,
    private templateService: ApprovalTemplateService
  ) {}

  async loadTemplate(): Promise<void> {
    if (!this.selectedTemplate) return;
    const xml = this.templateService.getTemplate(this.selectedTemplate);
    await firstValueFrom(this.bpmnService.importXML(xml));
    this.customPropertiesService.clearAllProperties();   // drop values of the previous diagram
  }

  // Call from DiagramEditorComponent's (selectionChanged) handler
  configureApprovalTask(element: any): void {
    if (element?.businessObject?.$type !== 'bpmn:UserTask') return;
    const name: string = element.businessObject.name || '';

    // Properties exist after CustomPropertiesService.initializeElementProperties ran for this element
    if (name.includes('Level 1')) {
      this.customPropertiesService.setProperties(element.id, {
        approvalLevel: '1',
        candidateGroups: 'supervisors',
        requiredSignatures: 1
      });
    }
  }
}
```

Note that `setProperties` only updates the in-memory values and validation. To persist a value into the BPMN XML the properties panel applies it via `modeling.updateProperties` (see `PropertiesPanelComponent.onPropertyValueChange`), so values set only through the service are not exported until the user edits them in the panel, or you write the extension element yourself.

```typescript
// approval-template.service.ts
@Injectable({ providedIn: 'root' })
export class ApprovalTemplateService {
  getTemplate(name: string): string {
    return name === 'multi-level-approval'
      ? this.multiLevelApproval()
      : this.simpleApproval();
  }

  private simpleApproval(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
                   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                   id="simple-approval-process" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="SimpleApproval" isExecutable="true">
    <bpmn2:startEvent id="StartEvent_1" name="Document Submitted"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ReviewDocument"/>
    <bpmn2:userTask id="ReviewDocument" name="Review Document"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="ReviewDocument" targetRef="ApprovalDecision"/>
    <bpmn2:exclusiveGateway id="ApprovalDecision" name="Approved?"/>
    <bpmn2:sequenceFlow id="Flow_Approved" sourceRef="ApprovalDecision" targetRef="DocumentApproved" name="Yes"/>
    <bpmn2:sequenceFlow id="Flow_Rejected" sourceRef="ApprovalDecision" targetRef="DocumentRejected" name="No"/>
    <bpmn2:endEvent id="DocumentApproved" name="Document Approved"/>
    <bpmn2:endEvent id="DocumentRejected" name="Document Rejected"/>
  </bpmn2:process>
</bpmn2:definitions>`;
  }

  private multiLevelApproval(): string {
    // Same shape with Level 1 and Level 2 user tasks, each followed by an exclusive gateway
    return this.simpleApproval();
  }
}
```

The template XML above omits the `bpmndi:BPMNDiagram` layout section for brevity. bpmn-js needs that section to draw the diagram, so a real template must include shapes and edges; use the full XML from `BpmnService.getDefaultXML()` as a model.

### 8. Integration with External Systems

**Scenario**: Connect BPMN processes with external APIs.

```typescript
// integration.service.ts
@Injectable({ providedIn: 'root' })
export class ProcessIntegrationService {
  constructor(private http: HttpClient) {}

  async validateAssignee(email: string): Promise<boolean> {
    try {
      return !!(await firstValueFrom(this.http.get(`/api/hr/employees/${email}`)));
    } catch {
      return false;
    }
  }

  async deployProcess(processXml: string, processId: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/bpm/deploy', { processId, processDefinition: processXml }));
  }

  async startProcessInstance(processId: string, variables: any): Promise<string> {
    const response = await firstValueFrom(this.http.post<any>('/api/bpm/start', { processId, variables }));
    return response.instanceId;
  }
}
```

`ValidationService` validates synchronously, so remote checks cannot be plugged in as validation rules. Run them from your own component and show the result next to the field, for example when the assignee changes:

```typescript
// in the handler bound to <app-properties-panel (propertyChanged)="...">
async onPropertyChanged(e: PropertyChangeEvent) {
  if (e.propertyId === 'assignee' && e.newValue) {
    const exists = await this.integration.validateAssignee(e.newValue);
    this.assigneeWarning = exists ? '' : `Assignee ${e.newValue} not found in HR system`;
  }
}
```

To deploy the diagram, export the XML first:

```typescript
const { xml } = await this.bpmnService.exportXML({ format: true });
await this.integration.deployProcess(xml!, 'Process_1');
```

## 📊 Performance and Testing Examples

### 9. Performance Monitoring

**Scenario**: Monitor diagram size and provide optimisation suggestions. `BpmnService` has no change observables, so listen to bpmn-js events on the event bus.

```typescript
// performance-monitor.service.ts
@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {
  private metrics = new BehaviorSubject<{ elementCount: number; recommendations: string[] }>({
    elementCount: 0,
    recommendations: []
  });
  metrics$ = this.metrics.asObservable();

  constructor(private bpmnService: BpmnService) {}

  // Call once after DiagramComponent has created the modeler (for example in the `ready` handler)
  start(): void {
    const modeler: any = this.bpmnService.getModeler();
    if (!modeler) return;
    const eventBus = modeler.get('eventBus');
    eventBus.on(['import.done', 'commandStack.changed'], () => this.update());
    this.update();
  }

  private update(): void {
    const modeler: any = this.bpmnService.getModeler();
    const elements: any[] = modeler.get('elementRegistry').getAll();
    const recommendations: string[] = [];

    if (elements.length > 100) {
      recommendations.push('Large diagram - performance may be impacted; split it into sub-processes');
    } else if (elements.length > 50) {
      recommendations.push('Consider breaking large diagrams into smaller sub-processes');
    }

    const complexGateways = elements.filter(el =>
      el.businessObject?.$type?.includes('Gateway') &&
      ((el.incoming?.length ?? 0) > 3 || (el.outgoing?.length ?? 0) > 3)
    );
    if (complexGateways.length > 5) {
      recommendations.push('Multiple complex gateways detected - simplify decision logic');
    }

    this.metrics.next({ elementCount: elements.length, recommendations });
  }
}
```

### 10. Automated Testing

**Scenario**: Test BPMN processes. Specs run on **Vitest** with Angular TestBed and jsdom (`npx vitest run`). Specs in this repo mock bpmn-js and the properties-panel packages instead of rendering them, because the real modeler needs a browser canvas. To test the XML your app produces, either use bpmn-moddle directly (no canvas needed) or run the app in a browser (see the `verifying-in-browser` skill).

```typescript
// process-structure.spec.ts
import BpmnModdle from 'bpmn-moddle';
import { describe, it, expect } from 'vitest';
import custom from './utils/descriptors/custom.json';

const simpleProcess = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs">
  <bpmn2:process id="TestProcess">
    <bpmn2:startEvent id="start"/>
    <bpmn2:sequenceFlow id="flow1" sourceRef="start" targetRef="task"/>
    <bpmn2:userTask id="task" name="Test Task"/>
    <bpmn2:sequenceFlow id="flow2" sourceRef="task" targetRef="end"/>
    <bpmn2:endEvent id="end"/>
  </bpmn2:process>
</bpmn2:definitions>`;

describe('process structure', () => {
  it('has a start and an end event', async () => {
    const moddle = new BpmnModdle({ custom });
    const { rootElement } = await moddle.fromXML(simpleProcess);

    const process: any = (rootElement as any).rootElements[0];
    const types = process.flowElements.map((e: any) => e.$type);

    expect(types).toContain('bpmn:StartEvent');
    expect(types).toContain('bpmn:EndEvent');
  });
});
```

(`bpmn-moddle` is a transitive dependency of `bpmn-js`; add it to `devDependencies` if you import it directly.)

For service specs, instantiate the real service through TestBed:

```typescript
describe('ValidationService', () => {
  it('reports a required property that is missing', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ValidationService);

    const schema = getElementSchema(BpmnElementType.USER_TASK)!;
    const context = { elementId: 'task1', elementType: 'bpmn:UserTask', elementData: {} };

    let result: PropertyValidationResult | undefined;
    service.validateElement(schema, { id: '' }, context).subscribe(r => (result = r));

    expect(result?.isValid).toBe(false);
  });
});
```

---

These examples use the services, components and extension points that exist in the code. For the full signatures, see the [API Reference](api-reference.md) and the [Developer Guide](developer-guide.md).
