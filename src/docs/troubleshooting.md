# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Installation and Setup Issues

#### 1. Node.js Version Compatibility

**Problem**: Application fails to start or build with Node.js version errors.

**Solution**:
```bash
# Check current Node.js version
node --version

# Required: Node.js 20.19+ or 22.12+ (Angular 21)
# Use nvm to switch versions
nvm install 22
nvm use 22

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
npm install -g @angular/cli@21

# Or use the local CLI that ships with the project
npx ng version

# Update local Angular packages
npx ng update @angular/cli @angular/core
```

#### 3. BPMN.js Dependencies Issues

**Problem**: BPMN.js modules fail to load or cause compilation errors.

**Solution**:
```bash
# Ensure all BPMN.js packages are compatible versions
npm install bpmn-js@18.3.0 bpmn-js-properties-panel@5.32.0 @bpmn-io/properties-panel@3.26.1

# Clear Angular build cache
npx ng build --delete-output-path
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
  template: `<div #diagramContainer class="diagram-container"></div>`,
  standalone: false
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

In this project the modeler is created by `DiagramComponent.initializeBpmnModeler()` in `ngAfterViewInit`, using the containers exposed by `DiagramEditorComponent` and `PropertiesPanelComponent`.

**Additional Checks**:
```typescript
// Verify modeler configuration (these are the defaults BpmnService.createModeler applies;
// a key you pass replaces the default for that key, so pass the full list if you override)
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
  this.diagramStateService.state$.subscribe(state => {
    console.log('Selected element:', state.selectedElement?.id);
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

3. **Check the element type has a schema**:
```typescript
// Only these types have enhanced properties; others log "No schema found for element type: ..."
console.log(this.customPropertiesService.getSupportedElementTypes());
```

4. **Check the stylesheets**: the properties panel renders unstyled or empty-looking if `@bpmn-io/properties-panel/dist/assets/properties-panel.css` is missing from the `styles` array in `angular.json` (see the root README).

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
    
    // importXML returns an Observable<ImportResult>
    const result = await firstValueFrom(this.bpmnService.importXML(xml));
    
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

1. **Keep diagrams small**: split very large processes into sub-processes or separate diagrams.

2. **Avoid leaking subscriptions**: unsubscribe in `ngOnDestroy`. `DiagramStateService.select()` subscribes to `state$` without teardown, so prefer `state$.pipe(map(...), distinctUntilChanged())` with `takeUntil`.

3. **Change detection**: the app uses default change detection (no `OnPush`, no lazy-loaded routes), so heavy work inside bindings or per-change handlers shows up directly. Use cached values (as the toolbar does for its action arrays) instead of recomputing in templates.

### Browser Compatibility Issues

#### 8. Legacy Browser Support

**Problem**: Application doesn't work in older browsers.

**Solution**: Angular 21 only supports current evergreen browsers (no Internet Explorer, no `polyfills.ts`). Update the browser; the `polyfills` entry in `angular.json` only includes `zone.js`.

#### 9. Mobile Browser Issues

**Problem**: Touch interactions not working properly on mobile devices.

**Solution**:
```css
/* diagram-js already sets touch handling; only override if you embed the canvas elsewhere */
.diagram-container {
  touch-action: none;
}
```

In this app the layout is already responsive: under 768px the properties panel becomes a bottom sheet opened by the floating `.properties-fab` button, and the default diagram is zoomed to fit.

**Known issue**: on phone widths the status bar's validation popover (`.validation-details`) can overlap the floating button, so an element with errors blocks opening the drawer until the popover is dismissed (use the dismiss control on the popover).

### Custom Properties Issues

#### 10. Custom Properties Not Saving

**Problem**: Custom properties reset when diagram is exported/imported.

**How persistence works**:
- `id`, `name` and `documentation` are written directly to the business object.
- Every other schema property is written by `PropertiesPanelComponent.updateCustomProperty` as a `custom:Properties` extension element containing `custom:Property` entries (`name`, `value`, `type`, values stringified). They are restored on selection by `CustomPropertiesService.initializeElementProperties`.
- The native panel's StartEvent "Custom properties" field is separate: it writes the `custom` attribute declared by `CustomStartEvent` in `utils/descriptors/custom.json`.

**Solution**:

1. **Verify the moddle extension is loaded**: `BpmnService.createModeler` passes `moddleExtensions: { custom }` by default. If you override `moddleExtensions` in the config, include it, or `custom:` elements will be dropped or rejected on import/export.

2. **Check the exported XML** (Export XML) for `<custom:properties>` / `<custom:property name="..." value="..." type="..."/>` inside `<bpmn2:extensionElements>`.

3. **Native panel attributes need a descriptor type**: to persist a new attribute from the native panel, add the `is()` check in `custom-property-provider.ts` and a type in `custom.json` that `extends` that BPMN type.

**Known quirk**: the Documentation field can show `[object Object]`, because `businessObject.documentation` is an array of `bpmn:Documentation` and is copied as-is when the element's properties are initialised.

#### 11. Validation Rules Not Triggering

**Problem**: Validation rules don't execute or show results.

**Debugging**:
```typescript
// Inspect what the service has stored for an element
this.validationService.getValidationResults('UserTask_1');
this.validationService.getBusinessRuleResults('UserTask_1');
this.validationService.getValidationSummary();
```

**Common Issues**:
1. **No schema**: only elements with an entry in `ElementSchemas` are validated
2. **Rule in the wrong place**: field rules belong in the property's `validation` array; cross-property rules in the schema's `businessRules`
3. **Inverted condition**: a business rule passes when its `condition` is **false**, so the condition must describe the violation
4. **Condition errors**: a `condition` that throws is caught and the rule is reported as passed, so a typo in the expression silently disables it. Check the browser console and test the expression against real property values
5. **Property names**: conditions refer to property `name`s from the schema (for example `assignee`, `implementation`)

### Development and Build Issues

#### 12. TypeScript Compilation Errors

**Problem**: Type errors preventing compilation.

**Common Solutions**:
```typescript
// ✅ Use proper type assertions (the modeler is typed loosely)
const modeler = this.bpmnService.getModeler() as any;

// ✅ getModeler() can be null before createModeler
const registry = modeler?.get('elementRegistry');
```

To typecheck the app without running a build: `npx tsc --noEmit -p tsconfig.app.json` (the spec tsconfig reports errors for `vitest/globals`; rely on `npx vitest run` for specs).

#### 13. Build Optimization Issues

**Problem**: Large bundle sizes, budget warnings, or slow build times.

**Notes**:
- `angular.json` sets a production budget of 12 kB warning / 16 kB error per component stylesheet; exceeding it fails `npm run build`.
- The production configuration already enables optimisation and output hashing. Use `npm run watch` for development rebuilds.
- bpmn-js is the dominant part of the bundle size; there is no lazy loading because the app has no routes.

## 🔧 Debugging Tools and Techniques

### Browser DevTools

1. **Console Debugging**:
```typescript
// Add debugging helpers
window['bpmnDebug'] = {
  getModeler: () => this.bpmnService.getModeler(),
  getElements: () => (this.bpmnService.getModeler() as any).get('elementRegistry').getAll(),
  getCurrentElement: () => this.diagramStateService.getSelectedElement()
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
3. **Injector Tree**: Inspect the root-provided services (the app has no routes)

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
3. **Angular Documentation**: [angular.dev](https://angular.dev)

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
export class TestComponent implements AfterViewInit {   // declare with standalone: false, or import it where you use it
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
