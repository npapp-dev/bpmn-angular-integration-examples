/**
 * Enhanced BPMN Element Types and Property Definitions
 * Supports comprehensive BPMN 2.0 element types with custom properties
 */

export enum BpmnElementType {
  // Events
  START_EVENT = 'bpmn:StartEvent',
  END_EVENT = 'bpmn:EndEvent',
  INTERMEDIATE_THROW_EVENT = 'bpmn:IntermediateThrowEvent',
  INTERMEDIATE_CATCH_EVENT = 'bpmn:IntermediateCatchEvent',
  BOUNDARY_EVENT = 'bpmn:BoundaryEvent',
  
  // Tasks
  TASK = 'bpmn:Task',
  USER_TASK = 'bpmn:UserTask',
  SERVICE_TASK = 'bpmn:ServiceTask',
  SCRIPT_TASK = 'bpmn:ScriptTask',
  BUSINESS_RULE_TASK = 'bpmn:BusinessRuleTask',
  MANUAL_TASK = 'bpmn:ManualTask',
  SEND_TASK = 'bpmn:SendTask',
  RECEIVE_TASK = 'bpmn:ReceiveTask',
  
  // Gateways
  EXCLUSIVE_GATEWAY = 'bpmn:ExclusiveGateway',
  PARALLEL_GATEWAY = 'bpmn:ParallelGateway',
  INCLUSIVE_GATEWAY = 'bpmn:InclusiveGateway',
  COMPLEX_GATEWAY = 'bpmn:ComplexGateway',
  EVENT_BASED_GATEWAY = 'bpmn:EventBasedGateway',
  
  // Flow Elements
  SEQUENCE_FLOW = 'bpmn:SequenceFlow',
  MESSAGE_FLOW = 'bpmn:MessageFlow',
  
  // Containers
  PROCESS = 'bpmn:Process',
  SUB_PROCESS = 'bpmn:SubProcess',
  CALL_ACTIVITY = 'bpmn:CallActivity',
  
  // Data
  DATA_OBJECT = 'bpmn:DataObject',
  DATA_STORE = 'bpmn:DataStore',
  
  // Swimlanes
  LANE = 'bpmn:Lane',
  PARTICIPANT = 'bpmn:Participant'
}

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

export interface PropertyOption {
  value: string | number | boolean;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: PropertyOption[];
  validation?: ValidationRule[];
  group?: string;
  order?: number;
  visible?: boolean;
  readonly?: boolean;
  conditional?: {
    dependsOn: string;
    values: any[];
  };
}

export interface ElementPropertySchema {
  elementType: BpmnElementType;
  displayName: string;
  icon: string;
  description: string;
  properties: PropertyDefinition[];
  businessRules?: BusinessRule[];
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string; // JavaScript expression
  action: 'validate' | 'transform' | 'default' | 'hide' | 'show' | 'enable' | 'disable';
  target?: string; // Property ID affected
  value?: any;
  message?: string;
}

export interface PropertyValidationResult {
  isValid: boolean;
  errors: PropertyValidationError[];
  warnings: PropertyValidationWarning[];
}

export interface PropertyValidationError {
  propertyId: string;
  message: string;
  rule: string;
}

export interface PropertyValidationWarning {
  propertyId: string;
  message: string;
  suggestion?: string;
}

/**
 * Common property definitions that can be reused across elements
 */
export const CommonProperties: { [key: string]: PropertyDefinition } = {
  id: {
    id: 'id',
    name: 'id',
    type: PropertyType.TEXT,
    label: 'Element ID',
    description: 'Unique identifier for this element',
    validation: [
      { type: 'required', message: 'Element ID is required' },
      { type: 'pattern', value: '^[a-zA-Z][a-zA-Z0-9_-]*$', message: 'ID must start with a letter and contain only letters, numbers, underscores, and hyphens' }
    ],
    group: 'general',
    order: 1
  },
  
  name: {
    id: 'name',
    name: 'name',
    type: PropertyType.TEXT,
    label: 'Name',
    description: 'Display name for this element',
    placeholder: 'Enter element name',
    group: 'general',
    order: 2
  },
  
  documentation: {
    id: 'documentation',
    name: 'documentation',
    type: PropertyType.TEXTAREA,
    label: 'Documentation',
    description: 'Additional documentation or notes',
    placeholder: 'Enter documentation...',
    group: 'general',
    order: 3
  },
  
  priority: {
    id: 'priority',
    name: 'priority',
    type: PropertyType.SELECT,
    label: 'Priority',
    description: 'Priority level for this element',
    defaultValue: 'medium',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
    ],
    group: 'execution',
    order: 10
  },
  
  assignee: {
    id: 'assignee',
    name: 'assignee',
    type: PropertyType.TEXT,
    label: 'Assignee',
    description: 'Person or role assigned to this task',
    placeholder: 'Enter assignee',
    group: 'execution',
    order: 11
  },
  
  dueDate: {
    id: 'dueDate',
    name: 'dueDate',
    type: PropertyType.DATETIME,
    label: 'Due Date',
    description: 'When this task should be completed',
    group: 'execution',
    order: 12
  },
  
  category: {
    id: 'category',
    name: 'category',
    type: PropertyType.SELECT,
    label: 'Category',
    description: 'Category or type of this element',
    options: [
      { value: 'business', label: 'Business Process' },
      { value: 'technical', label: 'Technical Process' },
      { value: 'integration', label: 'Integration' },
      { value: 'approval', label: 'Approval' },
      { value: 'notification', label: 'Notification' }
    ],
    group: 'classification',
    order: 20
  },
  
  tags: {
    id: 'tags',
    name: 'tags',
    type: PropertyType.MULTI_SELECT,
    label: 'Tags',
    description: 'Tags for categorization and filtering',
    options: [
      { value: 'automated', label: 'Automated' },
      { value: 'manual', label: 'Manual' },
      { value: 'approval', label: 'Requires Approval' },
      { value: 'integration', label: 'System Integration' },
      { value: 'notification', label: 'Sends Notification' },
      { value: 'critical', label: 'Critical Path' }
    ],
    group: 'classification',
    order: 21
  },
  
  isActive: {
    id: 'isActive',
    name: 'isActive',
    type: PropertyType.BOOLEAN,
    label: 'Active',
    description: 'Whether this element is currently active',
    defaultValue: true,
    group: 'status',
    order: 30
  }
};

/**
 * Property groups for better organization in the UI
 */
export const PropertyGroups = {
  general: { label: 'General', order: 1, icon: '📋' },
  execution: { label: 'Execution', order: 2, icon: '⚙️' },
  classification: { label: 'Classification', order: 3, icon: '🏷️' },
  status: { label: 'Status', order: 4, icon: '📊' },
  technical: { label: 'Technical', order: 5, icon: '🔧' },
  business: { label: 'Business', order: 6, icon: '💼' },
  integration: { label: 'Integration', order: 7, icon: '🔗' },
  advanced: { label: 'Advanced', order: 8, icon: '⚡' }
};
