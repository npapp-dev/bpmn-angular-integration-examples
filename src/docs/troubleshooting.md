# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Installation and Setup Issues

#### 1. Node.js Version Compatibility

**Problem**: Application fails to start or build with Node.js version errors.

**Solution**:
```bash
# Check current Node.js version
node --version

# Required: Node.js 18+ 
# Use nvm to switch versions
nvm install 18
nvm use 18

# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 2. Angular CLI Version Mismatch

**Problem**: CLI commands fail with version compatibility errors.

**Solution**:
```bash
# Update Angular CLI globally
npm install -g @angular/cli@19

# Update local Angular CLI
ng update @angular/cli @angular/core

# Verify version
ng version
```

#### 3. BPMN.js Dependencies Issues

**Problem**: BPMN.js modules fail to load or cause compilation errors.

**Solution**:
```bash
# Ensure all BPMN.js packages are compatible versions
npm install bpmn-js@18.3.0 bpmn-js-properties-panel@5.32.0 @bpmn-io/properties-panel@3.26.1

# Clear Angular build cache
ng build --delete-output-path
```

### Runtime Issues

#### 4. BPMN Modeler Not Initializing

**Problem**: Blank canvas or "Cannot read property" errors during modeler initialization.

**Symptoms**:
- Empty diagram container
- Console errors about undefined properties
- Properties panel not appearing

**Solution**:

```typescript
// Check ViewChild timing
@Component({
  template: `<div #diagramContainer class="diagram-container"></div>`
})
export class DiagramComponent implements AfterViewInit {
  @ViewChild('diagramContainer', { static: true }) 
  diagramContainer!: ElementRef;

  constructor(private bpmnService: BpmnService) {}

  // ✅ Use AfterViewInit, not OnInit
  ngAfterViewInit(): void {
    // ✅ Check element exists before initializing
    if (this.diagramContainer?.nativeElement) {
      this.bpmnService.createModeler({
        container: this.diagramContainer.nativeElement
      });
    }
  }
}
```

**Additional Checks**:
```typescript
// Verify modeler configuration
const config = {
  container: this.diagramContainer.nativeElement,
  // ✅ Ensure all required modules are included
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    customPropertiesProvider
  ],
  // ✅ Check moddle extensions are valid
  moddleExtensions: {
    custom: custom
  }
};
```

#### 5. Properties Panel Not Displaying

**Problem**: Properties panel container is empty or shows no properties.

**Debugging Steps**:

1. **Check Element Selection**:
```typescript
// Add debugging to element selection
ngOnInit(): void {
  this.diagramStateService.getSelectedElementId().subscribe(elementId => {
    console.log('Selected element:', elementId);
    if (elementId) {
      const element = this.bpmnService.getElement(elementId);
      console.log('Element details:', element);
    }
  });
}
```

2. **Verify Properties Panel Attachment**:
```typescript
ngAfterViewInit(): void {
  // ✅ Ensure properties panel is properly attached
  const modeler = this.bpmnService.getModeler();
  if (modeler && this.propertiesContainer?.nativeElement) {
    const propertiesPanel = modeler.get('propertiesPanel');
    propertiesPanel.attachTo(this.propertiesContainer.nativeElement);
  }
}
```

3. **Check Custom Properties Service**:
```typescript
// Verify property definitions are registered
constructor(private customPropertiesService: CustomPropertiesService) {
  // Debug: List all registered schemas
  console.log('Registered schemas:', this.customPropertiesService.getRegisteredSchemas());
}
```

#### 6. Import/Export Errors

**Problem**: BPMN XML files fail to import or export with validation errors.

**Common Error Messages**:
- "unparsable content detected"
- "unknown type"
- "missing namespace"

**Solutions**:

1. **Validate XML Structure**:
```typescript
async importDiagram(xml: string): Promise<void> {
  try {
    // ✅ Add validation before import
    if (!this.isValidBpmnXml(xml)) {
      throw new Error('Invalid BPMN XML structure');
    }
    
    const result = await this.bpmnService.importXML(xml);
    
    // ✅ Check for import warnings
    if (result.warnings.length > 0) {
      console.warn('Import warnings:', result.warnings);
    }
  } catch (error) {
    console.error('Import failed:', error);
    // ✅ Provide user-friendly error message
    this.showError('Failed to import diagram. Please check file format.');
  }
}

private isValidBpmnXml(xml: string): boolean {
  return xml.includes('bpmn') && 
         xml.includes('definitions') && 
         !xml.includes('<?xml-stylesheet');
}
```

2. **Handle Namespace Issues**:
```typescript
// ✅ Ensure proper namespace declarations
const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="definitions"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <!-- Process content -->
</bpmn2:definitions>`;
```

#### 7. Performance Issues

**Problem**: Slow rendering, high memory usage, or browser freezing with large diagrams.

**Symptoms**:
- Lag when moving elements
- Slow zoom/pan operations
- Browser tab becomes unresponsive
- High CPU usage

**Solutions**:

1. **Optimize Element Count**:
```typescript
// Monitor diagram complexity
@Injectable()
export class DiagramOptimizationService {
  checkPerformance(): PerformanceWarning[] {
    const elements = this.bpmnService.getAllElements();
    const warnings: PerformanceWarning[] = [];
    
    if (elements.length > 50) {
      warnings.push({
        level: 'warning',
        message: 'Large diagram detected. Consider splitting into sub-processes.'
      });
    }
    
    if (elements.length > 100) {
      warnings.push({
        level: 'error',
        message: 'Very large diagram. Performance will be impacted.'
      });
    }
    
    return warnings;
  }
}
```

2. **Implement Lazy Loading**:
```typescript
// Lazy load complex components
const routes: Routes = [
  {
    path: 'diagram',
    loadChildren: () => import('./diagram/diagram.module').then(m => m.DiagramModule)
  }
];
```

3. **Optimize Change Detection**:
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertiesPanelComponent {
  constructor(private cdr: ChangeDetectorRef) {}
  
  onPropertyChange(): void {
    // ✅ Manual change detection triggering
    this.cdr.markForCheck();
  }
}
```

### Browser Compatibility Issues

#### 8. Internet Explorer/Legacy Browser Support

**Problem**: Application doesn't work in older browsers.

**Solution**:
```typescript
// Add polyfills in polyfills.ts
import 'core-js/es/array';
import 'core-js/es/map';
import 'core-js/es/set';

// Check browser support
export function isBrowserSupported(): boolean {
  return !!(
    window.SVGElement &&
    window.Promise &&
    window.Map &&
    window.Set
  );
}
```

#### 9. Mobile Browser Issues

**Problem**: Touch interactions not working properly on mobile devices.

**Solution**:
```css
/* Add touch-action styles */
.diagram-container {
  touch-action: none; /* Prevent default touch behaviors */
}

.bjs-powered-by {
  display: none; /* Hide on mobile if needed */
}
```

```typescript
// Detect mobile and adjust configuration
@Component({})
export class DiagramComponent {
  ngAfterViewInit(): void {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const config = {
      container: this.diagramContainer.nativeElement,
      // ✅ Adjust for mobile
      additionalModules: isMobile ? this.getMobileModules() : this.getDesktopModules()
    };
    
    this.bpmnService.createModeler(config);
  }
}
```

### Custom Properties Issues

#### 10. Custom Properties Not Saving

**Problem**: Custom properties reset when diagram is exported/imported.

**Solution**:

1. **Verify Moddle Extensions**:
```json
// custom.json - Ensure proper extension definition
{
  "name": "Custom",
  "prefix": "custom",
  "uri": "http://custom",
  "types": [
    {
      "name": "CustomStartEvent",
      "extends": ["bpmn:StartEvent"],
      "properties": [
        {
          "name": "customProperty",
          "isAttr": true,
          "type": "String"
        }
      ]
    }
  ]
}
```

2. **Check Property Provider Registration**:
```typescript
// Ensure properties are properly saved to business object
function createCustomEntry(element, translate) {
  return {
    id: 'custom-property',
    element,
    getValue: function() {
      return element.businessObject.customProperty || '';
    },
    setValue: function(value) {
      // ✅ Use modeling API to ensure persistence
      const modeling = this.bpmn.get('modeling');
      modeling.updateProperties(element, {
        customProperty: value
      });
    }
  };
}
```

#### 11. Validation Rules Not Triggering

**Problem**: Custom validation rules don't execute or show results.

**Debugging**:
```typescript
// Add debugging to validation service
@Injectable()
export class ValidationService {
  validateElement(elementId: string): ValidationResult {
    console.log('Validating element:', elementId);
    
    const rules = this.getRulesForElement(elementId);
    console.log('Applicable rules:', rules.map(r => r.id));
    
    // Execute validation with logging
    const result = this.executeValidation(elementId, rules);
    console.log('Validation result:', result);
    
    return result;
  }
}
```

**Common Issues**:
1. **Rule not registered**: Check rule registration in service constructor
2. **Element type mismatch**: Verify rule applies to correct element types
3. **Property access**: Ensure properties are accessed correctly in validation context

### Development and Build Issues

#### 12. TypeScript Compilation Errors

**Problem**: Type errors preventing compilation.

**Common Solutions**:
```typescript
// ✅ Use proper type assertions
const modeler = this.bpmnService.getModeler() as any;

// ✅ Define proper interfaces
interface BpmnElement {
  id: string;
  businessObject: {
    $type: string;
    name?: string;
  };
}

// ✅ Use strict null checks safely
const element = this.getElement(id);
if (element?.businessObject) {
  // Safe to access properties
}
```

#### 13. Build Optimization Issues

**Problem**: Large bundle sizes or slow build times.

**Solutions**:
```json
// angular.json - Optimize build configuration
{
  "build": {
    "options": {
      "optimization": true,
      "buildOptimizer": true,
      "aot": true,
      "extractLicenses": true,
      "sourceMap": false
    }
  }
}
```

```typescript
// Use dynamic imports for large dependencies
async loadAdvancedFeatures() {
  const { AdvancedModule } = await import('./advanced/advanced.module');
  return AdvancedModule;
}
```

## 🔧 Debugging Tools and Techniques

### Browser DevTools

1. **Console Debugging**:
```typescript
// Add debugging helpers
window['bpmnDebug'] = {
  getModeler: () => this.bpmnService.getModeler(),
  getElements: () => this.bpmnService.getAllElements(),
  getCurrentElement: () => this.getSelectedElement()
};
```

2. **Network Monitoring**:
- Check for failed resource loads
- Monitor API calls for external integrations
- Verify correct MIME types for BPMN files

3. **Performance Profiling**:
- Use Performance tab to identify bottlenecks
- Monitor memory usage during diagram operations
- Profile change detection cycles

### Angular DevTools

1. **Component Inspector**: Examine component state and properties
2. **Profiler**: Analyze change detection performance
3. **Router Tree**: Debug routing issues in complex applications

### BPMN.js Debugging

```typescript
// Enable BPMN.js event debugging
const eventBus = modeler.get('eventBus');
eventBus.on('*', (event, ...args) => {
  console.log('BPMN Event:', event, args);
});

// Access internal services for debugging
const elementRegistry = modeler.get('elementRegistry');
const modeling = modeler.get('modeling');
const selection = modeler.get('selection');
```

## 📞 Getting Help

### Documentation Resources

1. **Project Documentation**: Refer to other sections in this documentation
2. **BPMN.js Documentation**: [bpmn.io/toolkit/bpmn-js/](https://bpmn.io/toolkit/bpmn-js/)
3. **Angular Documentation**: [angular.io](https://angular.io)

### Community Support

1. **GitHub Issues**: Report bugs and request features
2. **Stack Overflow**: Search for existing solutions using tags: `bpmn-js`, `angular`, `bpmn`
3. **BPMN.js Forum**: [forum.bpmn.io](https://forum.bpmn.io)

### Error Reporting

When reporting issues, include:

1. **Environment Information**:
   - Node.js version
   - Angular version  
   - Browser and version
   - Operating system

2. **Steps to Reproduce**:
   - Minimal code example
   - BPMN XML that causes the issue
   - Expected vs actual behavior

3. **Error Details**:
   - Console error messages
   - Network errors
   - Screenshots if applicable

### Creating Minimal Reproductions

```typescript
// Create a minimal test case
@Component({
  selector: 'app-test',
  template: `<div #diagram style="height: 400px;"></div>`
})
export class TestComponent implements AfterViewInit {
  @ViewChild('diagram') diagramRef!: ElementRef;

  async ngAfterViewInit() {
    const modeler = new Modeler({
      container: this.diagramRef.nativeElement
    });

    // Minimal test XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn2:process id="Process_1">
          <bpmn2:startEvent id="StartEvent_1"/>
        </bpmn2:process>
      </bpmn2:definitions>`;

    try {
      await modeler.importXML(xml);
      console.log('Success');
    } catch (error) {
      console.error('Error:', error);
    }
  }
}
```

---

This troubleshooting guide covers the most common issues encountered when working with the BPMN Angular Integration project. For additional help, refer to the [Developer Guide](developer-guide.md) for advanced topics or the [API Reference](api-reference.md) for detailed API information.
