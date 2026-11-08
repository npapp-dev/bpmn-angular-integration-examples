---
name: verifying-in-browser
description: Use when a change to this BPMN editor must be confirmed in the running app (canvas, properties panel, toolbar, status bar, exported XML), when a screenshot is requested, or when unit tests pass but runtime behaviour is in doubt. Works offline with the cached headless Chromium.
---

# Verifying in the browser

Green unit tests mock bpmn-js entirely, so UI and XML changes are only proven in the real app. One command starts the dev server, drives headless Chromium, prints evidence, saves a screenshot, and stops the server:

```bash
node .claude/skills/verifying-in-browser/scripts/verify-app.js --serve \
  --select ServiceTask_1 --set implementation=external --expect '#topic' \
  --xml bpmn2:serviceTask --shot /tmp/verify.png
```

Typical output:

```
selected ServiceTask_1: enhanced panel shown
  element title: Service Task
  validation   : 2 errors
set implementation = external (SELECT:select-one)
expect visible #topic: OK
--- xml (bpmn2:serviceTask) ---
<bpmn2:serviceTask id="ServiceTask_1" name="Process Payment"> ... <custom:property name="implementation" value="external" type="select" /> ...
screenshot: /tmp/verify.png
--- browser errors ---
(none)
```

Exit code 1 means an expectation failed or the page logged `console.error`/`pageerror`; the output lists them.

**Then open the screenshot with the Read tool and look at it.** A DOM assertion does not prove layout, dark-mode colours, or that the panel is actually visible. Report what you saw, the exit code, and the browser-errors section.

## Options

| Option | Meaning |
|---|---|
| `--serve` | run `./node_modules/.bin/ng serve --port <port>` (log in `/tmp/bpmn-serve.log`), wait for HTTP 200, kill it at the end. Omit when a server is already running. |
| `--port <n>` | default 4299 (`npm start` uses 4200) |
| `--select <id>` | click the canvas element with `data-element-id`. Default diagram ids: `StartEvent_1`, `UserTask_1`, `ServiceTask_1`, `ExclusiveGateway_1`, `EndEvent_Success`, `EndEvent_Failed`, `Flow_1`..`Flow_5` |
| `--set <id>=<value>` | fill the enhanced-panel input whose DOM id is the property id (select = option value, checkbox = `true/false`); repeatable |
| `--expect <sel>` / `--absent <sel>` | assertions, evaluated **after** all `--set`; repeatable |
| `--xml [tag]` | export BPMN XML via Angular's dev-mode `ng.getComponent(...)` and print it all, or only the first `<tag ...>` element |
| `--mobile` / `--viewport WxH` / `--dark` | 390x844 bottom-sheet layout, custom size, `prefers-color-scheme: dark` |

## Selectors worth knowing

Canvas `[data-element-id="X"]`, enhanced panel `.enhanced-properties-panel`, `.element-title`, `.status-text`, property inputs `#<propertyId>` (multiSelect checkboxes `#tags_automated`), tabs `.tab-button`, toolbar buttons `.toolbar-btn[aria-label="Export XML"]`, panel toggle `.panel-toggle`, mobile FAB `.properties-fab`, drawer `.properties-drawer`, status bar `.status-bar`, zoom `.zoom-readout`. The native bpmn-js panel sits above the enhanced panel inside `.properties-panel-container`.

## Scripting your own check

In dev serve (not the production build) Angular exposes component instances:

```js
const cmp = ng.getComponent(document.querySelector('app-diagram'));   // DiagramComponent
await cmp.diagramEditor.exportXML({ format: true });
cmp.bpmnService.getModeler().get('elementRegistry').getAll().map(e => e.id);
```

Resolve Playwright exactly as the script does: `require('playwright-core')` from the repo root (1.55.0 is installed but undeclared), falling back to the `~/.npm/_npx` cache. Chromium 1187 lives in `~/Library/Caches/ms-playwright`; **do not** `npm install playwright` or `npx playwright install` — they download browsers.

Manual server control:

```bash
./node_modules/.bin/ng serve --port 4299 > /tmp/bpmn-serve.log 2>&1 &   # ~3 s until "Local:" appears
lsof -ti:4299 | xargs kill                                                # stop
```

## Common mistakes

- Reporting "verified" from a green script without reading the screenshot.
- Selecting an element type that has no schema (`bpmn:Task`, flows' labels…) and concluding the panel is broken: the script prints `NOT shown (no schema for this type)`.
- Putting `--absent '#topic'` before `--set implementation=external` and expecting a pre-state check; assertions run last.
- Using `--xml` against `npm run build` output: `window.ng` only exists in dev mode.
- Leaving `ng serve` running: always `--serve` (auto-stop) or kill the port afterwards.
