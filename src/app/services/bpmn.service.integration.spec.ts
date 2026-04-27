/**
 * Integration tests for BpmnService that exercise a REAL bpmn-js Modeler under
 * jsdom. Only `bpmn-js-properties-panel` is mocked — its dist bundle uses CJS
 * `require()` against an ESM-shipped bpmn-js submodule and can't be inlined by
 * vitest. The Modeler, EventBus, Selection, Modeling, and CommandStack are all
 * real, so the tests still cover the seams that mock-based unit tests cannot:
 * dynamic imports, real event emission, signal updates, listener cleanup.
 */
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesPanelModule: {},
  BpmnPropertiesProviderModule: {}
}));
vi.mock('@bpmn-io/properties-panel', () => ({}));
vi.mock('../custom-properties-provider/custom-property-provider', () => ({ default: {} }));

// jsdom doesn't implement a few SVG bits diagram-js relies on. These shims
// are enough for non-pixel-perfect tests — we're asserting on event flow and
// state, not rendered geometry.
if (typeof (globalThis as any).CSS === 'undefined') {
  (globalThis as any).CSS = { escape: (s: string) => s };
}
if (typeof (globalThis as any).SVGElement !== 'undefined' &&
    !(globalThis as any).SVGElement.prototype.getBBox) {
  (globalThis as any).SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
}

import { BpmnService } from './bpmn.service';
import { SAMPLE_PROCESS_XML } from '../__fixtures__/sample-process.bpmn';

describe('BpmnService (integration with real bpmn-js)', () => {
  let service: BpmnService;
  let container: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BpmnService] });
    service = TestBed.inject(BpmnService);

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('lazy-loads the Modeler and instantiates it against a DOM container', async () => {
    const modeler = await service.createModeler({ container });
    expect(modeler).toBeTruthy();
    expect(service.getModeler()).toBe(modeler);
    expect(service.isReady()).toBe(true);
  });

  // NOTE: real `importXML` and `element.changed` exercises trigger bpmn-js's
  // Overlays handler, which calls `Canvas.viewbox()`. That requires SVG
  // transform support jsdom does not provide (`SVGGraphicsElement#transform`
  // / `tiny-svg.transform`). Those code paths need a real-browser harness
  // (Karma / Playwright) to validate. The selection/Subject/destroy tests
  // below cover the BpmnService surface without invoking Canvas.

  // Tests below fire events through the real eventBus on a created (not
  // imported) Modeler. importXML triggers Canvas viewbox computations that
  // jsdom can't run; the BpmnService contract under test ("forward eventBus
  // payload to the Subject + update signal") doesn't depend on Canvas.

  it('updates the selection signal when the eventBus fires selection.changed', async () => {
    await service.createModeler({ container });
    expect(service.selection()).toBeNull();

    const eventBus = service.getModeler()!.get<any>('eventBus');
    const fakeTask = { id: 'Task_1', type: 'bpmn:Task' } as any;

    eventBus.fire('selection.changed', { oldSelection: [], newSelection: [fakeTask] });

    expect(service.selection()?.id).toBe('Task_1');
  });

  it('forwards selection.changed events to selectionChanged$', async () => {
    await service.createModeler({ container });
    const next = firstValueFrom(service.selectionChanged$);

    const eventBus = service.getModeler()!.get<any>('eventBus');
    eventBus.fire('selection.changed', {
      oldSelection: [],
      newSelection: [{ id: 'A', type: 'bpmn:Task' }]
    });

    const evt = await next;
    expect(evt.newSelection[0].id).toBe('A');
  });

  it('completes all event subjects on destroy()', async () => {
    await service.createModeler({ container });

    const collected = lastValueFrom(service.selectionChanged$.pipe(toArray()));
    service.destroy();

    // The subject completed, so toArray resolves with whatever was buffered.
    await expect(collected).resolves.toEqual([]);
    expect(service.getModeler()).toBeNull();
    expect(service.isReady()).toBe(false);
  });

  it('detaches BpmnService listeners on destroy so signals stop updating', async () => {
    await service.createModeler({ container });

    const eventBus = service.getModeler()!.get<any>('eventBus');
    eventBus.fire('selection.changed', { oldSelection: [], newSelection: [{ id: 'A', type: 'bpmn:Task' }] });
    expect(service.selection()?.id).toBe('A');

    // Capture the eventBus before destroy nulls out the modeler reference.
    service.destroy();

    expect(service.getModeler()).toBeNull();
    // The selection signal retains its last value (signal semantics), but
    // firing more events on the now-orphan eventBus must not reach the
    // service's listener — proves eventBus.off was called.
    expect(() => eventBus.fire('selection.changed', {
      oldSelection: [],
      newSelection: [{ id: 'POST_DESTROY', type: 'bpmn:Task' }]
    })).not.toThrow();
    expect(service.selection()?.id).toBe('A');
  });
});
