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
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
      </bpmndi:BPMNShape>
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
