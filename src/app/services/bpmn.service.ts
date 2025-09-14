import { Injectable } from '@angular/core';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import Modeler from 'bpmn-js/lib/Modeler';
import { from, Observable } from 'rxjs';
import customPropertiesProvider from '../custom-properties-provider/custom-property-provider';
import custom from '../utils/descriptors/custom.json';

export interface BpmnConfig {
  container?: any;
  propertiesPanel?: {
    parent?: any;
  };
  additionalModules?: any[];
  moddleExtensions?: any;
}

export interface ImportResult {
  warnings: Array<any>;
}

export interface ExportResult {
  xml?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BpmnService {
  private modeler: Modeler | null = null;

  constructor() {}

  /**
   * Creates a new BPMN modeler instance with the provided configuration
   */
  createModeler(config: BpmnConfig): Modeler {
    const defaultConfig: BpmnConfig = {
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        customPropertiesProvider
      ],
      moddleExtensions: {
        custom: custom
      }
    };

    const mergedConfig = { ...defaultConfig, ...config };
    this.modeler = new Modeler(mergedConfig);
    return this.modeler;
  }

  /**
   * Gets the current modeler instance
   */
  getModeler(): Modeler | null {
    return this.modeler;
  }

  /**
   * Attaches the modeler to DOM elements
   */
  attachModeler(diagramContainer: HTMLElement, propertiesContainer?: HTMLElement): void {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }

    this.modeler.attachTo(diagramContainer);

    if (propertiesContainer) {
      const propertiesPanel = this.modeler.get('propertiesPanel');
      (propertiesPanel as any).attachTo(propertiesContainer);
    }
  }

  /**
   * Imports XML into the current modeler instance
   */
  importXML(xml: string): Observable<ImportResult> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }

    return from(this.modeler.importXML(xml) as Promise<ImportResult>);
  }

  /**
   * Exports the current diagram as XML
   */
  exportXML(options: { format?: boolean } = {}): Promise<ExportResult> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }

    return this.modeler.saveXML(options);
  }

  /**
   * Exports the current diagram as SVG
   */
  exportSVG(): Promise<{ svg: string }> {
    if (!this.modeler) {
      throw new Error('Modeler not initialized. Call createModeler first.');
    }

    return this.modeler.saveSVG();
  }

  /**
   * Gets the default BPMN XML template
   */
  getDefaultXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
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
  }

  /**
   * Destroys the current modeler instance
   */
  destroy(): void {
    if (this.modeler) {
      this.modeler.destroy();
      this.modeler = null;
    }
  }

  /**
   * Validates if the modeler is ready for operations
   */
  isReady(): boolean {
    return this.modeler !== null;
  }
}
