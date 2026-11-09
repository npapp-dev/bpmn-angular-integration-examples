---
name: testing-bpmn-editor
description: Use when running, writing, or fixing unit tests in this repo (vitest + Angular TestBed), when a spec must mock bpmn-js or the properties panel packages, when tests break after changing schemas, toolbar actions or component APIs, or when a persistence change needs an XML round-trip test.
---

# Testing the BPMN editor

Runner is **vitest 4 + jsdom** via `@analogjs/vite-plugin-angular` (`vite.config.ts`, setup in `src/test-setup.ts`). No jasmine, no karma, no Protractor. The suite is ~420 tests and runs in ~2 s.

## Run

```bash
npx vitest run                                              # whole suite
npx vitest run src/app/services/validation.service.spec.ts  # one file
npx vitest run -t "should restore"                          # by test name
npm run test:coverage                                       # v8 coverage → coverage/
npm test -- --watch=false                                   # same suite through `ng test`
```

Lines like `Modeler not available for properties panel` on stderr are expected noise. vitest does **not** typecheck specs; `npx tsc -p tsconfig.spec.json` is broken (`vitest/globals`), so type mistakes surface only as runtime failures.

## Spec skeleton (copy this shape)

Any spec that imports a module which (transitively) imports `bpmn.service.ts` must hoist these mocks **before** the imports, or jsdom will try to load bpmn-js:

```ts
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bpmn-js', () => ({ default: class {} }));
vi.mock('bpmn-js-properties-panel', () => ({}));
vi.mock('@bpmn-io/properties-panel', () => ({}));

import { BpmnService } from '../../services/bpmn.service';
import { CustomPropertiesService } from '../../services/custom-properties.service';
import { PropertiesPanelComponent } from './properties-panel.component';

describe('PropertiesPanelComponent', () => {
  let fixture: ComponentFixture<PropertiesPanelComponent>;
  let component: PropertiesPanelComponent;
  let selected$: BehaviorSubject<any>;
  let customPropertiesService: { getSelectedElementProperties: ReturnType<typeof vi.fn>; setProperty: ReturnType<typeof vi.fn> };
  let bpmnService: { getModeler: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    selected$ = new BehaviorSubject<any>(null);
    customPropertiesService = { getSelectedElementProperties: vi.fn().mockReturnValue(selected$.asObservable()), setProperty: vi.fn() };
    bpmnService = { getModeler: vi.fn().mockReturnValue(null) };
    await TestBed.configureTestingModule({
      declarations: [PropertiesPanelComponent],
      imports: [FormsModule],                      // templates using ngModel
      providers: [
        { provide: CustomPropertiesService, useValue: customPropertiesService },
        { provide: BpmnService, useValue: bpmnService }
      ],
      schemas: [NO_ERRORS_SCHEMA]                   // child components not declared
    }).compileComponents();
    fixture = TestBed.createComponent(PropertiesPanelComponent);
    component = fixture.componentInstance;
    component.propertiesContainer = { nativeElement: document.createElement('div') } as any; // ViewChild stub
  });
});
```

Conventions seen across all 13 specs:
- Mocks are plain objects of `vi.fn()`; observables are `BehaviorSubject` / `of()`; assert outputs with `vi.spyOn(component.propertyChanged, 'emit')`; read observables with `firstValueFrom`.
- Services get a real `TestBed` (`providers: [ValidationService]`, `TestBed.inject`). `BpmnService` itself mocks `bpmn-js/lib/Modeler` with a constructor function (`bpmn.service.spec.ts`).
- Silence expected warnings: `vi.spyOn(console, 'warn').mockImplementation(() => {})`.
- bpmn-js services in a mock modeler: `getModeler.mockReturnValue({ get: (name) => ({ modeling, elementRegistry, moddle })[name] })`.
- Small `makeElement()` / `makeProperty()` factories at the top of the file.

## Pins you must update when changing behaviour

| Change | Spec to update |
|---|---|
| Add/remove an element-type schema | `element-schemas.spec.ts`: `toHaveLength(8)` and `ALL_SCHEMA_TYPES` |
| Toolbar actions | `diagram-toolbar.component.spec.ts` asserts **reference equality** of `defaultActions/editActions/viewActions` — keep the cached getters |
| Property persistence | `properties-panel.component.spec.ts` "updateCustomProperty" block asserts `moddle.create` calls and `updateProperties(element, { extensionElements })` |
| Status bar type names | `diagram-status.component.spec.ts` |

## XML round-trip test (real bpmn-moddle, no browser)

```ts
const BpmnModdle = (await import('bpmn-moddle')).default as any;
const custom = (await import('../utils/descriptors/custom.json')).default;
const moddle = new BpmnModdle({ custom });
const prop = moddle.create('custom:Property', { name: 'costCenter', value: 'R&D', type: 'select' });
const ext = moddle.create('bpmn:ExtensionElements', { values: [moddle.create('custom:Properties', { properties: [prop] })] });
const task = moddle.create('bpmn:ServiceTask', { id: 'Task_1', extensionElements: ext });
const defs = moddle.create('bpmn:Definitions', { id: 'D', targetNamespace: 'http://bpmn.io/schema/bpmn',
  rootElements: [moddle.create('bpmn:Process', { id: 'P', flowElements: [task] })] });
const { xml } = await moddle.toXML(defs, { format: true });
expect(xml).toContain('value="R&#38;D"');            // moddle escapes & as &#38;, not &amp;
const { rootElement } = await moddle.fromXML(xml);
service.initializeElementProperties('Task_1', { type: 'bpmn:ServiceTask', businessObject: rootElement.rootElements[0].flowElements[0] });
expect(service.getElementProperties('Task_1')!.properties['costCenter']).toBe('R&D');
```

## Common mistakes

- Forgetting the three `vi.mock` lines → `Cannot find module`/DOM errors from bpmn-js in jsdom.
- Editing specs with `sed -i` (quoting breaks on `$`, `&`, `/`); use the Edit tool or a small python script.
- Asserting `&amp;` in moddle output; it writes `&#38;`.
- Calling `fixture.detectChanges()` on components whose template needs a live modeler; most specs call lifecycle hooks directly.
- Green unit tests are not a runtime check: finish with skill `verifying-in-browser` for UI or XML changes.
