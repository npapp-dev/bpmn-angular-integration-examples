# Developer Guide

## 🛠️ Development Setup

### Prerequisites

Before you begin developing with this BPMN Angular integration, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Angular CLI** 19+ globally installed
- **Git** for version control
- **Modern IDE** (VS Code recommended)

### Development Environment Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd bpmn-angular-integration-examples
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Open Development Tools**
   - Browser DevTools for debugging
   - Angular DevTools extension
   - VS Code with Angular extensions

### Project Structure Deep Dive

```
src/app/
├── components/              # UI Components
│   ├── diagram-editor/      # Main BPMN editor
│   ├── properties-panel/    # Property management
│   ├── diagram-toolbar/     # Toolbar actions
│   ├── diagram-status/      # Status display
│   └── property-inputs/     # Custom input components
├── services/               # Business Logic
│   ├── bpmn.service.ts         # BPMN.js integration
│   ├── custom-properties.service.ts # Property management
│   ├── validation.service.ts   # Validation engine
│   ├── diagram-state.service.ts # State management
│   └── file.service.ts         # File operations
├── models/                 # Type Definitions
│   ├── bpmn-elements.model.ts  # BPMN element types
│   ├── element-schemas.ts      # Property schemas
│   └── provider.elements.ts    # Provider definitions
├── custom-properties-provider/ # BPMN.js Extensions
│   ├── custom-property-provider.ts
│   └── properties/
│       └── custom-properties.ts
└── utils/                  # Utilities
    └── descriptors/
        └── custom.json     # BPMN extension definitions
```

## 🔧 Extending the BPMN Editor

### Adding Custom Properties

#### 1. Define Property Schema

Create or update property definitions in `models/element-schemas.ts`:

```typescript
export const USER_TASK_SCHEMA: ElementPropertySchema = {
  elementType: BpmnElementType.USER_TASK,
  groups: {
    [PropertyGroups.ASSIGNMENT]: {
      id: PropertyGroups.ASSIGNMENT,
      label: 'Assignment',
      properties: [
        {
          id: 'assignee',
          name: 'Assignee',
          type: PropertyType.TEXT,
          group: PropertyGroups.ASSIGNMENT,
          required: true,
          description: 'Person responsible for this task',
          validation: {
            pattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            message: 'Must be a valid email address'
          }
        },
        {
          id: 'candidateGroups',
          name: 'Candidate Groups',
          type: PropertyType.MULTI_SELECT,
          group: PropertyGroups.ASSIGNMENT,
          options: [
            { value: 'managers', label: 'Managers' },
            { value: 'developers', label: 'Developers' },
            { value: 'analysts', label: 'Business Analysts' }
          ]
        }
      ]
    }
  }
};
```

#### 2. Register Property Schema

In your service initialization:

```typescript
@Injectable()
export class CustomPropertiesService {
  constructor() {
    this.registerPropertySchema(USER_TASK_SCHEMA);
  }
  
  private registerPropertySchema(schema: ElementPropertySchema): void {
    ElementSchemas[schema.elementType] = schema;
  }
}
```

#### 3. Create Custom Input Component

For specialized property types, create custom input components:

```typescript
@Component({
  selector: 'app-assignee-selector',
  template: `
    <div class="assignee-selector">
      <label>{{ label }}</label>
      <input 
        type="email" 
        [(ngModel)]="value" 
        (ngModelChange)="onValueChange($event)"
        [placeholder]="placeholder"
        class="form-control">
      <div *ngIf="showUserSuggestions" class="user-suggestions">
        <div *ngFor="let user of userSuggestions" 
             (click)="selectUser(user)"
             class="suggestion-item">
          {{ user.name }} ({{ user.email }})
        </div>
      </div>
    </div>
  `
})
export class AssigneeSelectorComponent implements PropertyInputComponent {
  @Input() value: any;
  @Input() property: PropertyDefinition;
  @Output() valueChange = new EventEmitter<any>();
  
  userSuggestions: User[] = [];
  showUserSuggestions = false;
  
  onValueChange(value: string): void {
    this.valueChange.emit(value);
    this.loadUserSuggestions(value);
  }
  
  private loadUserSuggestions(query: string): void {
    // Implement user lookup logic
  }
}
```

### Creating Custom Validation Rules

#### 1. Define Validation Rule

```typescript
export const ASSIGNEE_VALIDATION_RULE: ValidationRule = {
  id: 'user-task-assignee-required',
  name: 'User Task Assignee Required',
  description: 'User tasks must have a valid assignee',
  elementTypes: [BpmnElementType.USER_TASK],
  severity: 'error',
  validate: (context: ValidationContext): ValidationResult => {
    const assignee = context.properties['assignee'];
    const isValid = !!assignee && isValidEmail(assignee);
    
    return {
      isValid,
      errors: isValid ? [] : ['User task must have a valid assignee email'],
      warnings: [],
      elementId: context.elementId,
      timestamp: new Date()
    };
  }
};
```

#### 2. Register Validation Rule

```typescript
@Injectable()
export class ValidationService {
  constructor() {
    this.registerRule(ASSIGNEE_VALIDATION_RULE);
  }
}
```

#### 3. Custom Business Rules

Implement automated property updates:

```typescript
export const AUTO_ID_BUSINESS_RULE: BusinessRule = {
  id: 'auto-generate-task-id',
  name: 'Auto Generate Task ID',
  description: 'Automatically generate task ID from name',
  triggers: ['name'],
  condition: (context) => {
    return context.elementType === BpmnElementType.USER_TASK;
  },
  execute: (context) => {
    const name = context.properties['name'];
    if (name && !context.properties['taskId']) {
      const taskId = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      return { taskId };
    }
    return {};
  }
};
```

### Extending BPMN.js Integration

#### 1. Custom Properties Provider

Extend the BPMN.js properties panel:

```typescript
import { is } from 'bpmn-js/lib/util/ModelUtil';

function EnhancedPropertiesProvider(propertiesPanel, translate) {
  this.getGroups = function(element) {
    return function(groups) {
      // Add custom groups for different element types
      if (is(element, 'bpmn:UserTask')) {
        groups.push(createAssignmentGroup(element, translate));
        groups.push(createFormGroup(element, translate));
      }
      
      if (is(element, 'bpmn:ServiceTask')) {
        groups.push(createImplementationGroup(element, translate));
      }
      
      return groups;
    };
  };
  
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

function createAssignmentGroup(element, translate) {
  return {
    id: 'assignment',
    label: translate('Assignment'),
    entries: [
      assigneeEntry(element),
      candidateGroupsEntry(element),
      dueDateEntry(element)
    ]
  };
}
```

#### 2. Custom Moddle Extensions

Define custom BPMN extensions in `utils/descriptors/custom.json`:

```json
{
  "name": "Enhanced",
  "prefix": "enhanced",
  "uri": "http://enhanced.bpmn.io",
  "xml": {
    "tagAlias": "lowerCase"
  },
  "types": [
    {
      "name": "EnhancedUserTask",
      "extends": ["bpmn:UserTask"],
      "properties": [
        {
          "name": "assignee",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "candidateGroups",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "dueDate",
          "isAttr": true,
          "type": "String"
        },
        {
          "name": "priority",
          "isAttr": true,
          "type": "Integer"
        }
      ]
    }
  ]
}
```

### Adding New Components

#### 1. Create Component

```typescript
@Component({
  selector: 'app-process-analyzer',
  template: `
    <div class="process-analyzer">
      <h3>Process Analysis</h3>
      
      <div class="metrics">
        <div class="metric">
          <label>Total Elements:</label>
          <span>{{ metrics.totalElements }}</span>
        </div>
        <div class="metric">
          <label>Complexity Score:</label>
          <span>{{ metrics.complexityScore }}</span>
        </div>
      </div>
      
      <div class="recommendations">
        <h4>Recommendations</h4>
        <ul>
          <li *ngFor="let rec of recommendations">{{ rec }}</li>
        </ul>
      </div>
    </div>
  `,
  styleUrls: ['./process-analyzer.component.css']
})
export class ProcessAnalyzerComponent implements OnInit {
  metrics: ProcessMetrics = { totalElements: 0, complexityScore: 0 };
  recommendations: string[] = [];
  
  constructor(
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService
  ) {}
  
  ngOnInit(): void {
    this.diagramStateService.getState().subscribe(state => {
      this.analyzeProcess();
    });
  }
  
  private analyzeProcess(): void {
    const elements = this.bpmnService.getAllElements();
    this.metrics = this.calculateMetrics(elements);
    this.recommendations = this.generateRecommendations(elements);
  }
}
```

#### 2. Register Component

Add to `app.module.ts`:

```typescript
@NgModule({
  declarations: [
    // ... existing components
    ProcessAnalyzerComponent
  ],
  // ... rest of module
})
export class AppModule { }
```

### Testing Strategy

#### 1. Unit Testing Services

```typescript
describe('CustomPropertiesService', () => {
  let service: CustomPropertiesService;
  let mockValidationService: jasmine.SpyObj<ValidationService>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('ValidationService', ['validateProperty']);
    
    TestBed.configureTestingModule({
      providers: [
        CustomPropertiesService,
        { provide: ValidationService, useValue: spy }
      ]
    });
    
    service = TestBed.inject(CustomPropertiesService);
    mockValidationService = TestBed.inject(ValidationService) as jasmine.SpyObj<ValidationService>;
  });
  
  it('should set property value', () => {
    // Arrange
    const elementId = 'task1';
    const propertyId = 'assignee';
    const value = 'john.doe@company.com';
    
    // Act
    service.setProperty(elementId, propertyId, value);
    
    // Assert
    const properties = service.getElementProperties(elementId);
    expect(properties?.properties[propertyId]).toBe(value);
  });
});
```

#### 2. Component Testing

```typescript
describe('PropertiesPanelComponent', () => {
  let component: PropertiesPanelComponent;
  let fixture: ComponentFixture<PropertiesPanelComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PropertiesPanelComponent],
      imports: [FormsModule],
      providers: [
        { provide: CustomPropertiesService, useValue: mockCustomPropertiesService },
        { provide: ValidationService, useValue: mockValidationService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(PropertiesPanelComponent);
    component = fixture.componentInstance;
  });
  
  it('should display properties for selected element', () => {
    // Arrange
    component.selectedElementId = 'task1';
    const mockProperties = createMockProperties();
    mockCustomPropertiesService.getElementProperties.and.returnValue(mockProperties);
    
    // Act
    fixture.detectChanges();
    
    // Assert
    expect(component.currentElement).toBe(mockProperties);
  });
});
```

#### 3. Integration Testing

```typescript
describe('BPMN Integration', () => {
  let bpmnService: BpmnService;
  let customPropertiesService: CustomPropertiesService;
  
  beforeEach(() => {
    // Setup test environment
  });
  
  it('should apply custom properties to BPMN elements', async () => {
    // Arrange
    const xml = getSampleBpmnXml();
    await bpmnService.importXML(xml);
    
    // Act
    customPropertiesService.setProperty('UserTask_1', 'assignee', 'test@company.com');
    const exportedXml = await bpmnService.exportXML();
    
    // Assert
    expect(exportedXml.xml).toContain('assignee="test@company.com"');
  });
});
```

## 🚀 Performance Optimization

### Change Detection Optimization

Use OnPush change detection for better performance:

```typescript
@Component({
  selector: 'app-properties-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class PropertiesPanelComponent {
  constructor(private cdr: ChangeDetectorRef) {}
  
  onPropertyChange(): void {
    // Manually trigger change detection when needed
    this.cdr.markForCheck();
  }
}
```

### Memory Management

Proper cleanup to prevent memory leaks:

```typescript
export class DiagramComponent implements OnDestroy {
  private subscriptions: Subscription[] = [];
  
  ngOnInit(): void {
    this.subscriptions.push(
      this.diagramStateService.getState().subscribe(/* ... */)
    );
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.bpmnService.destroyModeler();
  }
}
```

### Lazy Loading

Implement lazy loading for large components:

```typescript
const routes: Routes = [
  {
    path: 'advanced-editor',
    loadChildren: () => import('./advanced-editor/advanced-editor.module')
      .then(m => m.AdvancedEditorModule)
  }
];
```

## 🔧 Build and Deployment

### Development Build

```bash
# Development with hot reload
npm start

# Development with specific port
ng serve --port 4300

# Development with HTTPS
ng serve --ssl
```

### Production Build

```bash
# Production build
npm run build

# Production build with analysis
npm run build -- --analyze

# Build for specific environment
ng build --configuration=staging
```

### Environment Configuration

Configure different environments in `environments/`:

```typescript
// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.production.com',
  enableValidation: true,
  debugMode: false
};

// environment.development.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  enableValidation: true,
  debugMode: true
};
```

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/bpmn-angular-integration-examples /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🐛 Debugging Tips

### Browser DevTools

1. **Element Inspector** - Debug DOM structure
2. **Console** - Check for JavaScript errors
3. **Network Tab** - Monitor API calls
4. **Performance Tab** - Profile performance issues

### Angular DevTools

1. **Component Inspector** - Examine component state
2. **Profiler** - Analyze change detection cycles
3. **Router Tree** - Debug routing issues

### BPMN.js Debugging

```typescript
// Enable BPMN.js debugging
const modeler = new Modeler({
  container: '#canvas',
  // Enable debug mode
  additionalModules: [
    // Add debug modules
  ]
});

// Access internal APIs for debugging
const eventBus = modeler.get('eventBus');
eventBus.on('*', (event) => {
  console.log('BPMN Event:', event);
});
```

### Common Debug Scenarios

1. **Properties Not Saving**
   - Check property definitions
   - Verify event subscriptions
   - Validate property types

2. **Validation Not Working**
   - Ensure rules are registered
   - Check validation triggers
   - Verify error handling

3. **Performance Issues**
   - Profile change detection
   - Check for memory leaks
   - Optimize event handling

## 📦 Creating Extensions

### Plugin Architecture

Create reusable extensions:

```typescript
export interface BpmnPlugin {
  name: string;
  version: string;
  initialize(context: BpmnPluginContext): void;
  destroy(): void;
}

export class MyCustomPlugin implements BpmnPlugin {
  name = 'my-custom-plugin';
  version = '1.0.0';
  
  initialize(context: BpmnPluginContext): void {
    // Register custom properties
    context.propertiesService.registerPropertyDefinition(/* ... */);
    
    // Add custom validation rules
    context.validationService.registerRule(/* ... */);
    
    // Register custom components
    context.componentRegistry.register(/* ... */);
  }
  
  destroy(): void {
    // Cleanup resources
  }
}
```

### Distribution

Package extensions as npm modules:

```json
{
  "name": "@company/bpmn-custom-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@angular/core": "^19.0.0",
    "bpmn-js": "^18.0.0"
  }
}
```

---

This developer guide provides the foundation for extending and customizing the BPMN Angular integration. For specific API details, refer to the [API Reference](api-reference.md).
