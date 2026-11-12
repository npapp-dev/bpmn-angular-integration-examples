# Developer Guide

## 🛠️ Development Setup

### Prerequisites

Before you begin developing with this BPMN Angular integration, ensure you have:

- **Node.js** 20.19+ or 22.12+ installed (Angular 21 requirement)
- **npm** or **yarn** package manager
- **Angular CLI** 21+ (or use `npx ng` / `./node_modules/.bin/ng`)
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
├── app.module.ts            # NgModule: declares all components
├── diagram/                 # DiagramComponent (orchestrator)
├── components/              # UI Components
│   ├── diagram-editor/      # Canvas host
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
│   └── element-schemas.ts      # Property schemas (ElementSchemas)
├── custom-properties-provider/ # BPMN.js Extensions
│   ├── custom-property-provider.ts   # StartEvent "Custom properties" group
│   └── properties/
│       └── custom-properties.ts
└── utils/                  # Utilities
    └── descriptors/
        └── custom.json     # BPMN extension definitions
```

## 🔧 Extending the BPMN Editor

### Adding Custom Properties

#### 1. Define Property Schema

Schemas are a static array, `ElementSchemas`, in `models/element-schemas.ts`. Each entry is an `ElementPropertySchema` with a flat `properties` list; the `group` key of each property refers to `PropertyGroups` (`general`, `execution`, `classification`, `status`, `technical`, `business`, `integration`, `advanced`):

```typescript
{
  elementType: BpmnElementType.USER_TASK,
  displayName: 'User Task',
  icon: '👤',
  description: 'A task performed by a human',
  properties: [
    CommonProperties['id'],
    CommonProperties['name'],
    {
      id: 'assignee',
      name: 'assignee',
      type: PropertyType.TEXT,
      label: 'Assignee',
      description: 'Person responsible for this task',
      group: 'execution',
      validation: [
        { type: 'required', message: 'Assignee is required' },
        { type: 'email', message: 'Must be a valid email address' }
      ]
    },
    {
      id: 'candidateGroups',
      name: 'candidateGroups',
      type: PropertyType.MULTI_SELECT,
      label: 'Candidate Groups',
      group: 'execution',
      options: [
        { value: 'managers', label: 'Managers' },
        { value: 'developers', label: 'Developers' },
        { value: 'analysts', label: 'Business Analysts' }
      ]
    }
  ],
  businessRules: UserTaskBusinessRules
}
```

#### 2. Registration

There is no registration step: `CustomPropertiesService` reads `ElementSchemas` through `getElementSchema(elementType)`, so adding or editing an entry in the array is enough. Element types without an entry log `No schema found` and show the empty state in the panel.

#### 3. Custom Input Types

Inputs are rendered by the single `PropertyInputComponent` (`components/property-inputs/`), which has one template branch per `PropertyType`. To support a new kind of input, add a value to the `PropertyType` enum and a matching branch in `property-input.component.html` (plus default/validation handling in the `.ts` file). Use `@if` / `@for` control flow, as the rest of the app does.

### Creating Custom Validation Rules

#### 1. Property Validation Rules

Declare rules on the property definition. Supported types: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `email`, `url`, `custom`:

```typescript
validation: [
  { type: 'required', message: 'Assignee is required' },
  { type: 'pattern', value: '^[a-zA-Z0-9._-]+$', message: 'Letters, digits, dots, dashes only' },
  { type: 'custom', message: 'No spaces', customValidator: (v) => !/\s/.test(v ?? '') }
]
```

#### 2. Cross-property Checks

Checks that need several properties live in `ValidationService.performCrossPropertyValidation` (currently a few user task and service task checks).

#### 3. Business Rules

Business rules are declared on the schema's `businessRules` array. `condition` is a JavaScript-style expression over the element's property values. A rule **passes when the condition is false**, so write the condition as the violation:

```typescript
export const UserTaskBusinessRules: BusinessRule[] = [
  {
    id: 'assigneeRequired',
    name: 'Assignee Required',
    description: 'User tasks must have an assignee or candidates',
    condition: '!assignee && !candidateUsers && !candidateGroups',
    action: 'validate',
    message: 'User task must have an assignee, candidate users, or candidate groups defined'
  }
];
```

Note: a condition that throws is caught and reported as passed. `applyBusinessRules` acts on `default` (sets `target` to `value`, whether or not the condition held); `hide` only logs. Conditions are evaluated with `new Function`, so define them in code and never from user input.

### Extending BPMN.js Integration

#### 1. Custom Properties Provider

The native bpmn-js properties panel is extended in `custom-properties-provider/custom-property-provider.ts`, which currently adds a "Custom properties" group to `bpmn:StartEvent`:

```typescript
import { is } from 'bpmn-js/lib/util/ModelUtil';

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

To cover another type add the `is()` check here **and** a matching `extends` type in `custom.json` (next section).

#### 2. Custom Moddle Extensions

The BPMN extension descriptor is `utils/descriptors/custom.json`. It uses the `custom` prefix (`http://custom`) and defines `CustomStartEvent` (adds a `custom` attribute to `bpmn:StartEvent`) plus `custom:Properties` / `custom:Property` used for extension elements. To add an attribute to another element type:

```json
{
  "name": "CustomUserTask",
  "extends": ["bpmn:UserTask"],
  "properties": [
    { "name": "reviewer", "isAttr": true, "type": "String" }
  ]
}
```

The enhanced panel writes `id`, `name` and `documentation` straight to the business object; every other schema property is stored as a `custom:Properties` extension element (`name`/`value`/`type` entries, values stringified), so schema properties need no descriptor change to be saved in the XML.

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
          @for (rec of recommendations; track rec) {
            <li>{{ rec }}</li>
          }
        </ul>
      </div>
    </div>
  `,
  styleUrls: ['./process-analyzer.component.css'],
  standalone: false
})
export class ProcessAnalyzerComponent implements OnInit {
  metrics: ProcessMetrics = { totalElements: 0, complexityScore: 0 };
  recommendations: string[] = [];
  
  constructor(
    private bpmnService: BpmnService,
    private diagramStateService: DiagramStateService
  ) {}
  
  ngOnInit(): void {
    this.diagramStateService.state$.subscribe(state => {
      this.analyzeProcess();
    });
  }
  
  private analyzeProcess(): void {
    const modeler: any = this.bpmnService.getModeler();
    const elements = modeler?.get('elementRegistry').getAll() ?? [];
    this.metrics = this.calculateMetrics(elements);
    this.recommendations = this.generateRecommendations(elements);
  }
}
```

#### 2. Register Component

Add to `declarations` in `app.module.ts` (the component is declared there, not imported standalone):

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

Tests use **Vitest** with Angular TestBed under jsdom (`npx vitest run`, or `npm test`). Specs sit next to the code as `*.spec.ts`; use `vi.fn()` / `vi.spyOn`, not Jasmine.

```bash
npx vitest run                                              # all specs (~2 s)
npx vitest run src/app/services/validation.service.spec.ts  # one file
npm run test:coverage                                       # coverage/
```

#### 1. Unit Testing Services

```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

describe('CustomPropertiesService', () => {
  let service: CustomPropertiesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomPropertiesService);
  });

  it('should set property value', () => {
    // Initialise the element first: setProperty warns and returns if it is unknown
    service.initializeElementProperties('task1', {
      type: 'bpmn:UserTask',
      businessObject: { id: 'task1' }
    });

    service.setProperty('task1', 'assignee', 'john.doe@company.com');

    expect(service.getElementProperties('task1')?.properties['assignee'])
      .toBe('john.doe@company.com');
  });
});
```

#### 2. Component Testing

Components are `standalone: false`, so declare them in the testing module. Specs that touch bpmn-js or the properties-panel packages should mock them.

```typescript
describe('PropertiesPanelComponent', () => {
  let fixture: ComponentFixture<PropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PropertiesPanelComponent, PropertyInputComponent],
      imports: [FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesPanelComponent);
  });

  it('creates the panel', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

#### 3. Persistence (XML round-trip) Testing

Persistence changes should be covered by a round-trip test: write a property, export the XML, re-import it, and check the value comes back. Custom schema properties are stored as `custom:Properties` extension elements, not attributes.

## 🚀 Performance Optimization

### Change Detection

The app uses the default change detection strategy; `OnPush` is not used. If you adopt it for a component, remember that the services mutate their stored objects in place (for example `CustomPropertiesService`), so call `ChangeDetectorRef.markForCheck()` when you receive updates.

### Memory Management

Proper cleanup to prevent memory leaks:

```typescript
export class DiagramComponent implements OnDestroy {
  private subscriptions: Subscription[] = [];
  
  ngOnInit(): void {
    this.subscriptions.push(
      this.diagramStateService.state$.subscribe(/* ... */)
    );
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.bpmnService.destroy();
  }
}
```

`DiagramStateService.select()` subscribes to `state$` without teardown, so prefer `state$` with `map` / `distinctUntilChanged` plus `takeUntil`.

## 🔧 Build and Deployment

### Development Build

```bash
# Development with hot reload
npm start

# Development with specific port
npx ng serve --port 4300

# Development with HTTPS
npx ng serve --ssl
```

### Production Build

```bash
# Production build
npm run build

# Output: dist/bpmn-angular-integration-examples
# Budgets (angular.json): 12 kB warning / 16 kB error per component stylesheet
```

### Environment Configuration

Environment files live in `src/environments/` (`environment.ts` and `environment.prod.ts`). The `production` build configuration in `angular.json` swaps `environment.ts` for `environment.prod.ts` via `fileReplacements`. See the files for the exact fields.

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/bpmn-angular-integration-examples /usr/share/nginx/html
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
3. **Dependency Injection** - Inspect the root-provided services

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
   - Check the element type has an entry in `ElementSchemas` (otherwise `No schema found`)
   - Verify the property `name` matches the schema and the type parses (`number`, `boolean`, `multiSelect`, `json`)
   - Export and inspect the XML for `custom:Properties`

2. **Validation Not Working**
   - Check the rule is in the property's `validation` array or the schema's `businessRules`
   - Remember business-rule conditions must describe the violation, and a throwing condition counts as passed

3. **Performance Issues**
   - Profile change detection
   - Check for memory leaks
   - Optimize event handling

## 📦 Creating Extensions

### Extension Points

The project has no plugin system. Extensions are made by editing the code in place:

- new schema properties or element types: `models/element-schemas.ts`
- new input kinds: `PropertyType` enum + `PropertyInputComponent`
- native panel groups: `custom-properties-provider/` + `utils/descriptors/custom.json`
- toolbar actions: the `customActions` input of `DiagramToolbarComponent`

If you want to package this as a library, publish the Angular pieces as an npm module and declare compatible peer dependencies (for example `@angular/core` `^21.0.0` and `bpmn-js` `^18.0.0`).

---

This developer guide provides the foundation for extending and customizing the BPMN Angular integration. For specific API details, refer to the [API Reference](api-reference.md).
