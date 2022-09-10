# BPMN-JS Angular integration example
This example shows how to integrate bpmn into an Angular application.
It uses bpmn-js and bpmn-js-properties-panel.

## About

This example is an angular web application that builds a user interface around the bpmn-js BPMN 2.0 modeler.
![kép](https://user-images.githubusercontent.com/12006702/185782372-42f06a20-f6d6-471d-9c44-0811a9207649.png)

### Modeler configuration
We need template reference variables. One for the model and one for the properties module.
``` typescript
  // retrieve DOM element reference
  @ViewChild('diagramRef', { static: true }) private diagramRef: ElementRef | undefined;
  @ViewChild('propertiesRef', { static: true }) private propertiesRef: ElementRef | undefined;
```
### Model configuration
Reference variables has to be used during initialization.
```typescript
    this.bpmnJS = new Modeler({
      container: this.diagramRef,
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
```
Both model and properties has to be attached.

```typescript
    // attach BpmnJS instance to DOM element
    this.bpmnJS.attachTo(this.diagramRef!.nativeElement);

    const propertiesPanel =this.bpmnJS.get('propertiesPanel');

    propertiesPanel.attachTo(this.propertiesRef!.nativeElement);
    this.importDiagram(this.xml);
```
