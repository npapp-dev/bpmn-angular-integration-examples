# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

- `npm start` — dev server at http://localhost:4200.
- `npm run build` — production build (defaults to `production`; budgets enforced).
- `npm run watch` — incremental development build.
- `npm test` — runs the suite via `@analogjs/vitest-angular` (the `ng test` builder is wired to **vitest**, not Karma).
- `npm run test:coverage` — `vitest run --coverage` (v8 provider, `./coverage`).
- Single spec: `npx vitest run src/app/services/validation.service.spec.ts` (add `-t "<name>"` to filter; drop `run` for watch).

Node 20.19+ or 22.12+ required (Angular 21).

## Architecture

Angular 21 + bpmn-js 18 modeler. The Angular ↔ bpmn-js boundary is non-obvious — read this section before editing `services/bpmn.service.ts`, `diagram/diagram.component.ts`, or anything in `custom-properties-provider/`.

### Bootstrap & module layout (standalone, no NgModules)

The app uses `bootstrapApplication(AppComponent, appConfig)` from `src/main.ts`. `src/app/app.config.ts` provides root services (`HttpClient`, `Router`, `DiagramStateService`, `CustomPropertiesService`, `ValidationService`, `FileService`). **There are no NgModules.** All components are `standalone: true` with their own `imports` arrays — match that style for new components.

`DiagramComponent` is the page-level orchestrator. It composes four children via `@ViewChild`:

- `DiagramEditorComponent` exposes `diagramContainer` (canvas mount).
- `PropertiesPanelComponent` exposes `propertiesContainer` (properties panel mount).
- `DiagramToolbarComponent` emits `ToolbarAction`.
- `DiagramStatusComponent` shows validation status.

`PropertyInputComponent` is a generic schema-driven input renderer.

### Services (`src/app/services/`, re-exported via `services/index.ts`)

All Angular services use `inject()` injection (no constructor params) and `takeUntilDestroyed(destroyRef)` for subscriptions — never `Subscription[]` arrays.

- **`BpmnService`** — wraps the bpmn-js `Modeler`. **Component-scoped**, NOT `providedIn: 'root'`. Provided via `providers: [BpmnService]` on `DiagramComponent` so each diagram instance owns its own modeler bound to its lifecycle. Public surface:
  - `async createModeler(config)` — **lazy-loads** `bpmn-js/lib/Modeler` and `bpmn-js-properties-panel` via dynamic `import()`; only the editor route pays for them. Runs the constructor inside `runOutsideAngular`.
  - `selection` (signal) / `selectionChanged$` (Observable) / `elementChanged$` / `importDone$` / `commandStackChanged$` / `canUndo` / `canRedo` — fed from `eventBus.on(...)` callbacks wired in `wireEvents()`.
  - `destroy()` calls `eventBus.off(...)` for every binding it created, then `modeler.destroy()`, then `.complete()`s every Subject. Also runs automatically via `OnDestroy` when the component is torn down.
- **`DiagramStateService`** — `BehaviorSubject`-based app state (selection, dirty flag, current diagram).
- **`CustomPropertiesService`** — schema-driven property management on top of `models/element-schemas.ts`.
- **`ValidationService`** — runs `BusinessRule`s, emits `PropertyValidationResult`s.
- **`FileService`** — XML/SVG file I/O.
- **`LoggerService`** — **use this everywhere instead of `console.*`.** Gates by `LogLevel` (Warn in prod / Debug in dev). Inject via `private readonly logger = inject(LoggerService);`.

### bpmn-js integration boundary

Two DI systems coexist:

1. **Angular DI** for everything in `src/app/**` *except* the provider folder.
2. **bpmn-js / didi DI** for `src/app/custom-properties-provider/**`.

`custom-property-provider.ts` is a **didi factory function** (uses `$inject`, assigns `this.getGroups`, calls `propertiesPanel.registerProvider`). Do not Angular-ify it — bpmn-js instantiates it inside its own injector. The default export is a didi module (`{ __init__, customPropertiesProvider }`) that `BpmnService.createModeler` passes as `additionalModules`.

The custom moddle extension (`src/app/utils/descriptors/custom.json`) defines the `custom:` namespace, currently extending `bpmn:StartEvent` with a `custom` attribute plus generic `custom:Properties` / `custom:Property` types. To add a new typed BPMN attribute: edit `custom.json` (XML schema) → update `models/element-schemas.ts` (UI schema) → add an entry in `custom-properties-provider/properties/custom-properties.ts` → gate the group in `custom-property-provider.ts` with `is(element, 'bpmn:...')`.

### NgZone isolation

`new Modeler(...)`, `attachTo(...)`, `destroy()`, and every `eventBus.on(...)` callback run inside `zone.runOutsideAngular(...)` — bpmn-js fires hundreds of DOM events per drag/zoom/click and they would otherwise trigger app-wide change detection. Public state is exposed as **signals**, which schedule CD automatically when read in templates without re-entering the zone.

### Required stylesheets

`angular.json` `styles` already lists the four required CSS files: `diagram-js.css`, `bpmn-font/css/bpmn.css`, `@bpmn-io/properties-panel/dist/assets/properties-panel.css`, `bootstrap.css`. The properties panel is **unstyled without the `@bpmn-io/properties-panel` CSS** — `bpmn-js-properties-panel` does not ship its own stylesheet. Don't drop these entries.

### Test environment

- Tests run under **vitest** with `jsdom`; config in `vite.config.ts`. `angular.json` binds `ng test` to `@analogjs/vitest-angular:test`.
- `vite.config.ts` inlines `bpmn-js`, `bpmn-js-properties-panel`, `@bpmn-io`, `diagram-js`, `min-dash`, `min-dom` via `server.deps.inline`. Add new bpmn-io / diagram-js deps here if module-resolution errors appear.
- Coverage **excludes** `src/app/custom-properties-provider/**` (didi factories aren't unit-tested), plus `*.spec.ts`, `*.module.ts`, `*.model.ts`, and `index.ts` barrels.
- Standalone components must go in `imports`, not `declarations`, in `TestBed.configureTestingModule`.
- `BpmnService` is component-scoped, so unit tests that mock it must also override the component metadata: `TestBed.overrideComponent(DiagramComponent, { set: { providers: [{ provide: BpmnService, useValue: mock }] } })`. Without this, the component-level provider shadows a TestBed-level `useValue`.
- `bpmn.service.integration.spec.ts` exercises a real bpmn-js Modeler (no `vi.mock('bpmn-js/lib/Modeler')`). Only `bpmn-js-properties-panel` is mocked — its CJS dist can't be inlined under vitest. The integration tests cover lazy-load, real eventBus → signal/Subject pipeline, and listener cleanup. They avoid `importXML` and `element.changed` because bpmn-js's Overlays handler calls `Canvas.viewbox()`, which needs SVG transform machinery jsdom lacks.
- Test bootstrap: `src/test-setup.ts`.

### Production budgets & lazy chunks

`angular.json` enforces 5 MB initial-bundle and 16 KB per-component-style hard caps. The Modeler is dynamically imported, so it lands in its own ~130 KB transfer chunk and is excluded from the initial bundle. Initial total transfer is ~152 KB; the Modeler chunk loads on demand when `DiagramComponent` mounts.
