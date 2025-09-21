# Code Examples and Use Cases

## 🎯 Overview

This section provides practical examples and real-world use cases for the BPMN Angular Integration project. These examples demonstrate how to implement common scenarios and extend the functionality for specific business needs.

## 🚀 Basic Usage Examples

### 1. Creating a Simple BPMN Editor

**Scenario**: Embed a basic BPMN editor in your Angular application.

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { BpmnService } from './services/bpmn.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="bpmn-editor-container">
      <div #diagramContainer class="diagram-container"></div>
      <div #propertiesContainer class="properties-container"></div>
    </div>
  `,
  styles: [`
    .bpmn-editor-container {
      display: flex;
      height: 100vh;
    }
    .diagram-container {
      flex: 1;
      background: #f8f9fa;
    }
    .properties-container {
      width: 300px;
      border-left: 1px solid #ddd;
      background: white;
    }
  `]
})
export class AppComponent implements OnInit {
  @ViewChild('diagramContainer', { static: true }) 
  diagramContainer!: ElementRef;
  
  @ViewChild('propertiesContainer', { static: true }) 
  propertiesContainer!: ElementRef;

  constructor(private bpmnService: BpmnService) {}

  async ngOnInit() {
    // Initialize BPMN modeler
    this.bpmnService.createModeler({
      container: this.diagramContainer.nativeElement,
      propertiesPanel: {
        parent: this.propertiesContainer.nativeElement
      }
    });

    // Load default diagram
    const defaultXml = this.bpmnService.getDefaultXML();
    await this.bpmnService.importXML(defaultXml);
  }
}
```

### 2. Handling Element Selection

**Scenario**: React to element selection and display custom information.

```typescript
// diagram-viewer.component.ts
@Component({
  selector: 'app-diagram-viewer',
  template: `
    <div class="viewer-layout">
      <div class="diagram-area" #diagramRef></div>
      <div class="info-panel" *ngIf="selectedElement">
        <h3>{{ selectedElement.businessObject.name || 'Unnamed Element' }}</h3>
        <p><strong>Type:</strong> {{ getElementType(selectedElement) }}</p>
        <p><strong>ID:</strong> {{ selectedElement.id }}</p>
        
        <div *ngIf="selectedElement.businessObject.documentation">
          <strong>Documentation:</strong>
          <p>{{ getDocumentation(selectedElement) }}</p>
        </div>
      </div>
    </div>
  `
})
export class DiagramViewerComponent implements OnInit, OnDestroy {
  selectedElement: any = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService
  ) {}

  ngOnInit(): void {
    // Subscribe to element selection changes
    this.subscriptions.push(
      this.diagramStateService.getSelectedElementId().subscribe(elementId => {
        if (elementId) {
          this.selectedElement = this.bpmnService.getElement(elementId);
        } else {
          this.selectedElement = null;
        }
      })
    );
  }

  getElementType(element: any): string {
    return element.businessObject.$type.replace('bpmn:', '');
  }

  getDocumentation(element: any): string {
    const docs = element.businessObject.documentation;
    return docs && docs.length > 0 ? docs[0].text : '';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
```

### 3. Custom File Operations

**Scenario**: Implement custom save/load functionality with backend integration.

```typescript
// file-manager.service.ts
@Injectable({
  providedIn: 'root'
})
export class FileManagerService {
  constructor(
    private http: HttpClient,
    private bpmnService: BpmnService
  ) {}

  async saveDiagramToServer(name: string): Promise<void> {
    try {
      const { xml } = await this.bpmnService.exportXML();
      
      const diagram = {
        name,
        content: xml,
        lastModified: new Date().toISOString()
      };

      await this.http.post('/api/diagrams', diagram).toPromise();
      console.log('Diagram saved successfully');
    } catch (error) {
      console.error('Failed to save diagram:', error);
      throw error;
    }
  }

  async loadDiagramFromServer(id: string): Promise<void> {
    try {
      const diagram = await this.http.get<any>(`/api/diagrams/${id}`).toPromise();
      await this.bpmnService.importXML(diagram.content);
      console.log('Diagram loaded successfully');
    } catch (error) {
      console.error('Failed to load diagram:', error);
      throw error;
    }
  }

  async getDiagramList(): Promise<any[]> {
    return this.http.get<any[]>('/api/diagrams').toPromise();
  }
}

// diagram-list.component.ts
@Component({
  selector: 'app-diagram-list',
  template: `
    <div class="diagram-list">
      <h3>Saved Diagrams</h3>
      <div class="diagram-item" *ngFor="let diagram of diagrams">
        <span>{{ diagram.name }}</span>
        <span class="last-modified">{{ diagram.lastModified | date }}</span>
        <button (click)="loadDiagram(diagram.id)" class="btn btn-primary">Load</button>
      </div>
    </div>
  `
})
export class DiagramListComponent implements OnInit {
  diagrams: any[] = [];

  constructor(private fileManager: FileManagerService) {}

  async ngOnInit() {
    this.diagrams = await this.fileManager.getDiagramList();
  }

  async loadDiagram(id: string) {
    await this.fileManager.loadDiagramFromServer(id);
  }
}
```

## 🔧 Advanced Customization Examples

### 4. Custom Properties for User Tasks

**Scenario**: Add specialized properties for user task assignment and form configuration.

```typescript
// user-task-properties.ts
export const USER_TASK_ENHANCED_SCHEMA: ElementPropertySchema = {
  elementType: BpmnElementType.USER_TASK,
  groups: {
    assignment: {
      id: 'assignment',
      label: 'Task Assignment',
      properties: [
        {
          id: 'assignee',
          name: 'Assignee',
          type: PropertyType.EMAIL,
          group: 'assignment',
          required: true,
          description: 'Email of the person assigned to this task',
          validation: {
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            message: 'Please enter a valid email address'
          }
        },
        {
          id: 'candidateGroups',
          name: 'Candidate Groups',
          type: PropertyType.MULTI_SELECT,
          group: 'assignment',
          options: [
            { value: 'managers', label: 'Managers' },
            { value: 'developers', label: 'Developers' },
            { value: 'qa-team', label: 'QA Team' },
            { value: 'business-analysts', label: 'Business Analysts' }
          ],
          description: 'Groups eligible to claim this task'
        },
        {
          id: 'priority',
          name: 'Priority',
          type: PropertyType.SELECT,
          group: 'assignment',
          defaultValue: 'normal',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]
        },
        {
          id: 'dueDate',
          name: 'Due Date',
          type: PropertyType.DATE,
          group: 'assignment',
          description: 'When this task should be completed'
        }
      ]
    },
    formFields: {
      id: 'formFields',
      label: 'Form Configuration',
      properties: [
        {
          id: 'formKey',
          name: 'Form Key',
          type: PropertyType.TEXT,
          group: 'formFields',
          description: 'Reference to the form definition'
        },
        {
          id: 'formFields',
          name: 'Form Fields',
          type: PropertyType.CUSTOM,
          group: 'formFields',
          customComponent: 'form-fields-editor',
          description: 'Define the form fields for this task'
        }
      ]
    }
  }
};

// form-fields-editor.component.ts
@Component({
  selector: 'app-form-fields-editor',
  template: `
    <div class="form-fields-editor">
      <div class="field-list">
        <div *ngFor="let field of formFields; let i = index" class="field-item">
          <input [(ngModel)]="field.id" placeholder="Field ID" class="form-control">
          <input [(ngModel)]="field.label" placeholder="Field Label" class="form-control">
          <select [(ngModel)]="field.type" class="form-control">
            <option value="string">Text</option>
            <option value="long">Long Text</option>
            <option value="boolean">Checkbox</option>
            <option value="date">Date</option>
            <option value="enum">Dropdown</option>
          </select>
          <button (click)="removeField(i)" class="btn btn-sm btn-danger">Remove</button>
        </div>
      </div>
      <button (click)="addField()" class="btn btn-primary">Add Field</button>
    </div>
  `
})
export class FormFieldsEditorComponent implements PropertyInputComponent {
  @Input() value: any[] = [];
  @Output() valueChange = new EventEmitter<any[]>();

  get formFields(): any[] {
    return this.value || [];
  }

  addField(): void {
    const newField = {
      id: '',
      label: '',
      type: 'string',
      required: false
    };
    const updated = [...this.formFields, newField];
    this.valueChange.emit(updated);
  }

  removeField(index: number): void {
    const updated = this.formFields.filter((_, i) => i !== index);
    this.valueChange.emit(updated);
  }
}
```

### 5. Custom Validation Rules

**Scenario**: Implement business-specific validation rules for process compliance.

```typescript
// compliance-validation.service.ts
@Injectable({
  providedIn: 'root'
})
export class ComplianceValidationService {
  constructor(private validationService: ValidationService) {
    this.registerComplianceRules();
  }

  private registerComplianceRules(): void {
    // Rule: Every user task must have an assignee
    this.validationService.registerRule({
      id: 'user-task-assignee-required',
      name: 'User Task Assignee Required',
      description: 'All user tasks must have an assigned user or group',
      elementTypes: [BpmnElementType.USER_TASK],
      severity: 'error',
      validate: this.validateAssignee.bind(this)
    });

    // Rule: Process must have error handling for service tasks
    this.validationService.registerRule({
      id: 'service-task-error-handling',
      name: 'Service Task Error Handling',
      description: 'Service tasks should have error boundary events',
      elementTypes: [BpmnElementType.SERVICE_TASK],
      severity: 'warning',
      validate: this.validateErrorHandling.bind(this)
    });

    // Rule: Approval processes must have at least one approval task
    this.validationService.registerRule({
      id: 'approval-process-validation',
      name: 'Approval Process Requirements',
      description: 'Approval processes must contain approval tasks',
      elementTypes: [BpmnElementType.PROCESS],
      severity: 'error',
      validate: this.validateApprovalProcess.bind(this)
    });
  }

  private validateAssignee(context: ValidationContext): ValidationResult {
    const { properties } = context;
    const hasAssignee = properties['assignee'] || properties['candidateGroups'];

    return {
      isValid: !!hasAssignee,
      errors: hasAssignee ? [] : ['User task must have an assignee or candidate groups'],
      warnings: [],
      elementId: context.elementId,
      timestamp: new Date()
    };
  }

  private validateErrorHandling(context: ValidationContext): ValidationResult {
    // Check if service task has boundary error events
    const element = context.element;
    const attachedEvents = element.attachers || [];
    const hasErrorEvent = attachedEvents.some(event => 
      event.businessObject.$type === 'bpmn:BoundaryEvent' &&
      event.businessObject.eventDefinitions?.some(def => 
        def.$type === 'bpmn:ErrorEventDefinition'
      )
    );

    return {
      isValid: true, // This is a warning, not an error
      errors: [],
      warnings: hasErrorEvent ? [] : ['Consider adding error handling for this service task'],
      elementId: context.elementId,
      timestamp: new Date()
    };
  }

  private validateApprovalProcess(context: ValidationContext): ValidationResult {
    // Check if process contains approval-related tasks
    const allElements = context.processData?.elements || [];
    const approvalTasks = allElements.filter(el => 
      el.businessObject.$type === 'bpmn:UserTask' &&
      (el.businessObject.name?.toLowerCase().includes('approval') ||
       el.businessObject.name?.toLowerCase().includes('approve') ||
       el.businessObject.name?.toLowerCase().includes('review'))
    );

    const processName = context.element.businessObject.name || '';
    const isApprovalProcess = processName.toLowerCase().includes('approval');

    if (isApprovalProcess && approvalTasks.length === 0) {
      return {
        isValid: false,
        errors: ['Approval process must contain at least one approval task'],
        warnings: [],
        elementId: context.elementId,
        timestamp: new Date()
      };
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
      elementId: context.elementId,
      timestamp: new Date()
    };
  }
}
```

### 6. Business Rules Engine

**Scenario**: Implement automated property updates based on business logic.

```typescript
// business-rules.service.ts
@Injectable({
  providedIn: 'root'
})
export class BusinessRulesService {
  constructor(private customPropertiesService: CustomPropertiesService) {
    this.registerBusinessRules();
  }

  private registerBusinessRules(): void {
    // Auto-generate task IDs based on names
    this.customPropertiesService.registerBusinessRule({
      id: 'auto-task-id',
      name: 'Auto Generate Task ID',
      description: 'Automatically generate task IDs from task names',
      triggers: ['name'],
      condition: (context) => context.elementType === BpmnElementType.USER_TASK,
      execute: this.generateTaskId.bind(this)
    });

    // Set default priority based on assignee
    this.customPropertiesService.registerBusinessRule({
      id: 'assignee-priority',
      name: 'Priority Based on Assignee',
      description: 'Set task priority based on assignee role',
      triggers: ['assignee'],
      condition: (context) => context.elementType === BpmnElementType.USER_TASK,
      execute: this.setPriorityByAssignee.bind(this)
    });

    // Auto-set candidate groups for approval tasks
    this.customPropertiesService.registerBusinessRule({
      id: 'approval-candidate-groups',
      name: 'Auto Set Approval Groups',
      description: 'Automatically set candidate groups for approval tasks',
      triggers: ['name'],
      condition: (context) => this.isApprovalTask(context),
      execute: this.setApprovalGroups.bind(this)
    });
  }

  private generateTaskId(context: ValidationContext): any {
    const name = context.properties['name'];
    if (!name || context.properties['taskId']) {
      return {};
    }

    const taskId = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    return { taskId };
  }

  private setPriorityByAssignee(context: ValidationContext): any {
    const assignee = context.properties['assignee'];
    if (!assignee) return {};

    // Manager emails get high priority
    if (assignee.includes('manager@') || assignee.includes('director@')) {
      return { priority: 'high' };
    }

    // External consultants get normal priority
    if (assignee.includes('consultant@') || assignee.includes('contractor@')) {
      return { priority: 'normal' };
    }

    return {};
  }

  private setApprovalGroups(context: ValidationContext): any {
    const name = context.properties['name']?.toLowerCase() || '';
    
    if (name.includes('budget') || name.includes('financial')) {
      return { candidateGroups: ['finance-managers', 'budget-approvers'] };
    }

    if (name.includes('hr') || name.includes('personnel')) {
      return { candidateGroups: ['hr-managers'] };
    }

    if (name.includes('technical') || name.includes('system')) {
      return { candidateGroups: ['tech-leads', 'architects'] };
    }

    return { candidateGroups: ['managers'] };
  }

  private isApprovalTask(context: ValidationContext): boolean {
    const name = context.properties['name']?.toLowerCase() || '';
    return name.includes('approval') || 
           name.includes('approve') || 
           name.includes('review');
  }
}
```

## 🌟 Real-World Use Cases

### 7. Document Approval Workflow

**Scenario**: Create a comprehensive document approval process with routing based on document type and value.

```typescript
// document-approval.schema.ts
export const DOCUMENT_APPROVAL_SCHEMA = {
  processProperties: {
    documentType: {
      id: 'documentType',
      name: 'Document Type',
      type: PropertyType.SELECT,
      options: [
        { value: 'contract', label: 'Contract' },
        { value: 'policy', label: 'Policy Document' },
        { value: 'procedure', label: 'Procedure' },
        { value: 'guideline', label: 'Guideline' }
      ],
      required: true
    },
    documentValue: {
      id: 'documentValue',
      name: 'Document Value',
      type: PropertyType.NUMBER,
      description: 'Financial value of the document (if applicable)'
    }
  },
  
  approvalTaskProperties: {
    approvalLevel: {
      id: 'approvalLevel',
      name: 'Approval Level',
      type: PropertyType.SELECT,
      options: [
        { value: '1', label: 'Level 1 - Supervisor' },
        { value: '2', label: 'Level 2 - Manager' },
        { value: '3', label: 'Level 3 - Director' },
        { value: '4', label: 'Level 4 - Executive' }
      ]
    },
    requiredSignatures: {
      id: 'requiredSignatures',
      name: 'Required Signatures',
      type: PropertyType.NUMBER,
      defaultValue: 1,
      description: 'Number of signatures required at this level'
    }
  }
};

// document-approval.component.ts
@Component({
  selector: 'app-document-approval-designer',
  template: `
    <div class="approval-designer">
      <div class="process-config">
        <h3>Document Approval Process Designer</h3>
        
        <div class="form-group">
          <label>Process Template:</label>
          <select [(ngModel)]="selectedTemplate" (change)="loadTemplate()" class="form-control">
            <option value="">Select a template...</option>
            <option value="simple-approval">Simple Approval</option>
            <option value="multi-level-approval">Multi-Level Approval</option>
            <option value="financial-approval">Financial Approval</option>
          </select>
        </div>
      </div>
      
      <app-diagram-editor 
        [initialXml]="processXml"
        (elementSelected)="onElementSelected($event)"
        (diagramChanged)="onDiagramChanged()">
      </app-diagram-editor>
    </div>
  `
})
export class DocumentApprovalDesignerComponent {
  selectedTemplate = '';
  processXml = '';
  
  constructor(
    private bpmnService: BpmnService,
    private templateService: ApprovalTemplateService
  ) {}

  loadTemplate(): void {
    if (this.selectedTemplate) {
      this.processXml = this.templateService.getTemplate(this.selectedTemplate);
    }
  }

  onElementSelected(element: any): void {
    if (element?.businessObject?.$type === 'bpmn:UserTask') {
      this.configureApprovalTask(element);
    }
  }

  private configureApprovalTask(element: any): void {
    // Auto-configure approval task based on position in process
    const taskName = element.businessObject.name || '';
    
    if (taskName.includes('Level 1') || taskName.includes('Supervisor')) {
      this.setApprovalProperties(element.id, {
        approvalLevel: '1',
        candidateGroups: ['supervisors'],
        requiredSignatures: 1
      });
    } else if (taskName.includes('Level 2') || taskName.includes('Manager')) {
      this.setApprovalProperties(element.id, {
        approvalLevel: '2',
        candidateGroups: ['managers'],
        requiredSignatures: 1
      });
    }
    // ... additional levels
  }

  private setApprovalProperties(elementId: string, properties: any): void {
    Object.keys(properties).forEach(key => {
      this.customPropertiesService.setProperty(elementId, key, properties[key]);
    });
  }
}

// approval-template.service.ts
@Injectable({
  providedIn: 'root'
})
export class ApprovalTemplateService {
  getTemplate(templateName: string): string {
    const templates = {
      'simple-approval': this.getSimpleApprovalTemplate(),
      'multi-level-approval': this.getMultiLevelApprovalTemplate(),
      'financial-approval': this.getFinancialApprovalTemplate()
    };
    
    return templates[templateName] || this.getSimpleApprovalTemplate();
  }

  private getSimpleApprovalTemplate(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                   id="simple-approval-process">
  <bpmn2:process id="SimpleApproval" isExecutable="true">
    <bpmn2:startEvent id="StartEvent_1" name="Document Submitted"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ReviewDocument"/>
    <bpmn2:userTask id="ReviewDocument" name="Review Document">
      <bpmn2:documentation>Review the submitted document for approval</bpmn2:documentation>
    </bpmn2:userTask>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="ReviewDocument" targetRef="ApprovalDecision"/>
    <bpmn2:exclusiveGateway id="ApprovalDecision" name="Approved?"/>
    <bpmn2:sequenceFlow id="Flow_Approved" sourceRef="ApprovalDecision" 
                       targetRef="DocumentApproved" name="Yes"/>
    <bpmn2:sequenceFlow id="Flow_Rejected" sourceRef="ApprovalDecision" 
                       targetRef="DocumentRejected" name="No"/>
    <bpmn2:endEvent id="DocumentApproved" name="Document Approved"/>
    <bpmn2:endEvent id="DocumentRejected" name="Document Rejected"/>
  </bpmn2:process>
</bpmn2:definitions>`;
  }

  private getMultiLevelApprovalTemplate(): string {
    // More complex template with multiple approval levels
    return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="MultiLevelApproval" isExecutable="true">
    <bpmn2:startEvent id="StartEvent_1" name="Document Submitted"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Level1Approval"/>
    <bpmn2:userTask id="Level1Approval" name="Level 1 Approval - Supervisor"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Level1Approval" targetRef="Level1Decision"/>
    <bpmn2:exclusiveGateway id="Level1Decision" name="Level 1 Approved?"/>
    <bpmn2:sequenceFlow id="Flow_3" sourceRef="Level1Decision" targetRef="Level2Approval" name="Yes"/>
    <bpmn2:userTask id="Level2Approval" name="Level 2 Approval - Manager"/>
    <bpmn2:sequenceFlow id="Flow_4" sourceRef="Level2Approval" targetRef="FinalDecision"/>
    <bpmn2:exclusiveGateway id="FinalDecision" name="Final Approved?"/>
    <bpmn2:sequenceFlow id="Flow_Approved" sourceRef="FinalDecision" 
                       targetRef="DocumentApproved" name="Yes"/>
    <bpmn2:sequenceFlow id="Flow_Rejected_L1" sourceRef="Level1Decision" 
                       targetRef="DocumentRejected" name="No"/>
    <bpmn2:sequenceFlow id="Flow_Rejected_L2" sourceRef="FinalDecision" 
                       targetRef="DocumentRejected" name="No"/>
    <bpmn2:endEvent id="DocumentApproved" name="Document Approved"/>
    <bpmn2:endEvent id="DocumentRejected" name="Document Rejected"/>
  </bpmn2:process>
</bpmn2:definitions>`;
  }

  private getFinancialApprovalTemplate(): string {
    // Template with value-based routing
    return `<!-- Financial approval template with value-based gateways -->`;
  }
}
```

### 8. Integration with External Systems

**Scenario**: Connect BPMN processes with external APIs and databases.

```typescript
// integration.service.ts
@Injectable({
  providedIn: 'root'
})
export class ProcessIntegrationService {
  constructor(private http: HttpClient) {}

  // Validate assignee against HR system
  async validateAssignee(email: string): Promise<boolean> {
    try {
      const response = await this.http.get(`/api/hr/employees/${email}`).toPromise();
      return !!response;
    } catch {
      return false;
    }
  }

  // Get approval hierarchy from org chart
  async getApprovalHierarchy(employeeId: string): Promise<string[]> {
    const response = await this.http
      .get<any>(`/api/hr/hierarchy/${employeeId}`)
      .toPromise();
    
    return response.managers.map(m => m.email);
  }

  // Submit process for execution
  async deployProcess(processXml: string, processId: string): Promise<void> {
    await this.http.post('/api/bpm/deploy', {
      processId,
      processDefinition: processXml
    }).toPromise();
  }

  // Start process instance
  async startProcessInstance(processId: string, variables: any): Promise<string> {
    const response = await this.http.post<any>('/api/bpm/start', {
      processId,
      variables
    }).toPromise();
    
    return response.instanceId;
  }
}

// integration-validator.service.ts
@Injectable({
  providedIn: 'root'
})
export class IntegrationValidatorService {
  constructor(
    private integrationService: ProcessIntegrationService,
    private validationService: ValidationService
  ) {
    this.registerIntegrationValidationRules();
  }

  private registerIntegrationValidationRules(): void {
    this.validationService.registerRule({
      id: 'validate-assignee-exists',
      name: 'Validate Assignee Exists',
      description: 'Check if assignee exists in HR system',
      elementTypes: [BpmnElementType.USER_TASK],
      severity: 'warning',
      validate: this.validateAssigneeExists.bind(this)
    });
  }

  private async validateAssigneeExists(context: ValidationContext): Promise<ValidationResult> {
    const assignee = context.properties['assignee'];
    
    if (!assignee) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        elementId: context.elementId,
        timestamp: new Date()
      };
    }

    try {
      const exists = await this.integrationService.validateAssignee(assignee);
      
      return {
        isValid: true, // This is a warning, not an error
        errors: [],
        warnings: exists ? [] : [`Assignee ${assignee} not found in HR system`],
        elementId: context.elementId,
        timestamp: new Date()
      };
    } catch {
      return {
        isValid: true,
        errors: [],
        warnings: ['Could not validate assignee against HR system'],
        elementId: context.elementId,
        timestamp: new Date()
      };
    }
  }
}
```

## 📊 Performance and Testing Examples

### 9. Performance Monitoring

**Scenario**: Monitor diagram performance and provide optimization suggestions.

```typescript
// performance-monitor.service.ts
@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private performanceMetrics = new BehaviorSubject<PerformanceMetrics>({
    elementCount: 0,
    renderTime: 0,
    memoryUsage: 0,
    recommendations: []
  });

  constructor(private bpmnService: BpmnService) {
    this.setupPerformanceMonitoring();
  }

  getMetrics(): Observable<PerformanceMetrics> {
    return this.performanceMetrics.asObservable();
  }

  private setupPerformanceMonitoring(): void {
    // Monitor element count changes
    this.bpmnService.diagramModified.subscribe(() => {
      this.updateMetrics();
    });

    // Monitor render performance
    this.monitorRenderPerformance();
  }

  private updateMetrics(): void {
    const elements = this.bpmnService.getAllElements();
    const elementCount = elements.length;
    
    const recommendations = this.generateRecommendations(elementCount, elements);
    
    this.performanceMetrics.next({
      elementCount,
      renderTime: this.measureRenderTime(),
      memoryUsage: this.estimateMemoryUsage(elements),
      recommendations
    });
  }

  private generateRecommendations(count: number, elements: any[]): string[] {
    const recommendations: string[] = [];

    if (count > 50) {
      recommendations.push('Consider breaking large diagrams into smaller sub-processes');
    }

    if (count > 100) {
      recommendations.push('Large diagram detected - performance may be impacted');
    }

    const complexGateways = elements.filter(el => 
      el.businessObject.$type.includes('Gateway') && 
      (el.incoming?.length > 3 || el.outgoing?.length > 3)
    );

    if (complexGateways.length > 5) {
      recommendations.push('Multiple complex gateways detected - simplify decision logic');
    }

    return recommendations;
  }

  private measureRenderTime(): number {
    // Measure actual render time
    const start = performance.now();
    // Trigger a re-render
    return performance.now() - start;
  }

  private estimateMemoryUsage(elements: any[]): number {
    // Rough estimation of memory usage
    return elements.length * 1024; // 1KB per element estimate
  }
}

interface PerformanceMetrics {
  elementCount: number;
  renderTime: number;
  memoryUsage: number;
  recommendations: string[];
}
```

### 10. Automated Testing

**Scenario**: Implement comprehensive testing for BPMN processes.

```typescript
// bpmn-process.test-helper.ts
export class BpmnProcessTestHelper {
  constructor(private bpmnService: BpmnService) {}

  async loadTestProcess(processXml: string): Promise<void> {
    await this.bpmnService.importXML(processXml);
  }

  validateProcessStructure(): ValidationResult[] {
    const elements = this.bpmnService.getAllElements();
    const results: ValidationResult[] = [];

    // Check for start event
    const startEvents = elements.filter(el => 
      el.businessObject.$type === 'bpmn:StartEvent'
    );
    
    if (startEvents.length === 0) {
      results.push({
        isValid: false,
        errors: ['Process must have at least one start event'],
        warnings: [],
        elementId: 'process',
        timestamp: new Date()
      });
    }

    // Check for end events
    const endEvents = elements.filter(el => 
      el.businessObject.$type === 'bpmn:EndEvent'
    );
    
    if (endEvents.length === 0) {
      results.push({
        isValid: false,
        errors: ['Process must have at least one end event'],
        warnings: [],
        elementId: 'process',
        timestamp: new Date()
      });
    }

    return results;
  }

  simulateProcessExecution(): ExecutionResult {
    const elements = this.bpmnService.getAllElements();
    const startEvent = elements.find(el => 
      el.businessObject.$type === 'bpmn:StartEvent'
    );

    if (!startEvent) {
      return { success: false, error: 'No start event found' };
    }

    return this.traceExecutionPath(startEvent);
  }

  private traceExecutionPath(startElement: any): ExecutionResult {
    const visited = new Set<string>();
    const path: string[] = [];
    
    const trace = (element: any): boolean => {
      if (visited.has(element.id)) {
        return false; // Cycle detected
      }
      
      visited.add(element.id);
      path.push(element.id);
      
      if (element.businessObject.$type === 'bpmn:EndEvent') {
        return true; // Reached end
      }
      
      const outgoing = element.outgoing || [];
      for (const flow of outgoing) {
        const target = flow.target;
        if (trace(target)) {
          return true;
        }
      }
      
      return false;
    };

    const success = trace(startElement);
    
    return {
      success,
      executionPath: path,
      error: success ? undefined : 'No path to end event found'
    };
  }
}

interface ExecutionResult {
  success: boolean;
  executionPath?: string[];
  error?: string;
}

// bpmn-integration.spec.ts
describe('BPMN Integration Tests', () => {
  let bpmnService: BpmnService;
  let testHelper: BpmnProcessTestHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BpmnService]
    });
    
    bpmnService = TestBed.inject(BpmnService);
    testHelper = new BpmnProcessTestHelper(bpmnService);
  });

  it('should load and validate a simple process', async () => {
    const simpleProcess = `
      <?xml version="1.0" encoding="UTF-8"?>
      <bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn2:process id="TestProcess">
          <bpmn2:startEvent id="start"/>
          <bpmn2:sequenceFlow id="flow1" sourceRef="start" targetRef="task"/>
          <bpmn2:userTask id="task" name="Test Task"/>
          <bpmn2:sequenceFlow id="flow2" sourceRef="task" targetRef="end"/>
          <bpmn2:endEvent id="end"/>
        </bpmn2:process>
      </bpmn2:definitions>
    `;

    await testHelper.loadTestProcess(simpleProcess);
    const validationResults = testHelper.validateProcessStructure();
    
    expect(validationResults.every(r => r.isValid)).toBe(true);
  });

  it('should simulate process execution', async () => {
    // Load test process
    await testHelper.loadTestProcess(getTestProcessXml());
    
    // Simulate execution
    const result = testHelper.simulateProcessExecution();
    
    expect(result.success).toBe(true);
    expect(result.executionPath).toContain('start');
    expect(result.executionPath).toContain('end');
  });
});
```

---

These examples demonstrate the flexibility and power of the BPMN Angular Integration project. They show how to extend the basic functionality to meet specific business requirements, integrate with external systems, and maintain high quality through comprehensive testing.

For more detailed information about the APIs used in these examples, refer to the [API Reference](api-reference.md) and [Developer Guide](developer-guide.md).
