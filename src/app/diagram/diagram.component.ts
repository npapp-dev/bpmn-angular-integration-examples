import {AfterContentInit, AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {BpmnPropertiesPanelModule, BpmnPropertiesProviderModule,} from 'bpmn-js-properties-panel';
import Modeler from 'bpmn-js/lib/Modeler';
import customPropertiesProvider from '../custom-properties-provider/custom-property-provider';
import {from, Observable} from 'rxjs';

const custom = require('../custom-properties-provider/descriptors/custom.json');

/**
 * You may include a different variant of BpmnJS:
 *
 * bpmn-viewer  - displays BPMN diagrams without the ability
 *                to navigate them
 * bpmn-modeler - bootstraps a full-fledged BPMN editor
 */
const BpmnJS = require('bpmn-js/dist/bpmn-modeler.production.min.js');

@Component({
  selector: 'app-diagram',
  templateUrl: 'diagram.component.html',
  styleUrls: [
    'diagram.component.css'
  ],
  standalone: false
})
export class DiagramComponent implements AfterContentInit, OnDestroy {

  // instantiate BpmnJS with component
  readonly bpmnJS: Modeler;

  // retrieve DOM element reference
  @ViewChild('diagramRef', {static: true}) diagramRef: ElementRef | undefined;
  @ViewChild('propertiesRef', {static: true}) propertiesRef: ElementRef | undefined;

  private xml: string = `<?xml version="1.0" encoding="UTF-8"?>
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

  constructor() {
    this.bpmnJS = new Modeler({
      container: this.diagramRef?.nativeElement,
      propertiesPanel: {
        parent: this.propertiesRef
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        customPropertiesProvider
      ],
      moddleExtensions: {
        custom: custom
      }
    })
  }

  ngAfterContentInit(): void {
    // attach BpmnJS instance to DOM element
    this.bpmnJS.attachTo(this.diagramRef!.nativeElement);

    const propertiesPanel = this.bpmnJS.get('propertiesPanel');

    // @ts-ignore
    propertiesPanel.attachTo(this.propertiesRef!.nativeElement);
    this.importDiagram(this.xml);
  }

  /**
   * Creates a Promise to import the given XML into the current
   * BpmnJS instance, then returns it as an Observable.
   */
  private importDiagram(xml: string): Observable<{ warnings: Array<any> }> {
    return from(this.bpmnJS.importXML(xml) as Promise<{ warnings: Array<any> }>);
  }

  /**
   * Exports the current BPMN diagram as an XML file and triggers a download of the file.
   * The exported diagram will have a `.xml` file extension and include proper formatting.
   * Shows an error in the console if the `bpmnJS` instance is not initialized.
   *
   * @return {void} No value is returned. The function performs file export and download actions.
   */
  exportDiagram(): void {
    if (!this.bpmnJS) {
      console.error('bpmnJS is not initialized');
      return;
    }

    this.bpmnJS.saveXML({format: true}).then((xml) => {
      // Create a Blob from the XML data
      const blob = new Blob([xml.xml ?? ''], {type: 'text/xml'});
      const url = window.URL.createObjectURL(blob);

      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.xml';
      a.style.display = 'none';

      // Append the link, trigger download, and clean up
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke the object URL after a short delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }).catch((err) => {
      console.log(err);
    });
  }

  ngOnDestroy(): void {
    // destroy BpmnJS instance
    this.bpmnJS.destroy();
  }
}
