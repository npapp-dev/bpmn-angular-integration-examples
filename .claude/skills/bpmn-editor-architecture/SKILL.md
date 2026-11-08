---
name: bpmn-editor-architecture
description: Use when starting any task in this repo (bpmn-angular-integration-examples, "BPMN Studio") - orienting in the codebase, locating where a feature lives, picking the right command to run, deciding which docs to trust, or touching the bpmn-js integration (Modeler, moddle descriptor, native properties panel, commandStack).
---

# BPMN editor architecture

Angular 21 **NgModule** app (`standalone: false` components, `@if/@for` control flow, no router routes) wrapping **bpmn-js 18** `Modeler` plus `bpmn-js-properties-panel` 5. Services are `providedIn: 'root'` and hold the single `Modeler` instance.

**Trust the code, not `src/docs/`.** Those seven files describe Angular 19, Bootstrap 5, jasmine, and APIs that do not exist (`registerPropertySchema`, `getPropertySchema`, `destroyModeler`, `getState()`, a `groups:` schema format). Only the root `README.md` is current.

## Where things live

| Concern | File |
|---|---|
| Orchestrator: creates the modeler, wires bpmn-js events to services, toolbar handlers | `src/app/diagram/diagram.component.ts` |
| Modeler lifecycle, default modules + `custom` moddle extension, import/export, default XML | `src/app/services/bpmn.service.ts` |
| Property schemas per element type (8 types) | `src/app/models/element-schemas.ts` |
| `BpmnElementType`, `PropertyType`, `PropertyDefinition`, `BusinessRule`, `CommonProperties`, `PropertyGroups` | `src/app/models/bpmn-elements.model.ts` |
| Per-element property values, defaults, restore from XML | `src/app/services/custom-properties.service.ts` |
| Validation rules + business-rule expression evaluator | `src/app/services/validation.service.ts` |
| Angular ("enhanced") properties panel, writes values into BPMN XML | `src/app/components/properties-panel/` |
| One input per `PropertyType` | `src/app/components/property-inputs/` |
| Toolbar (file/edit/view actions, cached arrays), status bar, canvas host | `src/app/components/diagram-toolbar|diagram-status|diagram-editor/` |
| Native bpmn-js panel extension (StartEvent "Custom properties" group) | `src/app/custom-properties-provider/` |
| Moddle descriptor: `custom:` namespace, `custom:Properties/Property`, `CustomStartEvent.custom` | `src/app/utils/descriptors/custom.json` |
| Design tokens, dark mode, 767px mobile breakpoint | `src/styles.css` |

## Runtime flow

1. `DiagramComponent.ngAfterViewInit` → `BpmnService.createModeler({container, propertiesPanel.parent})` → `attachModeler` → `importXML(getDefaultXML())`.
2. After import, bpmn-js events are wired: `selection.changed` → `DiagramStateService.setSelectedElement` + `CustomPropertiesService.setSelectedElement/initializeElementProperties`; `element.changed` → dirty flag; `commandStack.changed` → undo/redo flags; `canvas.viewbox.changed` → zoom readout; `import.done` → status.
3. Toolbar emits `*Requested` outputs; `DiagramComponent.on*Requested` handlers call `FileService` (download via `<a download>`, import via hidden `<input type=file>`).

## Two properties panels

- **Native bpmn-js panel** mounted into `#propertiesContainer` (`propertiesPanel.attachTo`). Extended by `custom-property-provider.ts` (`is(element,'bpmn:StartEvent')` → group with one `TextFieldEntry` writing `businessObject.custom`). To extend it to another type, add the `is()` check **and** a `custom.json` type that `extends` that BPMN type, otherwise the attribute is not serialized.
- **Angular enhanced panel** (`PropertiesPanelComponent`) below it, driven by `ElementSchemas`. Only UserTask, ServiceTask, ScriptTask, ExclusiveGateway, ParallelGateway, StartEvent, EndEvent, SequenceFlow have schemas; other types log `No schema found` and show the empty state. See skill `adding-element-properties`.

## bpmn-js services from Angular

```ts
const modeler: any = this.bpmnService.getModeler();   // null before createModeler
const modeling = modeler.get('modeling');             // also: elementRegistry, selection, canvas, moddle, eventBus
this.bpmnService.getCommandStack()?.undo();           // cached commandStack wrapper
```

## Commands

| Task | Command |
|---|---|
| Dev server | `npm start` (port 4200) or `./node_modules/.bin/ng serve --port 4299` |
| Unit tests (vitest, ~2 s) | `npx vitest run` / single file `npx vitest run src/app/services/validation.service.spec.ts` |
| Coverage | `npm run test:coverage` → `coverage/` |
| Production build | `npm run build` → `dist/bpmn-angular-integration-examples` |
| Typecheck app | `npx tsc --noEmit -p tsconfig.app.json` (the spec tsconfig fails on `vitest/globals`; rely on vitest) |
| Browser check | skill `verifying-in-browser` |

## UI conventions

No UI framework. Use tokens from `src/styles.css` (`--surface-*`, `--text-*`, `--border-*`, `--accent*`, `--radius-*`, `--shadow-*`, `--speed-*`; there are **no spacing tokens**). Dark mode is automatic via `prefers-color-scheme`. Under 768px the properties drawer becomes a bottom sheet toggled by `.properties-fab`. Production budget per component stylesheet: 12 kB warning, 16 kB error. The four stylesheets in `angular.json` `styles` are required or the panel renders unstyled.

## Known quirks (do not "fix" silently; mention them)

- Documentation textarea shows `[object Object]`: `businessObject.documentation` is an array of `bpmn:Documentation`, copied as-is in `initializeElementProperties`.
- A business-rule condition that throws is caught and reported as **passed** (`evaluateExpression` returns false).
- `DiagramStateService.select()` subscribes without teardown.
