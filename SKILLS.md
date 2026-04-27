# SKILLS.md

Recipes for the recurring tasks in this repo. Each one names the exact files to touch so you don't have to grep the codebase from scratch.

## Add a new Angular component

1. Create `src/app/components/<name>/<name>.component.{ts,html,css,spec.ts}`.
2. Use `standalone: true` (this repo has no NgModules) — match every existing component.
3. Use `inject()` for dependencies, never constructor parameters.
4. For subscriptions, use `inject(DestroyRef)` + `takeUntilDestroyed(this.destroyRef)`. Do not maintain `Subscription[]` arrays.
5. Inject `LoggerService` for any logging — never `console.*`.
6. List the component in its parent's `imports` array (e.g. `DiagramComponent.imports`).
7. If exported as part of the public component surface, add a re-export to `src/app/components/index.ts`.

## Add a new Angular service

1. Create `src/app/services/<name>.service.ts`.
2. Decide scope:
   - **Root**: `@Injectable({ providedIn: 'root' })` AND list in `src/app/app.config.ts` `providers`.
   - **Component-scoped** (like `BpmnService`): `@Injectable()` only, then `providers: [<Service>]` on the consuming component. Use this when the service holds per-component state with a clear lifecycle.
3. Re-export from `src/app/services/index.ts`.
4. Inject `LoggerService` for logging — never `console.*`.

## Add a new custom BPMN attribute on an element

This crosses three layers — all three must be updated together or the value won't round-trip through XML.

1. **Moddle schema** — edit `src/app/utils/descriptors/custom.json`. Either extend an existing bpmn type (see `CustomStartEvent extends bpmn:StartEvent`) or add a new type. `isAttr: true` for XML attributes; omit it for child elements.
2. **UI schema** — edit `src/app/models/element-schemas.ts` to describe how the property renders (type, label, validation). Schemas are keyed by `BpmnElementType`.
3. **Properties panel entry** — add an entry to `src/app/custom-properties-provider/properties/custom-properties.ts` (using `@bpmn-io/properties-panel` components like `TextFieldEntry`). Then in `src/app/custom-properties-provider/custom-property-provider.ts`, add an `is(element, 'bpmn:...')` branch in `getGroups` so the group shows up for the right element type.

The provider folder uses **didi DI**, not Angular DI. Do not inject Angular services there; bpmn-js instantiates the factory inside its own injector.

## Consume modeler events from a component

`BpmnService` exposes the seams you need — never call `modeler.on(...)` directly from a component:

- `bpmn.selection` — signal with the currently-selected element (or `null`).
- `bpmn.selectionChanged$` — Observable of the raw `SelectionChangedEvent`.
- `bpmn.elementChanged$` — Observable of `ElementChangedEvent`.
- `bpmn.importDone$` — Observable of `ImportDoneEvent`.
- `bpmn.commandStackChanged$` — Observable<void>.
- `bpmn.canUndo` / `bpmn.canRedo` — signals.

Subscribe with `takeUntilDestroyed(this.destroyRef)`. The Subjects complete on `BpmnService.ngOnDestroy`, so downstream subscribers also tear down automatically.

## Add a new business rule / validation rule

1. Define the rule against `BusinessRule` / `PropertyValidationResult` from `src/app/models/bpmn-elements.model.ts`.
2. Register/run it through `ValidationService` (`src/app/services/validation.service.ts`).
3. If the rule needs cross-element data, populate `ValidationContext.allElementsData` / `processData` at the call site.

## Logging

- **Always** `inject(LoggerService)` and use `this.logger.debug/info/warn/error`.
- Do **not** add new `console.*` calls.
- Log levels: `Debug` in dev, `Warn` in prod (gated via `environment.production`).

## Run a single test

- One file: `npx vitest run path/to/file.spec.ts`.
- One test name: `npx vitest run path/to/file.spec.ts -t "partial name"`.
- Watch mode: drop `run` (`npx vitest path/to/file.spec.ts`).
- Whole suite: `npm test`. Coverage: `npm run test:coverage`.

## Test patterns

- **Standalone components** go in `imports`, not `declarations`, in `TestBed.configureTestingModule`.
- **Mocking BpmnService** in `DiagramComponent` tests requires overriding the component's providers, because `providers: [BpmnService]` on the component shadows root-level mocks:
  ```ts
  TestBed.configureTestingModule({ imports: [DiagramComponent], providers: [...] })
    .overrideComponent(DiagramComponent, {
      set: { providers: [{ provide: BpmnService, useValue: bpmnServiceMock }] }
    });
  ```
- **Async modeler creation**: `createModeler` is async. Tests calling `ngAfterViewInit()` (which dispatches an unawaited promise) must `await (component as any).initializeBpmnModeler()` directly to observe side effects deterministically.
- **Real-Modeler integration tests** live in `bpmn.service.integration.spec.ts`. Mock only `bpmn-js-properties-panel` + `@bpmn-io/properties-panel` (their CJS dist can't be inlined). Add jsdom polyfills (`CSS.escape`, `SVGElement.prototype.getBBox`) at the top of the file. Avoid `importXML` and `element.changed` paths under jsdom — Overlays calls `Canvas.viewbox()` which needs SVG transform support jsdom lacks.

If a new bpmn-io / diagram-js package fails to load in tests with an ESM/CJS error, add it to `server.deps.inline` in `vite.config.ts`.

## Don't write tests for `custom-properties-provider/**`

That directory is excluded from coverage on purpose — it's a didi factory wired through bpmn-js, not Angular, so the standard `TestBed` setup doesn't apply. Test the surrounding Angular services instead (e.g. `CustomPropertiesService`).

## Working with the modeler at runtime

- `bpmnService.createModeler(config)` is async — it dynamically imports bpmn-js. Returns `Promise<Modeler>`.
- `bpmnService.getModeler()` returns the cached `Modeler | null`.
- Command stack: `bpmnService.getCommandStack()` (throws if no modeler — call after `createModeler` resolves). Or read the `canUndo()` / `canRedo()` signals.
- Import/export: `BpmnService.importXML` / `exportXML` / `exportSVG` use bpmn-js's own types from `bpmn-js/lib/BaseViewer`.
- DOM wiring: `DiagramComponent.ngAfterViewInit` awaits modeler creation, then calls `attachModeler(diagramContainer, propertiesContainer)`. Child component containers must be rendered before this runs (they are — `@ViewChild('...')` resolves in `ngAfterViewInit`).

## Bundle size

Production budgets in `angular.json`: 5 MB initial (hard error), 16 KB per component style. The Modeler is lazy — it's a separate ~130 KB transfer chunk. Initial transfer is ~152 KB. If a build fails on budgets, prefer trimming bpmn-js submodules over raising caps.

## Required stylesheets — don't remove

`angular.json` `styles` must include all four: `diagram-js.css`, `bpmn-font/css/bpmn.css`, `@bpmn-io/properties-panel/.../properties-panel.css`, `bootstrap.css`. Removing the `@bpmn-io/properties-panel` CSS leaves the panel completely unstyled (`bpmn-js-properties-panel` has no CSS of its own).
