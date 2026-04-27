import { Injectable, NgZone, OnDestroy, signal, inject } from '@angular/core';
import type Modeler from 'bpmn-js/lib/Modeler';
import type {
  BaseViewerOptions,
  ImportXMLResult,
  SaveXMLOptions,
  SaveXMLResult,
  SaveSVGResult,
  ImportDoneEvent,
} from 'bpmn-js/lib/BaseViewer';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type { Element } from 'diagram-js/lib/model/Types';
import { from, Observable, Subject } from 'rxjs';

export type BpmnConfig = BaseViewerOptions;
export type ImportResult = ImportXMLResult;
export type ExportResult = SaveXMLResult;

export interface SelectionChangedEvent {
  oldSelection: Element[];
  newSelection: Element[];
}

export interface ElementChangedEvent {
  element: Element;
}

export interface CommandStack {
  execute(commandName: string, ...args: unknown[]): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

interface PropertiesPanelService {
  attachTo(parent: HTMLElement): void;
  detach(): void;
}

/**
 * Component-scoped wrapper around bpmn-js `Modeler`.
 *
 * Provide this in `DiagramComponent.providers` (NOT `providedIn: 'root'`) so
 * each component instance gets its own modeler and a clean lifecycle.
 *
 * The modeler runs outside Angular's NgZone — bpmn-js fires hundreds of DOM
 * events per interaction; isolating them prevents app-wide change detection
 * on every drag/zoom/click. Public state is exposed as signals, which
 * schedule CD automatically when read in templates.
 */
@Injectable()
export class BpmnService implements OnDestroy {
  private readonly zone = inject(NgZone);

  private modeler: Modeler | null = null;
  private cachedCommandStack: CommandStack | null = null;
  private readonly listeners: Array<() => void> = [];

  readonly selection = signal<Element | null>(null);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  private readonly selectionSubject = new Subject<SelectionChangedEvent>();
  private readonly elementChangedSubject = new Subject<ElementChangedEvent>();
  private readonly importDoneSubject = new Subject<ImportDoneEvent>();
  private readonly commandStackChangedSubject = new Subject<void>();

  readonly selectionChanged$: Observable<SelectionChangedEvent> = this.selectionSubject.asObservable();
  readonly elementChanged$: Observable<ElementChangedEvent> = this.elementChangedSubject.asObservable();
  readonly importDone$: Observable<ImportDoneEvent> = this.importDoneSubject.asObservable();
  readonly commandStackChanged$: Observable<void> = this.commandStackChangedSubject.asObservable();

  /**
   * Loads and instantiates the bpmn-js Modeler.
   *
   * The Modeler bundle (~bpmn-js itself + properties panel + custom provider)
   * is dynamically imported so it lands in its own chunk and stays out of the
   * initial page load. Call this once in `ngAfterViewInit`; subsequent
   * `getModeler()` / `importXML(...)` / event Observables are synchronous.
   */
  async createModeler(config: BpmnConfig = {}): Promise<Modeler> {
    const [
      { default: ModelerCtor },
      { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule },
      { default: customPropertiesProvider },
      { default: custom },
    ] = await Promise.all([
      import('bpmn-js/lib/Modeler'),
      import('bpmn-js-properties-panel'),
      import('../custom-properties-provider/custom-property-provider'),
      import('../utils/descriptors/custom.json'),
    ]);

    const defaultModules = [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      customPropertiesProvider,
    ];

    const mergedConfig: BpmnConfig = {
      ...config,
      additionalModules: [...defaultModules, ...(config.additionalModules ?? [])],
      moddleExtensions: { custom, ...(config.moddleExtensions ?? {}) },
    };

    return this.zone.runOutsideAngular(() => {
      const modeler = new ModelerCtor(mergedConfig);
      this.modeler = modeler;
      this.wireEvents(modeler);
      return modeler;
    });
  }

  getModeler(): Modeler | null {
    return this.modeler;
  }

  getCommandStack(): CommandStack {
    if (this.cachedCommandStack) return this.cachedCommandStack;
    if (!this.modeler) throw new Error('Modeler not initialized. Call createModeler first.');
    this.cachedCommandStack = this.modeler.get<CommandStack>('commandStack');
    return this.cachedCommandStack;
  }

  attachModeler(diagramContainer: HTMLElement, propertiesContainer?: HTMLElement): void {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }

    this.zone.runOutsideAngular(() => {
      this.modeler!.attachTo(diagramContainer);
      if (propertiesContainer) {
        const propertiesPanel = this.modeler!.get<PropertiesPanelService>('propertiesPanel');
        propertiesPanel.attachTo(propertiesContainer);
      }
    });
  }

  importXML(xml: string): Observable<ImportResult> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }
    return from(this.modeler.importXML(xml));
  }

  exportXML(options: SaveXMLOptions = {}): Promise<ExportResult> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }
    return this.modeler.saveXML(options);
  }

  exportSVG(): Promise<SaveSVGResult> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }
    return this.modeler.saveSVG();
  }

  destroy(): void {
    if (!this.modeler) return;

    for (const off of this.listeners) off();
    this.listeners.length = 0;

    this.zone.runOutsideAngular(() => this.modeler!.destroy());
    this.modeler = null;
    this.cachedCommandStack = null;

    this.selectionSubject.complete();
    this.elementChangedSubject.complete();
    this.importDoneSubject.complete();
    this.commandStackChangedSubject.complete();
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  isReady(): boolean {
    return this.modeler !== null;
  }

  getDefaultXML(): string {
    return DEFAULT_XML;
  }

  private wireEvents(modeler: Modeler): void {
    const eventBus = modeler.get<EventBus>('eventBus');

    this.bind(eventBus, 'selection.changed', (event: SelectionChangedEvent) => {
      const next = event.newSelection.length > 0 ? event.newSelection[0] : null;
      this.selection.set(next);
      this.selectionSubject.next(event);
    });

    this.bind(eventBus, 'element.changed', (event: ElementChangedEvent) => {
      this.elementChangedSubject.next(event);
    });

    this.bind(eventBus, 'import.done', (event: ImportDoneEvent) => {
      this.importDoneSubject.next(event);
    });

    this.bind(eventBus, 'commandStack.changed', () => {
      const stack = this.getCommandStack();
      this.canUndo.set(stack.canUndo());
      this.canRedo.set(stack.canRedo());
      this.commandStackChangedSubject.next();
    });
  }

  private bind<T>(eventBus: EventBus, event: string, callback: (payload: T) => void): void {
    const wrapped = (payload: T) => callback(payload);
    eventBus.on(event, wrapped);
    this.listeners.push(() => eventBus.off(event, wrapped));
  }
}

const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="enhanced-demo-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="true" name="Enhanced BPMN Demo Process">
    <bpmn2:startEvent id="StartEvent_1" name="Process Started"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1"/>
    <bpmn2:userTask id="UserTask_1" name="Review Application">
      <bpmn2:documentation>This is a user task that demonstrates enhanced properties. Click on it to see the enhanced properties panel!</bpmn2:documentation>
    </bpmn2:userTask>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="ServiceTask_1"/>
    <bpmn2:serviceTask id="ServiceTask_1" name="Process Payment">
      <bpmn2:documentation>This service task shows advanced property types including dropdowns, validations, and business rules.</bpmn2:documentation>
    </bpmn2:serviceTask>
    <bpmn2:sequenceFlow id="Flow_3" sourceRef="ServiceTask_1" targetRef="ExclusiveGateway_1"/>
    <bpmn2:exclusiveGateway id="ExclusiveGateway_1" name="Payment Success?"/>
    <bpmn2:sequenceFlow id="Flow_4" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_Success" name="Success"/>
    <bpmn2:sequenceFlow id="Flow_5" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_Failed" name="Failed"/>
    <bpmn2:endEvent id="EndEvent_Success" name="Process Completed"/>
    <bpmn2:endEvent id="EndEvent_Failed" name="Process Failed"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="132" y="145" width="76" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_UserTask_1_di" bpmnElement="UserTask_1">
        <dc:Bounds x="240" y="80" width="100" height="80"/>
        <bpmndi:BPMNLabel/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_ServiceTask_1_di" bpmnElement="ServiceTask_1">
        <dc:Bounds x="400" y="80" width="100" height="80"/>
        <bpmndi:BPMNLabel/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_ExclusiveGateway_1_di" bpmnElement="ExclusiveGateway_1" isMarkerVisible="true">
        <dc:Bounds x="555" y="95" width="50" height="50"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="538" y="65" width="84" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_EndEvent_Success_di" bpmnElement="EndEvent_Success">
        <dc:Bounds x="682" y="102" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="659" y="145" width="82" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_EndEvent_Failed_di" bpmnElement="EndEvent_Failed">
        <dc:Bounds x="682" y="202" width="36" height="36"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="665" y="245" width="70" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120"/>
        <di:waypoint x="240" y="120"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120"/>
        <di:waypoint x="400" y="120"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="500" y="120"/>
        <di:waypoint x="555" y="120"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="605" y="120"/>
        <di:waypoint x="682" y="120"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="630" y="102" width="41" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="580" y="145"/>
        <di:waypoint x="580" y="220"/>
        <di:waypoint x="682" y="220"/>
        <bpmndi:BPMNLabel>
          <dc:Bounds x="594" y="203" width="30" height="14"/>
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;
