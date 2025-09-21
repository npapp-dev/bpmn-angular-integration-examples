/**
 * Element-specific property schemas for different BPMN elements
 */

import { 
  BpmnElementType, 
  PropertyType, 
  ElementPropertySchema, 
  CommonProperties,
  PropertyDefinition,
  BusinessRule
} from './bpmn-elements.model';

/**
 * User Task specific properties
 */
const UserTaskProperties: PropertyDefinition[] = [
  CommonProperties['id'],
  CommonProperties['name'],
  CommonProperties['documentation'],
  CommonProperties['assignee'],
  CommonProperties['dueDate'],
  CommonProperties['priority'],
  {
    id: 'formKey',
    name: 'formKey',
    type: PropertyType.TEXT,
    label: 'Form Key',
    description: 'Reference to the form to be displayed',
    placeholder: 'Enter form key',
    group: 'technical',
    order: 40
  },
  {
    id: 'candidateUsers',
    name: 'candidateUsers',
    type: PropertyType.TEXT,
    label: 'Candidate Users',
    description: 'Comma-separated list of candidate users',
    placeholder: 'user1, user2, user3',
    group: 'execution',
    order: 13
  },
  {
    id: 'candidateGroups',
    name: 'candidateGroups',
    type: PropertyType.TEXT,
    label: 'Candidate Groups',
    description: 'Comma-separated list of candidate groups',
    placeholder: 'group1, group2, group3',
    group: 'execution',
    order: 14
  },
  {
    id: 'skipExpression',
    name: 'skipExpression',
    type: PropertyType.TEXT,
    label: 'Skip Expression',
    description: 'Expression to determine if task should be skipped',
    placeholder: '${skipCondition}',
    group: 'advanced',
    order: 50
  },
  CommonProperties['category'],
  CommonProperties['tags'],
  CommonProperties['isActive']
];

/**
 * Service Task specific properties
 */
const ServiceTaskProperties: PropertyDefinition[] = [
  CommonProperties['id'],
  CommonProperties['name'],
  CommonProperties['documentation'],
  {
    id: 'implementation',
    name: 'implementation',
    type: PropertyType.SELECT,
    label: 'Implementation Type',
    description: 'How this service task is implemented',
    defaultValue: 'java',
    options: [
      { value: 'java', label: 'Java Class' },
      { value: 'expression', label: 'Expression' },
      { value: 'delegateExpression', label: 'Delegate Expression' },
      { value: 'external', label: 'External Task' },
      { value: 'webService', label: 'Web Service' },
      { value: 'restApi', label: 'REST API' }
    ],
    group: 'technical',
    order: 40
  },
  {
    id: 'javaClass',
    name: 'javaClass',
    type: PropertyType.TEXT,
    label: 'Java Class',
    description: 'Fully qualified Java class name',
    placeholder: 'com.example.MyServiceTask',
    group: 'technical',
    order: 41,
    conditional: {
      dependsOn: 'implementation',
      values: ['java']
    }
  },
  {
    id: 'expression',
    name: 'expression',
    type: PropertyType.TEXT,
    label: 'Expression',
    description: 'Expression to execute',
    placeholder: '${myBean.doSomething()}',
    group: 'technical',
    order: 42,
    conditional: {
      dependsOn: 'implementation',
      values: ['expression', 'delegateExpression']
    }
  },
  {
    id: 'topic',
    name: 'topic',
    type: PropertyType.TEXT,
    label: 'External Task Topic',
    description: 'Topic name for external task workers',
    placeholder: 'processPayment',
    group: 'technical',
    order: 43,
    conditional: {
      dependsOn: 'implementation',
      values: ['external']
    }
  },
  {
    id: 'retryTimeCycle',
    name: 'retryTimeCycle',
    type: PropertyType.TEXT,
    label: 'Retry Time Cycle',
    description: 'Retry configuration (ISO 8601 duration)',
    placeholder: 'R3/PT10M',
    group: 'advanced',
    order: 51
  },
  {
    id: 'timeout',
    name: 'timeout',
    type: PropertyType.NUMBER,
    label: 'Timeout (seconds)',
    description: 'Task timeout in seconds',
    defaultValue: 300,
    validation: [
      { type: 'min', value: 1, message: 'Timeout must be at least 1 second' }
    ],
    group: 'execution',
    order: 15
  },
  CommonProperties['priority'],
  CommonProperties['category'],
  CommonProperties['tags'],
  CommonProperties['isActive']
];

/**
 * Exclusive Gateway specific properties
 */
const ExclusiveGatewayProperties: PropertyDefinition[] = [
  CommonProperties['id'],
  CommonProperties['name'],
  CommonProperties['documentation'],
  {
    id: 'defaultFlow',
    name: 'defaultFlow',
    type: PropertyType.TEXT,
    label: 'Default Flow',
    description: 'ID of the default sequence flow',
    placeholder: 'flow_id',
    group: 'technical',
    order: 40
  },
  {
    id: 'decisionCriteria',
    name: 'decisionCriteria',
    type: PropertyType.TEXTAREA,
    label: 'Decision Criteria',
    description: 'Description of how the decision is made',
    placeholder: 'Describe the decision logic...',
    group: 'business',
    order: 60
  },
  CommonProperties['category'],
  CommonProperties['tags'],
  CommonProperties['isActive']
];

/**
 * Start Event specific properties
 */
const StartEventProperties: PropertyDefinition[] = [
  CommonProperties['id'],
  CommonProperties['name'],
  CommonProperties['documentation'],
  {
    id: 'eventType',
    name: 'eventType',
    type: PropertyType.SELECT,
    label: 'Event Type',
    description: 'Type of start event',
    defaultValue: 'none',
    options: [
      { value: 'none', label: 'None (Default)' },
      { value: 'timer', label: 'Timer' },
      { value: 'message', label: 'Message' },
      { value: 'signal', label: 'Signal' },
      { value: 'condition', label: 'Conditional' },
      { value: 'error', label: 'Error' }
    ],
    group: 'technical',
    order: 40
  },
  {
    id: 'timerDefinition',
    name: 'timerDefinition',
    type: PropertyType.TEXT,
    label: 'Timer Definition',
    description: 'Timer definition (ISO 8601 or cron)',
    placeholder: 'R/PT1H or 0 0 12 * * ?',
    group: 'technical',
    order: 41,
    conditional: {
      dependsOn: 'eventType',
      values: ['timer']
    }
  },
  {
    id: 'messageRef',
    name: 'messageRef',
    type: PropertyType.TEXT,
    label: 'Message Reference',
    description: 'Reference to message definition',
    placeholder: 'Message_1',
    group: 'technical',
    order: 42,
    conditional: {
      dependsOn: 'eventType',
      values: ['message']
    }
  },
  {
    id: 'initiator',
    name: 'initiator',
    type: PropertyType.TEXT,
    label: 'Initiator',
    description: 'Process initiator variable name',
    placeholder: 'starter',
    group: 'execution',
    order: 13
  },
  CommonProperties['category'],
  CommonProperties['tags'],
  CommonProperties['isActive']
];

/**
 * Business rules for validation and behavior
 */
const UserTaskBusinessRules: BusinessRule[] = [
  {
    id: 'assigneeRequired',
    name: 'Assignee Required',
    description: 'User tasks must have at least assignee, candidate users, or candidate groups',
    condition: '!assignee && !candidateUsers && !candidateGroups',
    action: 'validate',
    message: 'User task must have an assignee, candidate users, or candidate groups defined'
  },
  {
    id: 'formKeyFormat',
    name: 'Form Key Format',
    description: 'Form key should follow naming convention',
    condition: 'formKey && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(formKey)',
    action: 'validate',
    message: 'Form key should start with a letter and contain only letters, numbers, underscores, and hyphens'
  }
];

const ServiceTaskBusinessRules: BusinessRule[] = [
  {
    id: 'implementationRequired',
    name: 'Implementation Required',
    description: 'Service tasks must have implementation details',
    condition: 'implementation === "java" && !javaClass',
    action: 'validate',
    target: 'javaClass',
    message: 'Java class is required when implementation type is "Java Class"'
  },
  {
    id: 'expressionRequired',
    name: 'Expression Required',
    description: 'Expression is required for expression-based implementations',
    condition: '(implementation === "expression" || implementation === "delegateExpression") && !expression',
    action: 'validate',
    target: 'expression',
    message: 'Expression is required for this implementation type'
  },
  {
    id: 'topicRequired',
    name: 'Topic Required',
    description: 'Topic is required for external tasks',
    condition: 'implementation === "external" && !topic',
    action: 'validate',
    target: 'topic',
    message: 'Topic is required for external task implementation'
  }
];

/**
 * Complete element schemas mapping
 */
export const ElementSchemas: ElementPropertySchema[] = [
  {
    elementType: BpmnElementType.USER_TASK,
    displayName: 'User Task',
    icon: '👤',
    description: 'A task that requires human interaction',
    properties: UserTaskProperties,
    businessRules: UserTaskBusinessRules
  },
  {
    elementType: BpmnElementType.SERVICE_TASK,
    displayName: 'Service Task',
    icon: '⚙️',
    description: 'An automated task performed by a system',
    properties: ServiceTaskProperties,
    businessRules: ServiceTaskBusinessRules
  },
  {
    elementType: BpmnElementType.SCRIPT_TASK,
    displayName: 'Script Task',
    icon: '📝',
    description: 'A task that executes a script',
    properties: [
      CommonProperties['id'],
      CommonProperties['name'],
      CommonProperties['documentation'],
      {
        id: 'scriptFormat',
        name: 'scriptFormat',
        type: PropertyType.SELECT,
        label: 'Script Language',
        description: 'Programming language for the script',
        defaultValue: 'javascript',
        options: [
          { value: 'javascript', label: 'JavaScript' },
          { value: 'groovy', label: 'Groovy' },
          { value: 'python', label: 'Python' },
          { value: 'juel', label: 'JUEL' }
        ],
        group: 'technical',
        order: 40
      },
      {
        id: 'script',
        name: 'script',
        type: PropertyType.TEXTAREA,
        label: 'Script',
        description: 'The script to execute',
        placeholder: 'Enter your script here...',
        validation: [
          { type: 'required', message: 'Script is required' }
        ],
        group: 'technical',
        order: 41
      },
      CommonProperties['priority'],
      CommonProperties['category'],
      CommonProperties['tags'],
      CommonProperties['isActive']
    ]
  },
  {
    elementType: BpmnElementType.EXCLUSIVE_GATEWAY,
    displayName: 'Exclusive Gateway',
    icon: '◇',
    description: 'A gateway that creates alternative paths',
    properties: ExclusiveGatewayProperties
  },
  {
    elementType: BpmnElementType.PARALLEL_GATEWAY,
    displayName: 'Parallel Gateway',
    icon: '✕',
    description: 'A gateway that creates parallel paths',
    properties: [
      CommonProperties['id'],
      CommonProperties['name'],
      CommonProperties['documentation'],
      CommonProperties['category'],
      CommonProperties['tags'],
      CommonProperties['isActive']
    ]
  },
  {
    elementType: BpmnElementType.START_EVENT,
    displayName: 'Start Event',
    icon: '⭕',
    description: 'The beginning of a process',
    properties: StartEventProperties
  },
  {
    elementType: BpmnElementType.END_EVENT,
    displayName: 'End Event',
    icon: '⬜',
    description: 'The end of a process',
    properties: [
      CommonProperties['id'],
      CommonProperties['name'],
      CommonProperties['documentation'],
      {
        id: 'eventType',
        name: 'eventType',
        type: PropertyType.SELECT,
        label: 'Event Type',
        description: 'Type of end event',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'None (Default)' },
          { value: 'message', label: 'Message' },
          { value: 'signal', label: 'Signal' },
          { value: 'error', label: 'Error' },
          { value: 'escalation', label: 'Escalation' },
          { value: 'terminate', label: 'Terminate' }
        ],
        group: 'technical',
        order: 40
      },
      CommonProperties['category'],
      CommonProperties['tags'],
      CommonProperties['isActive']
    ]
  },
  {
    elementType: BpmnElementType.SEQUENCE_FLOW,
    displayName: 'Sequence Flow',
    icon: '→',
    description: 'Connection between BPMN elements',
    properties: [
      CommonProperties['id'],
      CommonProperties['name'],
      CommonProperties['documentation'],
      {
        id: 'conditionExpression',
        name: 'conditionExpression',
        type: PropertyType.TEXT,
        label: 'Condition Expression',
        description: 'Expression that must be true for flow to be taken',
        placeholder: '${amount > 1000}',
        group: 'technical',
        order: 40
      },
      {
        id: 'isDefault',
        name: 'isDefault',
        type: PropertyType.BOOLEAN,
        label: 'Default Flow',
        description: 'Whether this is the default outgoing flow',
        defaultValue: false,
        group: 'technical',
        order: 41
      },
      CommonProperties['priority'],
      CommonProperties['category'],
      CommonProperties['tags'],
      CommonProperties['isActive']
    ]
  }
];

/**
 * Helper function to get schema for a specific element type
 */
export function getElementSchema(elementType: BpmnElementType): ElementPropertySchema | undefined {
  return ElementSchemas.find(schema => schema.elementType === elementType);
}

/**
 * Helper function to get all supported element types
 */
export function getSupportedElementTypes(): BpmnElementType[] {
  return ElementSchemas.map(schema => schema.elementType);
}
